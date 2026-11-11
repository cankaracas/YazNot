/**
 * YazNot — Sesten metne arka plan işçisi (Web Worker)
 * ---------------------------------------------------
 * Ağır işler (ONNX oturumları, özellik çıkarımı, ışın araması) burada yapılır;
 * arayüz donmaz. Model dosyaları buraya ana iş parçacığından aktarılır
 * (indirme/önbellek stt-app.js'te).
 *
 * Gelen mesajlar:
 *   { type:'init', files:{engine,fbank,passes,spm,pre,pass,post,decoder}, threads }
 *   { type:'transcribe', id, audio:Float32Array, lang, mode, beam }
 *   { type:'dispose' }
 * Giden mesajlar:
 *   { type:'ready', ms } · { type:'progress', id, value, label }
 *   { type:'result', id, text, ms, rtf, seconds, chunks }
 *   { type:'error', id, message }
 */
/* global ort, DuyuCore */
importScripts('ort.wasm.min.js');
importScripts('ds-core.js');

var engine = null;
var memoryTensor = null;
var initPromise = null;
var queue = Promise.resolve();

function post(msg) { self.postMessage(msg); }

function progress(id, value, label) {
  post({ type: 'progress', id: id, value: Math.max(0, Math.min(1, value)), label: label });
}

function makeRunDecoder(session) {
  return async function runDecoder(tokens, K, L, stride, h, Tp) {
    var toks = new BigInt64Array(K * L);
    for (var k = 0; k < K; k++) {
      var base = k * stride;
      for (var j = 0; j < L; j++) toks[k * L + j] = BigInt(tokens[base + j]);
    }
    var out = await session.run({
      tokens: new ort.Tensor('int64', toks, [K, L]),
      memory: memoryTensor
    });
    return out.logits.data;
  };
}

async function init(msg) {
  if (engine) return { ms: 0 };
  if (initPromise) return initPromise;
  initPromise = (async function () {
    var t0 = Date.now();
    ort.env.wasm.numThreads = msg.threads || 1;
    ort.env.wasm.simd = true;
    ort.env.wasm.wasmPaths = new URL('./', self.location.href).href;
    ort.env.logLevel = 'error';

    var f = msg.files;
    var sessions = {};
    var names = ['pre', 'pass', 'post', 'decoder'];
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      progress(null, (i / (names.length + 1)), 'Ses motoru hazırlanıyor… (' + (i + 1) + '/' + names.length + ')');
      sessions[name] = await ort.InferenceSession.create(new Uint8Array(f[name]), {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      f[name] = null;
    }

    progress(null, 0.9, 'Ses tanıma modeli yükleniyor…');
    var tables = await DuyuCore.loadModelTables(f.fbank, f.passes);
    var meta = JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(f.engine)));
    var runDecoder = makeRunDecoder(sessions.decoder);
    engine = new DuyuCore.Engine({
      ort: ort,
      sessions: sessions,
      meta: meta,
      tables: tables,
      spmBuffer: f.spm,
      runDecoder: runDecoder
    });
    memoryTensor = null;
    progress(null, 1, 'Hazır');
    return { ms: Date.now() - t0 };
  })();
  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

/** Tek parçayı kodlar + çözer; 0..1 arası göreli ilerleme bildirir. */
async function runChunk(audio, msg, onFrac) {
  var padded = new Float32Array(audio.length + Math.round(DuyuCore.TAIL_PAD_S * DuyuCore.SAMPLE_RATE));
  padded.set(audio);
  var enc = await engine.encode(padded, function (stage, value) {
    if (stage === 'features') onFrac(0.03, 'Ses çözümleniyor…');
    else if (stage === 'encode') onFrac(0.05 + 0.5 * value, 'Ses işleniyor…');
  });

  if (msg.mode === 'ctc') {
    var ids = DuyuCore.ctcGreedyIds(enc.logp, enc.T, enc.V, engine.sp.pad);
    onFrac(0.95, 'Yazıya çevriliyor…');
    return engine.decodeIds(ids);
  }
  memoryTensor = new ort.Tensor('float32', enc.h, [1, enc.Tp, 256]);
  var result = await engine.beamSearch.search(
    enc.h, enc.Tp, enc.logp, enc.T, enc.V,
    msg.beam || 5, msg.lang || 'mix', 0.3,
    function (step, total) {
      onFrac(0.55 + 0.42 * (total ? step / total : 0), 'Yazıya çevriliyor…');
    }
  );
  memoryTensor = null;
  return engine.decodeIds(result.ids);
}

async function transcribe(msg) {
  if (!engine) throw new Error('Ses motoru hazır değil');
  var audio = msg.audio;
  if (!audio || !audio.length) throw new Error('Ses verisi boş');
  var t0 = Date.now();
  var seconds = audio.length / DuyuCore.SAMPLE_RATE;
  var parts = DuyuCore.chunks(audio);
  var texts = [];
  for (var i = 0; i < parts.length; i++) {
    var base = i / parts.length, span = 1 / parts.length;
    var suffix = parts.length > 1 ? ' (' + (i + 1) + '/' + parts.length + ')' : '';
    var text = await runChunk(parts[i], msg, function (frac, label) {
      progress(msg.id, base + span * frac, label + suffix);
    });
    if (text) texts.push(text);
  }
  var ms = Date.now() - t0;
  progress(msg.id, 1, 'Tamamlandı');
  return { text: texts.join(' ').replace(/\s+/g, ' ').trim(), ms: ms, seconds: seconds, chunks: parts.length };
}

self.onmessage = function (e) {
  var msg = e.data || {};
  if (msg.type === 'init') {
    queue = queue.then(async function () {
      try {
        var r = await init(msg);
        post({ type: 'ready', ms: r.ms });
      } catch (err) {
        post({ type: 'error', id: null, message: (err && err.message) || String(err) });
      }
    });
    return;
  }
  if (msg.type === 'transcribe') {
    queue = queue.then(async function () {
      try {
        var r = await transcribe(msg);
        post({
          type: 'result', id: msg.id, text: r.text, ms: r.ms,
          rtf: r.seconds ? r.ms / 1000 / r.seconds : null,
          seconds: r.seconds, chunks: r.chunks
        });
      } catch (err) {
        post({ type: 'error', id: msg.id, message: (err && err.message) || String(err) });
      }
    });
    return;
  }
  if (msg.type === 'dispose') {
    engine = null; memoryTensor = null; initPromise = null;
    post({ type: 'disposed' });
  }
};
