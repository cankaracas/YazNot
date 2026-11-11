/**
 * YazNot — Sesten Metne arayüzü (isteğe bağlı, cihazda çalışan STT)
 * -----------------------------------------------------------------
 * • Model uygulamaya gömülü DEĞİLDİR; ilk kullanımda indirilir ve Cache Storage'da
 *   saklanır. Bir daha indirilmez, internet olmadan da çalışır.
 * • Ağır işler ds-worker.js içinde (Web Worker) yapılır; arayüz donmaz.
 * • Masaüstü ve PWA (Android/iOS) aynı kodu kullanır.
 *
 * Kullanım:  var sonuc = await window.YazNotSTT.open();  // {text} veya null
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Model tanımı — Hugging Face'te sabitlenmiş sürüm (revizyon)
  // ---------------------------------------------------------------------------
  var MODEL_REVISION = 'a9aa79751ea6e99c1e035fcb056318d5c1b67f13';
  var MODEL_BASE = 'https://huggingface.co/KaanAydinli/Duyu-small/resolve/' + MODEL_REVISION + '/';
  var CACHE_NAME = 'yaznot-stt-duyu-small-int8-v1';
  var MANIFEST_URL = 'https://yaznot.local/stt-manifest.json';
  var WORKER_URL = 'stt/ds-worker.js';
  var LANG_KEY = 'yaznot_stt_lang';

  // İndirme sırası: en büyük dosya başta → ilerleme çubuğu baştan itibaren akıcı ilerler.
  var FILES = [
    { id: 'pass', path: 'int8/encoder_pass.onnx', size: 47593016, sha: '2a43a3bd75ee7da8796f9c41e5b41a00f7a9518907f65c210ca9a76f2eff22bd' },
    { id: 'engine', path: 'engine.json', size: 540, sha: '66a661f4234fadac70d6e7910fd700be6307f2c2691563ff75553bb3c357b7dc' },
    { id: 'fbank', path: 'fbank.npz', size: 84344, sha: '6d4f916ae5e170a56f73fc95f8f63b02e1d73c81b62cfd823609da9603bc7ad6' },
    { id: 'passes', path: 'passes.npz', size: 3600, sha: 'feacbb3296889a175d274d0e7e5f7fcb019811d51e083ce8f6209e03af0115a2' },
    { id: 'spm', path: 'spm.model', size: 30775, sha: '3e2367ec7844d3ea222819bcb51a48068ae0169ef15e6b32d6cc57054b6e1205' },
    { id: 'pre', path: 'int8/encoder_pre.onnx', size: 1288378, sha: '4953211efcf5ac624be5a78f7d5a8871355c0e0c5c78c7b4de554730c023274c' },
    { id: 'post', path: 'int8/encoder_post.onnx', size: 533747, sha: 'c0600b87e63596f60140c84c64836b9b40db9f3d10add2aab2067bb338b2bd03' },
    { id: 'decoder', path: 'int8/decoder.onnx', size: 6417328, sha: 'd580c32ccfaeaf45439f8eaff6908181b3568d818a3b6c12658545ce0364cab6' }
  ];
  FILES.forEach(function (f) { f.url = MODEL_BASE + f.path; });
  var TOTAL_BYTES = FILES.reduce(function (a, f) { return a + f.size; }, 0);

  // Sınırlar
  var MAX_RECORD_SECONDS = 120;
  var MAX_AUDIO_SECONDS = 300;
  var MIN_AUDIO_SECONDS = 0.35;

  var state = {
    installed: false,
    manifest: null,
    ready: false,
    busy: false,
    recording: false,
    downloading: false,
    text: ''
  };

  var el = {};
  var worker = null;
  var workerIdleTimer = null;
  var workerReady = false;
  var workerInitPromise = null;
  var pending = {};
  var reqId = 0;
  var openPromise = null;
  var openResolve = null;
  var readyResolve = null;
  var readyReject = null;
  var abortController = null;
  var media = { stream: null, rec: null, chunks: [], startedAt: 0, tick: null, ctx: null, analyser: null, raf: 0, mime: '' };
  var language = 'mix';
  var deleteArmed = 0;

  var AudioCtx = window.AudioContext || window.webkitAudioContext;

  function $(id) { return document.getElementById(id); }

  function t(key) { return key; }

  // ---------------------------------------------------------------------------
  // Yardımcılar
  // ---------------------------------------------------------------------------
  function formatBytes(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' MB';
    if (n >= 1000) return Math.round(n / 1000) + ' KB';
    return n + ' B';
  }

  function formatSeconds(s) {
    var total = Math.max(0, Math.floor(s));
    var m = Math.floor(total / 60), sec = total % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function toHex(buffer) {
    var bytes = new Uint8Array(buffer), out = '';
    for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
    return out;
  }

  function toast(message) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var node = document.createElement('div');
    node.className = 'toast';
    var text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;
    node.appendChild(text);
    container.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 4000);
  }

  function isSupported() {
    return !!(window.Worker && window.WebAssembly && window.caches && AudioCtx);
  }

  function isMobileLike() {
    return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent || '');
  }

  function beamForDevice() {
    if (isMobileLike()) return 4;
    return 5;
  }

  function threadCount() {
    if (window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined') {
      var hc = navigator.hardwareConcurrency || 2;
      return Math.max(2, Math.min(4, hc - 1));
    }
    return 1;
  }

  function loadLanguage() {
    try {
      var v = localStorage.getItem(LANG_KEY);
      if (v === 'tr' || v === 'en' || v === 'mix') return v;
    } catch (e) {}
    return 'mix';
  }

  function saveLanguage(v) {
    try { localStorage.setItem(LANG_KEY, v); } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Model durumu / indirme / önbellek
  // ---------------------------------------------------------------------------
  async function openCache() {
    if (!window.caches) throw new Error('Tarayıcı önbelleği (Cache Storage) kullanılamıyor');
    return caches.open(CACHE_NAME);
  }

  /** Modelin cihazda olup olmadığını denetler (hızlı; yalnızca kayıt varlığı + boyut). */
  async function inspectModel() {
    var cache = await openCache();
    var manifest = null;
    try {
      var mr = await cache.match(MANIFEST_URL);
      if (mr) manifest = await mr.json();
    } catch (e) { manifest = null; }
    if (!manifest || manifest.revision !== MODEL_REVISION || !manifest.files) {
      return { installed: false, cache: cache, manifest: null, bytes: 0 };
    }
    var bytes = 0;
    for (var i = 0; i < FILES.length; i++) {
      var f = FILES[i];
      var res = await cache.match(f.url);
      if (!res) return { installed: false, cache: cache, manifest: manifest, bytes: bytes };
      var len = parseInt(res.headers.get('content-length') || '0', 10);
      if (len && len !== f.size) return { installed: false, cache: cache, manifest: manifest, bytes: bytes };
      bytes += f.size;
    }
    return { installed: true, cache: cache, manifest: manifest, bytes: bytes };
  }

  async function fetchVerified(file, onLoaded, signal) {
    var res = await fetch(file.url, { signal: signal, cache: 'no-store', mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error('sunucu yanıtı ' + res.status);
    var expected = parseInt(res.headers.get('content-length') || '0', 10) || file.size;
    var chunks = [];
    var received = 0;
    if (res.body && res.body.getReader) {
      var reader = res.body.getReader();
      for (;;) {
        var step = await reader.read();
        if (step.done) break;
        if (step.value && step.value.length) {
          chunks.push(step.value);
          received += step.value.length;
          onLoaded(received);
        }
      }
    } else {
      var buf = await res.arrayBuffer();
      chunks.push(new Uint8Array(buf));
      received = buf.byteLength;
      onLoaded(received);
    }
    if (received !== file.size) {
      throw new Error(file.path + ' eksik indi (' + received + '/' + file.size + ' bayt)');
    }
    var bytes = new Uint8Array(received);
    var offset = 0;
    for (var i = 0; i < chunks.length; i++) { bytes.set(chunks[i], offset); offset += chunks[i].length; }
    if (window.crypto && window.crypto.subtle) {
      var digest = await window.crypto.subtle.digest('SHA-256', bytes);
      if (toHex(digest) !== file.sha) throw new Error(file.path + ' doğrulanamadı (bozuk indirme)');
    }
    return new Response(bytes, {
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': String(bytes.length),
        'x-yaznot-sha256': file.sha
      }
    });
  }

  async function downloadModel(onProgress, signal) {
    var cache = await openCache();
    var done = 0;
    for (var i = 0; i < FILES.length; i++) {
      var f = FILES[i];
      var cached = await cache.match(f.url);
      var usable = false;
      if (cached) {
        var len = parseInt(cached.headers.get('content-length') || '0', 10);
        usable = (!len || len === f.size);
      }
      if (!usable) {
        if (cached) await cache.delete(f.url);
        var res = await fetchVerified(f, function (loaded) {
          onProgress(done + loaded, TOTAL_BYTES, f);
        }, signal);
        await cache.put(f.url, res);
      }
      done += f.size;
      onProgress(done, TOTAL_BYTES, f);
    }
    var manifest = {
      version: 1,
      revision: MODEL_REVISION,
      model: 'Duyu-small int8',
      installedAt: new Date().toISOString(),
      bytes: TOTAL_BYTES,
      files: FILES.map(function (f) { return { path: f.path, size: f.size, sha: f.sha }; })
    };
    await cache.put(MANIFEST_URL, new Response(JSON.stringify(manifest), {
      headers: { 'content-type': 'application/json' }
    }));
    return manifest;
  }

  async function readModelFiles(cache) {
    var out = {};
    for (var i = 0; i < FILES.length; i++) {
      var f = FILES[i];
      var res = await cache.match(f.url);
      if (!res) throw new Error('Model dosyası bulunamadı: ' + f.path);
      out[f.id] = await res.arrayBuffer();
    }
    return out;
  }

  async function deleteModel() {
    stopMedia();
    clearWorkerIdleTimer();
    state.ready = false;
    state.installed = false;
    state.manifest = null;
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
    workerReady = false;
    workerInitPromise = null;
    try { await caches.delete(CACHE_NAME); } catch (e) {}
    el.mainView.classList.add('hidden');
    el.downloadView.classList.remove('hidden');
    resetDownloadUi();
    el.downloadBtn.focus();
  }

  // ---------------------------------------------------------------------------
  // Worker
  // ---------------------------------------------------------------------------
  function onWorkerMessage(ev) {
    var msg = ev.data || {};
    if (msg.type === 'ready') {
      if (readyResolve) { var fn = readyResolve; readyResolve = null; readyReject = null; fn(msg); }
      return;
    }
    if (msg.type === 'progress') {
      if (msg.id == null) {
        if (!state.busy) setStage(msg.label || 'Hazırlanıyor…', typeof msg.value === 'number' ? msg.value : 0);
      } else if (pending[msg.id]) {
        setStage(msg.label || 'İşleniyor…', typeof msg.value === 'number' ? msg.value : 0);
      }
      return;
    }
    if (msg.type === 'result') {
      var p = pending[msg.id];
      if (p) { delete pending[msg.id]; p.resolve(msg); }
      return;
    }
    if (msg.type === 'error') {
      if (msg.id == null) {
        if (readyReject) { var rj = readyReject; readyResolve = null; readyReject = null; rj(new Error(msg.message || 'Ses motoru başlatılamadı')); }
        else if (state.busy) showError('Ses motoru hatası: ' + (msg.message || 'bilinmeyen hata'));
      } else if (pending[msg.id]) {
        var pp = pending[msg.id];
        delete pending[msg.id];
        pp.reject(new Error(msg.message || 'Çevirme başarısız'));
      }
    }
  }

  function onWorkerError(err) {
    workerReady = false;
    workerInitPromise = null;
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
    var message = 'Ses motoru çalıştırılamadı' +
      (err && err.message ? ': ' + engineErrorMessage(err) : '');
    if (readyReject) { var rj = readyReject; readyResolve = null; readyReject = null; rj(new Error(message)); }
    Object.keys(pending).forEach(function (id) {
      try { pending[id].reject(new Error(message)); } catch (e) {}
      delete pending[id];
    });
    if (!state.busy) showError(message);
  }

  // Tarayıcıdan gelen teknik hataları anlaşılır Türkçeye çevirir.
  function engineErrorMessage(err) {
    var m = (err && err.message) || String(err || '');
    if (/SIMD|no available backend|WebAssembly|wasm/i.test(m)) {
      return 'Bu tarayıcı/cihaz ses tanımayı desteklemiyor (WebAssembly SIMD gerekli). ' +
        'Safari 16.4+ veya güncel Chrome/Edge kullan.';
    }
    if (/memory|OOM|allocation|RangeError/i.test(m)) {
      return 'Cihazda yeterli bellek yok. Diğer uygulamaları kapatıp tekrar dene.';
    }
    return m || 'bilinmeyen hata';
  }

  async function ensureWorker() {
    if (workerReady && worker) return;
    if (workerInitPromise) return workerInitPromise;
    workerInitPromise = (async function () {
      var cache = await openCache();
      setStage('Ses motoru hazırlanıyor…', 0.02);
      var files = await readModelFiles(cache);
      if (!worker) {
        worker = new Worker(WORKER_URL);
        worker.onmessage = onWorkerMessage;
        worker.onerror = onWorkerError;
      }
      var ready = new Promise(function (resolve, reject) {
        readyResolve = resolve;
        readyReject = reject;
        setTimeout(function () {
          if (readyReject === reject) {
            readyResolve = null; readyReject = null;
            reject(new Error('Ses motoru zaman aşımına uğradı'));
          }
        }, 120000);
      });
      var buffers = Object.keys(files).map(function (k) { return files[k]; });
      worker.postMessage({
        type: 'init', files: files, threads: threadCount(), revision: MODEL_REVISION
      }, buffers);
      await ready;
      workerReady = true;
      state.ready = true;
      setStage('Hazır', 1);
      setTimeout(function () { if (!state.busy) hideStage(); }, 600);
    })();
    try {
      await workerInitPromise;
    } catch (err) {
      workerInitPromise = null;
      throw err;
    }
  }

  function requestTranscription(samples) {
    if (!worker || !workerReady) return Promise.reject(new Error('Ses motoru hazır değil'));
    return new Promise(function (resolve, reject) {
      var id = ++reqId;
      pending[id] = { resolve: resolve, reject: reject };
      var audio = samples instanceof Float32Array ? samples : new Float32Array(samples);
      try {
        worker.postMessage({
          type: 'transcribe', id: id, audio: audio,
          lang: language, mode: 'auto', beam: beamForDevice()
        }, [audio.buffer]);
      } catch (err) {
        delete pending[id];
        reject(err);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Ses çözme / 16 kHz mono
  // ---------------------------------------------------------------------------
  async function decodeAudioBuffer(arrayBuffer) {
    var ctx = new AudioCtx();
    var decoded;
    try {
      decoded = await new Promise(function (resolve, reject) {
        var settled = false;
        function ok(b) { if (!settled) { settled = true; resolve(b); } }
        function fail(e) { if (!settled) { settled = true; reject(e || new Error('decodeAudioData')); } }
        try {
          var maybe = ctx.decodeAudioData(arrayBuffer, ok, fail);
          if (maybe && typeof maybe.then === 'function') maybe.then(ok, fail);
        } catch (e) { fail(e); }
      });
    } finally {
      try { ctx.close(); } catch (e) {}
    }
    if (decoded.duration > MAX_AUDIO_SECONDS + 2) {
      throw new Error('Ses dosyası çok uzun (en fazla 5 dakika). Daha kısa bir parça dene.');
    }
    return toMono16k(decoded);
  }

  /** Süreyi sesi tamamen çözmeden (metadata'dan) okur. Bilinmiyorsa NaN döner. */
  function mediaDuration(blob) {
    return new Promise(function (resolve) {
      var url = null;
      try {
        url = URL.createObjectURL(blob);
        var audio = document.createElement('audio');
        var done = false;
        function finish(value) {
          if (done) return;
          done = true;
          try { if (url) URL.revokeObjectURL(url); } catch (e) {}
          resolve(value);
        }
        audio.preload = 'metadata';
        audio.onloadedmetadata = function () { finish(isFinite(audio.duration) ? audio.duration : NaN); };
        audio.onerror = function () { finish(NaN); };
        audio.src = url;
        setTimeout(function () { finish(NaN); }, 2500);
      } catch (e) {
        if (url) { try { URL.revokeObjectURL(url); } catch (e2) {} }
        resolve(NaN);
      }
    });
  }

  function toMono16k(buffer) {
    var sr = buffer.sampleRate;
    var len = buffer.length;
    var channels = buffer.numberOfChannels || 1;
    var mono = new Float32Array(len);
    for (var c = 0; c < channels; c++) {
      var data = buffer.getChannelData(c);
      for (var i = 0; i < len; i++) mono[i] += data[i] / channels;
    }
    if (sr === 16000) return mono;

    var ratio = sr / 16000;
    var filtered = mono;
    if (ratio > 1) {
      var width = Math.max(1, Math.round(ratio));
      filtered = new Float32Array(len);
      var sum = 0;
      for (i = 0; i < len; i++) {
        sum += mono[i];
        if (i >= width) sum -= mono[i - width];
        var count = Math.min(i + 1, width);
        filtered[i] = sum / count;
      }
    }
    var outLen = Math.floor((len - 1) / ratio);
    if (outLen < 1) return new Float32Array(0);
    var out = new Float32Array(outLen);
    for (i = 0; i < outLen; i++) {
      var pos = i * ratio;
      var i0 = Math.floor(pos);
      var frac = pos - i0;
      var a = filtered[i0] || 0;
      var b = i0 + 1 < len ? filtered[i0 + 1] : a;
      out[i] = a + (b - a) * frac;
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Kayıt
  // ---------------------------------------------------------------------------
  function pickMime() {
    if (!window.MediaRecorder) return '';
    if (!MediaRecorder.isTypeSupported) return '';
    var list = [
      'audio/webm;codecs=opus', 'audio/webm',
      'audio/mp4;codecs=mp4a.40.2', 'audio/mp4',
      'audio/ogg;codecs=opus', 'audio/ogg'
    ];
    for (var i = 0; i < list.length; i++) {
      try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) {}
    }
    return '';
  }

  function micErrorMessage(err) {
    var name = err && err.name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Mikrofon izni verilmedi. Tarayıcı/uygulama ayarlarından YazNot için mikrofon iznini aç.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Cihazda mikrofon bulunamadı.';
    if (name === 'NotReadableError' || name === 'TrackStartError') return 'Mikrofon başka bir uygulama tarafından kullanılıyor.';
    if (name === 'SecurityError') return 'Mikrofon için güvenli bağlantı (https) gerekiyor.';
    return 'Mikrofon açılamadı: ' + ((err && err.message) || 'bilinmeyen hata');
  }

  async function startRecording() {
    if (state.busy || state.recording) return;
    hideError();
    if (!window.MediaRecorder) {
      showError('Bu tarayıcı ses kaydını desteklemiyor. “Dosyadan seç” ile bir ses dosyası yükleyebilirsin.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('Mikrofona erişilemiyor. Uygulamayı https üzerinden veya masaüstü uygulamasında aç.');
      return;
    }
    var stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (err) {
      showError(micErrorMessage(err));
      return;
    }

    media.stream = stream;
    media.chunks = [];
    media.mime = pickMime();
    var rec;
    try {
      rec = media.mime ? new MediaRecorder(stream, { mimeType: media.mime, audioBitsPerSecond: 128000 }) : new MediaRecorder(stream);
    } catch (err) {
      stopStream();
      showError('Ses kaydı başlatılamadı: ' + ((err && err.message) || 'desteklenmeyen format'));
      return;
    }
    media.rec = rec;
    rec.ondataavailable = function (e) { if (e.data && e.data.size) media.chunks.push(e.data); };
    rec.onerror = function (e) {
      stopMedia();
      showError('Kayıt sırasında hata oluştu.');
    };
    rec.onstop = function () {
      var blob = new Blob(media.chunks, { type: media.mime || 'audio/webm' });
      media.chunks = [];
      stopMedia();
      handleAudioBlob(blob, true);
    };
    try { rec.start(250); } catch (e) { stopMedia(); showError('Kayıt başlatılamadı.'); return; }

    state.recording = true;
    media.startedAt = Date.now();
    el.recordBtn.classList.add('recording');
    el.recordLabel.textContent = 'Kaydı bitir';
    el.recordBtn.setAttribute('aria-label', 'Kaydı bitir');
    el.timer.textContent = '00:00';
    el.fileBtn.disabled = true;
    setLangEnabled(false);
    hideStage();
    startLevelMeter(stream);
    media.tick = setInterval(function () {
      var elapsed = (Date.now() - media.startedAt) / 1000;
      el.timer.textContent = formatSeconds(elapsed);
      if (elapsed >= MAX_RECORD_SECONDS) {
        toast('En fazla 2 dakika kayıt alınabilir.');
        stopRecording();
      }
    }, 200);
  }

  function stopRecording() {
    if (!state.recording || !media.rec) return;
    state.recording = false;
    el.recordBtn.classList.remove('recording');
    el.recordBtn.disabled = true;
    el.recordLabel.textContent = 'Kayıt hazırlanıyor…';
    try { media.rec.stop(); } catch (e) { stopMedia(); }
  }

  function stopStream() {
    if (media.stream) {
      try { media.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      media.stream = null;
    }
  }

  function stopMedia() {
    state.recording = false;
    if (media.tick) { clearInterval(media.tick); media.tick = null; }
    if (media.raf) { cancelAnimationFrame(media.raf); media.raf = 0; }
    stopStream();
    if (media.ctx) { try { media.ctx.close(); } catch (e) {} media.ctx = null; }
    media.analyser = null;
    media.rec = null;
    el.recordBtn.classList.remove('recording');
    el.recordBtn.disabled = !!state.busy;
    el.recordLabel.textContent = 'Kaydı başlat';
    el.recordBtn.setAttribute('aria-label', 'Kaydı başlat');
    el.levelFill.style.width = '0%';
    el.fileBtn.disabled = !!state.busy;
    if (!state.busy) setLangEnabled(true);
  }

  function startLevelMeter(stream) {
    try {
      media.ctx = new AudioCtx();
      if (media.ctx.state === 'suspended') media.ctx.resume().catch(function () {});
      var source = media.ctx.createMediaStreamSource(stream);
      media.analyser = media.ctx.createAnalyser();
      media.analyser.fftSize = 1024;
      source.connect(media.analyser);
      var buf = new Uint8Array(media.analyser.fftSize);
      var loop = function () {
        if (!media.analyser) return;
        media.analyser.getByteTimeDomainData(buf);
        var sum = 0;
        for (var i = 0; i < buf.length; i++) {
          var v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        var rms = Math.sqrt(sum / buf.length);
        var pct = Math.min(100, Math.round(rms * 320));
        el.levelFill.style.width = pct + '%';
        el.levelFill.style.background = pct > 85 ? '#ff6126' : '#47c98a';
        media.raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { /* ölçüm olmadan devam */ }
  }

  // ---------------------------------------------------------------------------
  // Çevirme akışı
  // ---------------------------------------------------------------------------
  async function handleAudioBlob(blob, knownShort) {
    if (!blob || !blob.size) { showError('Kayıt boş görünüyor, tekrar dene.'); return; }
    setBusy(true);
    setStage('Ses çözümleniyor…', 0.01);
    try {
      if (!knownShort) {
        var duration = await mediaDuration(blob);
        if (isFinite(duration) && duration > MAX_AUDIO_SECONDS + 2) {
          throw new Error('Ses dosyası çok uzun (en fazla 5 dakika). Daha kısa bir parça dene.');
        }
      }
      var arrayBuffer = await blob.arrayBuffer();
      var samples = await decodeAudioBuffer(arrayBuffer);
      await runTranscription(samples, blob.type || '');
    } catch (err) {
      hideStage();
      showError(decodeErrorMessage(err));
    } finally {
      setBusy(false);
      if (state.ready) scheduleOpenIdleRelease();
    }
  }

  function decodeErrorMessage(err) {
    var msg = (err && err.message) || '';
    if (/çok uzun|en fazla 5 dakika|en az birkaç kelime/.test(msg)) return msg;
    if (/decodeAudioData|Unable to decode|EncodingError/i.test(msg)) {
      return 'Bu ses dosyası okunamadı. MP3, M4A, WAV veya OGG formatlarından birini dene.';
    }
    if (/memory|OOM|allocation|RangeError/i.test(msg)) {
      return 'Cihazda yeterli bellek yok. Diğer uygulamaları kapatıp daha kısa bir kayıtla tekrar dene.';
    }
    return 'Ses işlenemedi: ' + (msg || 'bilinmeyen hata');
  }

  async function runTranscription(samples, mime) {
    if (!samples || samples.length === 0) { throw new Error('Ses verisi boş'); }
    var seconds = samples.length / 16000;
    if (seconds < MIN_AUDIO_SECONDS) throw new Error('Kayıt çok kısa; en az birkaç kelime söyle.');
    if (seconds > MAX_AUDIO_SECONDS) throw new Error('Ses çok uzun (en fazla 5 dakika). Daha kısa bir parça dene.');
    if (!state.installed) throw new Error('Ses modeli yüklü değil');

    if (!workerReady) await ensureWorker();
    setStage('Yazıya çevriliyor…', 0.02);
    var res = await requestTranscription(samples);
    var text = (res.text || '').trim();
    state.text = text;
    el.result.value = text;
    el.insertBtn.disabled = !text;
    el.copyBtn.disabled = !text;
    hideStage();
    if (!text) {
      showError('Ses anlaşılamadı. Daha yakından, net ve tek kişi konuşarak tekrar dene.');
    } else {
      hideError();
      var info = seconds.toFixed(1).replace('.', ',') + ' sn ses · ' + (res.ms / 1000).toFixed(1).replace('.', ',') + ' sn’de çözüldü';
      el.resultHint.textContent = '(' + info + ')';
      el.insertBtn.focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Arayüz durumları
  // ---------------------------------------------------------------------------
  function setStage(label, value) {
    el.stage.classList.remove('hidden');
    var pct = Math.round(Math.max(0, Math.min(1, value || 0)) * 100);
    el.stageFill.style.width = pct + '%';
    el.stageLabel.textContent = label;
    el.stagePercent.textContent = pct + '%';
    el.stage.setAttribute('aria-valuenow', String(pct));
  }

  function hideStage() {
    el.stage.classList.add('hidden');
    el.stageFill.style.width = '0%';
  }

  function showError(message) {
    el.error.textContent = message;
    el.error.classList.remove('hidden');
  }

  function hideError() {
    el.error.textContent = '';
    el.error.classList.add('hidden');
  }

  function setBusy(busy) {
    state.busy = busy;
    el.recordBtn.disabled = busy || state.recording;
    el.fileBtn.disabled = busy || state.recording;
    setLangEnabled(!busy && !state.recording);
    el.insertBtn.disabled = busy || !state.text;
    el.copyBtn.disabled = busy || !state.text;
    el.clearBtn.disabled = busy;
    el.closeBtn.disabled = busy;
    el.deleteModelBtn.disabled = busy;
    el.mainView.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (busy && !state.recording) {
      el.recordLabel.textContent = 'İşleniyor…';
    } else if (!state.recording) {
      el.recordLabel.textContent = 'Kaydı başlat';
    }
  }

  function setLangEnabled(enabled) {
    el.langBtns.forEach(function (b) { b.disabled = !enabled; });
  }

  function setLanguage(lang) {
    language = (lang === 'tr' || lang === 'en') ? lang : 'mix';
    saveLanguage(language);
    el.langBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === language);
    });
  }

  function setDownloadBusy(busy) {
    state.downloading = busy;
    el.downloadBtn.disabled = busy;
    el.downloadBtn.classList.toggle('hidden', busy);
    el.downloadCancel.disabled = false;
    el.downloadCancel.textContent = busy ? 'İndirmeyi iptal et' : 'Vazgeç';
    el.closeBtn.disabled = busy;
    el.downloadProgress.classList.toggle('hidden', !busy);
  }

  function showDownloadView() {
    el.downloadView.classList.remove('hidden');
    el.mainView.classList.add('hidden');
    el.foot.classList.add('hidden');
    hideError();
    hideStage();
    resetDownloadUi();
  }

  function showMainView() {
    el.downloadView.classList.add('hidden');
    el.mainView.classList.remove('hidden');
    el.foot.classList.remove('hidden');
    hideError();
    setLanguage(language);
    updateFoot();
  }

  function updateFoot() {
    if (!state.manifest) {
      el.footInfo.textContent = 'Model cihazda saklanır.';
      return;
    }
    var d = new Date(state.manifest.installedAt || Date.now());
    var date = d.toLocaleDateString((window.YazNotI18n && window.YazNotI18n.locale()) || 'tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    el.footInfo.textContent = 'Model cihazda · ' + formatBytes(state.manifest.bytes || TOTAL_BYTES) + ' · ' + date;
  }

  function resetDownloadUi() {
    el.downloadProgress.classList.add('hidden');
    el.downloadFill.style.width = '0%';
    el.downloadPercent.textContent = '0%';
    el.downloadStatus.textContent = 'İndiriliyor…';
    el.downloadBtn.textContent = 'Modeli indir';
    el.downloadBtn.disabled = false;
    el.downloadCancel.disabled = false;
    el.closeBtn.disabled = false;
    el.downloadError.classList.add('hidden');
  }

  function updateDownloadProgress(loaded, total, file) {
    el.downloadProgress.classList.remove('hidden');
    var pct = total ? Math.round((loaded / total) * 100) : 0;
    el.downloadFill.style.width = pct + '%';
    el.downloadPercent.textContent = pct + '%';
    el.downloadStatus.textContent = formatBytes(loaded) + ' / ' + formatBytes(total) +
      (file ? ' · ' + file.path.split('/').pop() : '');
  }

  // ---------------------------------------------------------------------------
  // Aç / kapat
  // ---------------------------------------------------------------------------
  function open() {
    if (openPromise) return openPromise;
    clearWorkerIdleTimer();
    if (!el.overlay) initElements();
    if (!el.overlay) return Promise.resolve(null);
    openPromise = new Promise(function (resolve) { openResolve = resolve; });
    state.text = '';
    el.result.value = '';
    el.resultHint.textContent = '(düzenleyebilirsin)';
    el.insertBtn.disabled = true;
    el.copyBtn.disabled = true;
    el.deleteModelBtn.textContent = 'Modeli sil';
    el.deleteModelBtn.disabled = false;
    el.overlay.classList.remove('hidden');
    el.closeBtn.disabled = false;
    hideError();
    hideStage();
    showDownloadView();
    setBusy(false);
    beginCheck();
    return openPromise;
  }

  async function beginCheck() {
    if (!isSupported()) {
      showDownloadView();
      el.downloadBtn.classList.add('hidden');
      el.downloadError.textContent = 'Bu tarayıcı/ortam ses tanımayı desteklemiyor (WebAssembly veya Worker yok).';
      el.downloadError.classList.remove('hidden');
      return;
    }
    el.downloadBtn.classList.remove('hidden');
    try {
      var st = await inspectModel();
      state.installed = st.installed;
      state.manifest = st.manifest;
      if (st.installed) {
        showMainView();
        setStage('Ses motoru hazırlanıyor…', 0.02);
        try {
          await ensureWorker();
        } catch (err) {
          showError('Ses motoru başlatılamadı: ' + engineErrorMessage(err));
        }
      } else {
        showDownloadView();
      }
    } catch (err) {
      showDownloadView();
      el.downloadError.textContent = 'Model denetlenemedi: ' + (err && err.message ? err.message : 'bilinmeyen hata');
      el.downloadError.classList.remove('hidden');
    }
  }

  function clearWorkerIdleTimer() {
    if (workerIdleTimer) { clearTimeout(workerIdleTimer); workerIdleTimer = null; }
  }

  function releaseWorkerNow() {
    clearWorkerIdleTimer();
    if (openIdleTimer) { clearTimeout(openIdleTimer); openIdleTimer = null; }
    if (state.busy || state.recording) return false;
    if (worker) { try { worker.terminate(); } catch (e) {} }
    worker = null;
    workerReady = false;
    workerInitPromise = null;
    state.ready = false;
    setTimeout(function () {
      try { if (typeof window.gc === 'function') window.gc(); } catch (e) {}
      try {
        if (window.yaznotNative && window.yaznotNative.setMemoryLevel) window.yaznotNative.setMemoryLevel(true);
      } catch (e) {}
    }, 500);
    return true;
  }

  var openIdleTimer = null;
  function scheduleOpenIdleRelease() {
    if (openIdleTimer) clearTimeout(openIdleTimer);
    openIdleTimer = setTimeout(function () {
      openIdleTimer = null;
      if (!state.busy && !state.recording) releaseWorkerNow();
    }, 120000);
  }

  function scheduleWorkerRelease() {
    clearWorkerIdleTimer();
    if (!worker || state.busy || state.recording) return;
    workerIdleTimer = setTimeout(function () {
      workerIdleTimer = null;
      if (state.busy || state.recording || openPromise) return;
      if (!workerReady) { scheduleWorkerRelease(); return; }
      releaseWorkerNow();
    }, 30000);
  }

  function close(result) {
    if (state.downloading) return;
    if (state.recording) {
      try { if (media.rec) { media.rec.onstop = null; media.rec.stop(); } } catch (e) {}
      stopMedia();
    }
    el.overlay.classList.add('hidden');
    stopMedia();
    scheduleWorkerRelease();
    var resolve = openResolve;
    openResolve = null;
    openPromise = null;
    if (resolve) resolve(result || null);
  }

  async function startDownload() {
    if (state.downloading) return;
    hideError();
    el.downloadError.classList.add('hidden');
    // Kullanıcı hareketiyle istenir: tarayıcı modeli "kalıcı" depolamaya alsın.
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
    setDownloadBusy(true);
    abortController = new AbortController();
    try {
      var manifest = await downloadModel(updateDownloadProgress, abortController.signal);
      state.manifest = manifest;
      state.installed = true;
      showMainView();
      setStage('Ses motoru hazırlanıyor…', 0.02);
      try {
        await ensureWorker();
      } catch (err) {
        showError('Model indi ama ses motoru başlatılamadı: ' + engineErrorMessage(err));
      }
    } catch (err) {
      el.downloadProgress.classList.add('hidden');
      if (err && err.name === 'AbortError') {
        el.downloadStatus.textContent = 'İndirme iptal edildi.';
      } else {
        el.downloadError.textContent = 'İndirme tamamlanamadı: ' + ((err && err.message) || 'bağlantı hatası') +
          ' — İnternet bağlantını kontrol edip tekrar dene.';
        el.downloadError.classList.remove('hidden');
      }
    } finally {
      setDownloadBusy(false);
      abortController = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Olay bağlama
  // ---------------------------------------------------------------------------
  function initElements() {
    el.overlay = $('stt-modal');
    if (!el.overlay) return;
    el.downloadView = $('stt-download-view');
    el.mainView = $('stt-main-view');
    el.downloadBtn = $('stt-download-btn');
    el.downloadCancel = $('stt-download-cancel');
    el.downloadProgress = $('stt-download-progress');
    el.downloadFill = $('stt-download-fill');
    el.downloadStatus = $('stt-download-status');
    el.downloadPercent = $('stt-download-percent');
    el.downloadError = $('stt-download-error');
    el.downloadSize = $('stt-download-size');
    el.closeBtn = $('stt-close');
    el.recordBtn = $('stt-record-btn');
    el.recordLabel = $('stt-record-label');
    el.timer = $('stt-timer');
    el.levelFill = $('stt-level-fill');
    el.fileBtn = $('stt-file-btn');
    el.fileInput = $('stt-file-input');
    el.stage = $('stt-progress');
    el.stageFill = $('stt-progress-fill');
    el.stageLabel = $('stt-progress-label');
    el.stagePercent = $('stt-progress-percent');
    el.error = $('stt-error');
    el.result = $('stt-result');
    el.resultHint = $('stt-result-hint');
    el.insertBtn = $('stt-insert');
    el.copyBtn = $('stt-copy');
    el.clearBtn = $('stt-clear');
    el.foot = el.overlay.querySelector('.stt-foot');
    el.footInfo = $('stt-foot-info');
    el.deleteModelBtn = $('stt-delete-model');
    el.langBtns = Array.prototype.slice.call(el.overlay.querySelectorAll('.stt-lang-btn'));
    el.downloadSize.textContent = '~' + formatBytes(TOTAL_BYTES);
    language = loadLanguage();

    el.closeBtn.addEventListener('click', function () { close(null); });
    el.downloadBtn.addEventListener('click', startDownload);
    el.downloadCancel.addEventListener('click', function () {
      if (state.downloading && abortController) abortController.abort();
      else close(null);
    });
    el.overlay.addEventListener('click', function (e) {
      if (e.target === el.overlay && !state.downloading && !state.busy) close(null);
    });
    el.recordBtn.addEventListener('click', function () {
      if (state.recording) stopRecording();
      else startRecording();
    });
    el.fileBtn.addEventListener('click', function () { el.fileInput.click(); });
    el.fileInput.addEventListener('change', function () {
      var file = el.fileInput.files && el.fileInput.files[0];
      el.fileInput.value = '';
      if (!file) return;
      if (file.size > 200 * 1024 * 1024) { showError('Dosya çok büyük (en fazla 200 MB).'); return; }
      handleAudioBlob(file, false);
    });
    el.langBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.busy || state.recording) return;
        setLanguage(btn.getAttribute('data-lang'));
        toast(btn.getAttribute('data-lang') === 'tr' ? 'Dil: Türkçe' :
          btn.getAttribute('data-lang') === 'en' ? 'Dil: İngilizce' : 'Dil: Otomatik (Türkçe + İngilizce)');
      });
    });
    el.clearBtn.addEventListener('click', function () {
      state.text = '';
      el.result.value = '';
      el.insertBtn.disabled = true;
      el.copyBtn.disabled = true;
      el.resultHint.textContent = '(düzenleyebilirsin)';
      hideError();
      el.recordBtn.focus();
    });
    el.copyBtn.addEventListener('click', function () {
      var text = el.result.value.trim();
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('Metin kopyalandı'); }, function () { toast('Kopyalanamadı'); });
      } else {
        el.result.select();
        try { document.execCommand('copy'); toast('Metin kopyalandı'); } catch (e) { toast('Kopyalanamadı'); }
      }
    });
    el.insertBtn.addEventListener('click', function () {
      var text = el.result.value.trim();
      if (!text) return;
      close({ text: text });
    });
    el.deleteModelBtn.addEventListener('click', async function () {
      if (state.busy || state.recording) return;
      var now = Date.now();
      if (now - deleteArmed > 5000) {
        deleteArmed = now;
        el.deleteModelBtn.textContent = 'Emin misin? Sil';
        setTimeout(function () {
          if (Date.now() - deleteArmed >= 5000) {
            el.deleteModelBtn.textContent = 'Modeli sil';
            deleteArmed = 0;
          }
        }, 5100);
        return;
      }
      deleteArmed = 0;
      el.deleteModelBtn.textContent = 'Modeli sil';
      await deleteModel();
      toast('Ses modeli cihazdan silindi (yer açıldı).');
    });
    document.addEventListener('keydown', function (e) {
      if (el.overlay.classList.contains('hidden')) return;
      if (e.key === 'Escape') {
        if (state.downloading) { if (abortController) abortController.abort(); }
        else if (!state.busy) close(null);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Dışa aktarım
  // ---------------------------------------------------------------------------
  window.YazNotSTT = {
    open: open,
    isSupported: isSupported,
    beamForDevice: beamForDevice,
    model: { revision: MODEL_REVISION, bytes: TOTAL_BYTES, files: FILES.map(function (f) { return f.path; }) },
    inspect: function () { return inspectModel(); },
    releaseWorker: releaseWorkerNow,
    deleteModel: deleteModel,
    _decodeForTest: decodeAudioBuffer,
    _state: state
  };

  window.addEventListener('beforeunload', function () { releaseWorkerNow(); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) return;
    setTimeout(function () {
      if (document.hidden) releaseWorkerNow();
    }, 30000);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initElements);
  } else {
    initElements();
  }
})();
