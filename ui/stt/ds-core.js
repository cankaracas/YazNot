/**
 * Duyu-small — tarayıcıda/Node'da çalışan motor çekirdeği (Duyu Small STT)
 * -------------------------------------------------------------------------
 * Model: https://huggingface.co/KaanAydinli/Duyu-small (Apache-2.0)
 *
 * Bu dosya, modelin Python motorunun (`duyu_small/`) birebir JS portudur:
 *   features.py  → Fbank (Kaldi 25 ms / 10 ms, DC, pre-emphasis 0.97, Povey,
 *                  512 FFT, 80 mel, log, utterance CMVN, 2 kare üst üste → 160)
 *   decode.py    → CTC greedy + attention beam search + CTC rescoring + guard'lar
 *   model.py     → encoder_pre → 3 × encoder_pass → encoder_post → decoder
 *
 * ONNX oturumları dışarıdan verilir; böylece aynı kod hem onnxruntime-web
 * (tarayıcı/PWA) hem de testlerde kullanılabilir. Girdi: 16 kHz mono float32.
 *
 * Not: Hiçbir ağ/model dosyası burada gömülü değildir; ağırlıklar isteğe bağlı
 * indirilir (bkz. stt-app.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DuyuCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Sabitler (features.py)
  // ---------------------------------------------------------------------------
  var SAMPLE_RATE = 16000;
  var WIN = 400;
  var HOP = 160;
  var NFFT = 512;
  var MELS = 80;
  var EPS = 1.192092955078125e-07;
  var TAIL_PAD_S = 0.4;
  var NEG = -1e30;

  // decode.py guard sabitleri
  var MAX_REPEAT_RUN = 6;
  var RUNAWAY_RATIO = 1.5;
  var RUNAWAY_SLACK = 10;
  var RUNAWAY_SLACK_SHORT = 4;
  var RUNAWAY_SHORT = 8;

  // ---------------------------------------------------------------------------
  // ZIP (npz) — modelin fbank.npz / passes.npz dosyaları sıkıştırılmamış (method 0)
  // ---------------------------------------------------------------------------
  function readU16(buf, o) { return buf[o] | (buf[o + 1] << 8); }
  function readU32(buf, o) {
    return (buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24)) >>> 0;
  }

  /** ZIP arşivini { ad: Uint8Array } olarak açar (yalnızca method 0 ve 8). */
  async function unzipEntries(buffer) {
    var buf = new Uint8Array(buffer);
    var eocd = -1;
    var start = Math.max(0, buf.length - 66000);
    for (var i = buf.length - 22; i >= start; i--) {
      if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('npz: ZIP son kaydı bulunamadı');
    var count = readU16(buf, eocd + 10);
    var cdOffset = readU32(buf, eocd + 16);
    var out = {};
    var p = cdOffset;
    for (var e = 0; e < count; e++) {
      if (readU32(buf, p) !== 0x02014b50) throw new Error('npz: merkezi dizin bozuk');
      var method = readU16(buf, p + 10);
      var compSize = readU32(buf, p + 20);
      var nameLen = readU16(buf, p + 28);
      var extraLen = readU16(buf, p + 30);
      var commentLen = readU16(buf, p + 32);
      var localOff = readU32(buf, p + 42);
      var name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
      if (readU32(buf, localOff) !== 0x04034b50) throw new Error('npz: yerel başlık bozuk');
      var lNameLen = readU16(buf, localOff + 26);
      var lExtraLen = readU16(buf, localOff + 28);
      var dataStart = localOff + 30 + lNameLen + lExtraLen;
      var raw = buf.subarray(dataStart, dataStart + compSize);
      if (method === 0) out[name] = raw;
      else if (method === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('npz: sıkıştırılmış giriş desteklenmiyor');
        var ds = new DecompressionStream('deflate-raw');
        var stream = new Blob([raw]).stream().pipeThrough(ds);
        out[name] = new Uint8Array(await new Response(stream).arrayBuffer());
      } else throw new Error('npz: bilinmeyen sıkıştırma yöntemi ' + method);
      p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  }

  /** .npy dosyasını { data: Float64Array|Float32Array, shape } olarak çözer. */
  function parseNpy(bytes) {
    var buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (!(buf[0] === 0x93 && buf[1] === 0x4e && buf[2] === 0x55 && buf[3] === 0x4d && buf[4] === 0x50 && buf[5] === 0x59)) {
      throw new Error('npy: imza hatalı');
    }
    var major = buf[6];
    var headerLen = major === 1 ? readU16(buf, 8) : readU32(buf, 8);
    var headerStart = major === 1 ? 10 : 12;
    var header = new TextDecoder().decode(buf.subarray(headerStart, headerStart + headerLen));
    var descr = (header.match(/'descr'\s*:\s*'([^']+)'/) || [])[1];
    var fortran = /'fortran_order'\s*:\s*True/.test(header);
    if (fortran) throw new Error('npy: Fortran sırası desteklenmiyor');
    var shapeStr = (header.match(/'shape'\s*:\s*\(([^)]*)\)/) || [])[1] || '';
    var shape = shapeStr.split(',').map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; }).map(Number);
    var count = shape.reduce(function (a, b) { return a * b; }, 1);
    var offset = headerStart + headerLen;
    var little = descr && descr.charAt(0) !== '>';
    var data;
    if (descr === '<f4' && little) {
      data = new Float32Array(buf.buffer.slice(buf.byteOffset + offset, buf.byteOffset + offset + count * 4));
    } else if (descr === '<f8' && little) {
      data = new Float64Array(buf.buffer.slice(buf.byteOffset + offset, buf.byteOffset + offset + count * 8));
    } else {
      throw new Error('npy: desteklenmeyen dtype ' + descr);
    }
    return { data: data, shape: shape };
  }

  /** fbank.npz + passes.npz içeriğini çözer. */
  async function loadModelTables(fbankNpz, passesNpz) {
    var zf = await unzipEntries(fbankNpz);
    var zp = await unzipEntries(passesNpz);
    var win = parseNpy(zf['window.npy']);
    var mel = parseNpy(zf['mel.npy']);
    var gates = parseNpy(zp['gates.npy']);
    var embed = parseNpy(zp['pass_embed.npy']);
    return {
      window: Float64Array.from(win.data),
      mel: Float64Array.from(mel.data),
      melRows: mel.shape[0],
      melCols: mel.shape[1],
      gates: Float32Array.from(gates.data),
      passEmbed: Float32Array.from(embed.data),
      passCount: embed.shape[0],
      passDim: embed.shape[1]
    };
  }

  // ---------------------------------------------------------------------------
  // FFT (512 nokta, gerçek giriş → 257 güç bin'i)
  // ---------------------------------------------------------------------------
  function makeFft(n) {
    var levels = Math.round(Math.log(n) / Math.LN2);
    if ((1 << levels) !== n) throw new Error('FFT boyutu 2^n olmalı');
    var rev = new Uint16Array(n);
    for (var i = 0; i < n; i++) {
      var x = i, r = 0;
      for (var j = 0; j < levels; j++) { r = (r << 1) | (x & 1); x >>= 1; }
      rev[i] = r;
    }
    var cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
    for (var k = 0; k < n / 2; k++) {
      cos[k] = Math.cos(-2 * Math.PI * k / n);
      sin[k] = Math.sin(-2 * Math.PI * k / n);
    }
    var re = new Float64Array(n), im = new Float64Array(n);
    return function fft(input) {
      for (var i2 = 0; i2 < n; i2++) { re[rev[i2]] = input[i2]; im[rev[i2]] = 0; }
      for (var size = 2; size <= n; size <<= 1) {
        var half = size >> 1, step = n / size;
        for (var startI = 0; startI < n; startI += size) {
          for (var k2 = 0, t = 0; k2 < half; k2++, t += step) {
            var a = startI + k2, b = a + half;
            var tr = re[b] * cos[t] - im[b] * sin[t];
            var ti = re[b] * sin[t] + im[b] * cos[t];
            re[b] = re[a] - tr; im[b] = im[a] - ti;
            re[a] += tr; im[a] += ti;
          }
        }
      }
      return { re: re, im: im };
    };
  }

  // ---------------------------------------------------------------------------
  // Fbank (features.py birebir portu)
  // ---------------------------------------------------------------------------
  function Fbank(tables) {
    this.window = tables.window;
    this.mel = tables.mel;
    this.melRows = tables.melRows;
    this.melCols = tables.melCols;
    this.fft = makeFft(NFFT);
    this.power = new Float64Array(NFFT / 2 + 1);
  }

  /** 16 kHz float32 dalga → { data: Float32Array (T',160), frames: T' } */
  Fbank.prototype.compute = function (wav) {
    var n = wav.length;
    var x = new Float64Array(Math.max(n, WIN));
    for (var i = 0; i < n; i++) x[i] = wav[i] * 32768.0;
    var frames = Math.floor((x.length - WIN) / HOP) + 1;
    if (frames < 1) frames = 1;

    var mel = this.mel, melRows = this.melRows, melCols = this.melCols;
    var frame = new Float64Array(WIN);
    var buf = new Float64Array(NFFT);
    var logmel = new Float64Array(frames * melCols);

    for (var f = 0; f < frames; f++) {
      var off = f * HOP;
      var mean = 0;
      for (i = 0; i < WIN; i++) { frame[i] = x[off + i]; mean += frame[i]; }
      mean /= WIN;
      for (i = 0; i < WIN; i++) frame[i] -= mean;

      buf[0] = frame[0] * (1 - 0.97) * this.window[0];
      for (i = 1; i < WIN; i++) buf[i] = (frame[i] - 0.97 * frame[i - 1]) * this.window[i];
      for (i = WIN; i < NFFT; i++) buf[i] = 0;

      var spec = this.fft(buf);
      var power = this.power;
      for (var k = 0; k <= NFFT / 2; k++) {
        var re = spec.re[k], im = spec.im[k];
        power[k] = re * re + im * im;
      }

      // (257,) @ (257, 80)
      for (var m = 0; m < melCols; m++) {
        var acc = 0;
        for (var r = 0; r < melRows; r++) acc += power[r] * mel[r * melCols + m];
        logmel[f * melCols + m] = Math.log(Math.max(acc, EPS));
      }
    }

    // utterance CMVN (ddof=1)
    var means = new Float64Array(melCols);
    for (m = 0; m < melCols; m++) {
      var s = 0;
      for (f = 0; f < frames; f++) s += logmel[f * melCols + m];
      means[m] = s / frames;
    }
    var vars = new Float64Array(melCols);
    for (m = 0; m < melCols; m++) {
      var v = 0;
      for (f = 0; f < frames; f++) {
        var d = logmel[f * melCols + m] - means[m];
        v += d * d;
      }
      vars[m] = frames > 1 ? v / (frames - 1) : 1;
    }
    for (f = 0; f < frames; f++) {
      for (m = 0; m < melCols; m++) {
        var idx = f * melCols + m;
        logmel[idx] = (logmel[idx] - means[m]) / Math.sqrt(vars[m] + 1e-7);
      }
    }

    var t = frames - (frames % 2);
    var outFrames = t >> 1;
    var out = new Float32Array(outFrames * 2 * melCols);
    for (f = 0; f < outFrames; f++) {
      for (m = 0; m < melCols; m++) {
        out[f * 160 + m] = logmel[(2 * f) * melCols + m];
        out[f * 160 + 80 + m] = logmel[(2 * f + 1) * melCols + m];
      }
    }
    return { data: out, frames: outFrames };
  };

  // ---------------------------------------------------------------------------
  // SentencePiece (spm.model) — yalnızca decode tarafı
  // ---------------------------------------------------------------------------
  function readVarint(buf, pos) {
    var result = 0, shift = 0, b;
    do {
      b = buf[pos++];
      result += (b & 0x7f) * Math.pow(2, shift);
      shift += 7;
    } while (b & 0x80);
    return { value: result, pos: pos };
  }

  function decodeUtf8(buf, start, end) {
    return new TextDecoder().decode(buf.subarray(start, end));
  }

  function SpeechPieces(buffer) {
    var buf = new Uint8Array(buffer);
    var pos = 0;
    this.pieces = [];
    this.types = [];
    while (pos < buf.length) {
      var key = readVarint(buf, pos); pos = key.pos;
      var field = key.value >> 3, wire = key.value & 7;
      if (wire === 2) {
        var len = readVarint(buf, pos); pos = len.pos;
        var end = pos + len.value;
        if (field === 1) {
          // SentencePiece { string piece = 1; float score = 2; Type type = 3; }
          var p = pos, piece = '', type = 1;
          while (p < end) {
            var k2 = readVarint(buf, p); p = k2.pos;
            var f2 = k2.value >> 3, w2 = k2.value & 7;
            if (w2 === 2) {
              var l2 = readVarint(buf, p); p = l2.pos;
              if (f2 === 1) piece = decodeUtf8(buf, p, p + l2.value);
              p += l2.value;
            } else if (w2 === 0) {
              var v2 = readVarint(buf, p); p = v2.pos;
              if (f2 === 3) type = v2.value;
            } else if (w2 === 5) { p += 4; }
            else if (w2 === 1) { p += 8; }
            else { p = end; }
          }
          this.pieces.push(piece);
          this.types.push(type);
        }
        pos = end;
      } else if (wire === 0) { var v = readVarint(buf, pos); pos = v.pos; }
      else if (wire === 5) { pos += 4; }
      else if (wire === 1) { pos += 8; }
      else { break; }
    }
    if (this.pieces.length < 2) throw new Error('spm: model çözümlenemedi');
    this.bytePieces = new Map();
    for (var i = 0; i < this.pieces.length; i++) {
      var m = /^<0x([0-9a-fA-F]{2})>$/.exec(this.pieces[i]);
      if (m) this.bytePieces.set(i, parseInt(m[1], 16));
    }
    this.decoder = new TextDecoder('utf-8');
  }

  /** Python motorundaki decode_ids: pad/bos/eos + dil/stil kontrol token'ları atılır. */
  SpeechPieces.prototype.decode = function (ids, control) {
    var parts = [];
    var bytes = [];
    var self = this;
    function flush() {
      if (!bytes.length) return;
      parts.push(self.decoder.decode(new Uint8Array(bytes)));
      bytes = [];
    }
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (id === 0 || id === 2 || id === 3) continue;         // pad, bos, eos
      if (control && control.indexOf(id) !== -1) continue;     // <tr>/<en>/<mix>/<cased>/<plain>
      var b = this.bytePieces.get(id);
      if (b !== undefined) { bytes.push(b); continue; }
      flush();
      parts.push(this.pieces[id] !== undefined ? this.pieces[id] : '');
    }
    flush();
    var text = parts.join('').replace(/\u2581/g, ' ');
    return text.replace(/^\s+|\s+$/g, '');
  };

  // ---------------------------------------------------------------------------
  // CTC + beam search (decode.py birebir portu)
  // ---------------------------------------------------------------------------
  function ctcGreedyIds(logp, T, V, blank) {
    var out = [], prev = -1;
    for (var t = 0; t < T; t++) {
      var base = t * V, best = 0, bestVal = -Infinity;
      for (var v = 0; v < V; v++) {
        var val = logp[base + v];
        if (val > bestVal) { bestVal = val; best = v; }
      }
      if (best !== prev && best !== blank) out.push(best);
      prev = best;
    }
    return out;
  }

  /** numpy float32 toplamına yakın ikili (pairwise) toplama. */
  function f32sum(arr, start, end) {
    var n = end - start;
    if (n <= 8) {
      var s = 0;
      for (var i = start; i < end; i++) s += arr[i];
      return Math.fround(s);
    }
    var mid = start + (n >> 1);
    return Math.fround(f32sum(arr, start, mid) + f32sum(arr, mid, end));
  }

  /** numpy float32 log_softmax satırı (değerler float32'ye yuvarlanır). */
  function logSoftmaxRow(src, dst, V) {
    var max = -Infinity;
    for (var v = 0; v < V; v++) if (src[v] > max) max = src[v];
    for (v = 0; v < V; v++) dst[v] = Math.exp(src[v] - max);
    var logSum = Math.log(f32sum(dst, 0, V));
    for (v = 0; v < V; v++) dst[v] = Math.fround(src[v] - max - logSum);
  }

  function runawayBound(ctcLen) {
    var slack = ctcLen < RUNAWAY_SHORT ? RUNAWAY_SLACK_SHORT : RUNAWAY_SLACK;
    return Math.floor(RUNAWAY_RATIO * ctcLen + slack);
  }

  function isRunaway(seq, ctcLen) {
    if (seq.length > runawayBound(ctcLen)) return true;
    var nList = [1, 2, 3, 4];
    for (var ni = 0; ni < nList.length; ni++) {
      var n = nList[ni], run = 1;
      for (var i = n; i < seq.length - n + 1; i += n) {
        var same = true;
        for (var j = 0; j < n; j++) if (seq[i + j] !== seq[i - n + j]) { same = false; break; }
        if (same) { run++; if (run >= MAX_REPEAT_RUN) return true; }
        else run = 1;
      }
    }
    return false;
  }

  function ctcNll(logp, T, V, seq, blank) {
    if (seq.length === 0) {
      var sum = 0;
      for (var t0 = 0; t0 < T; t0++) sum += logp[t0 * V + blank];
      return -sum;
    }
    var ext = [blank];
    for (var i = 0; i < seq.length; i++) { ext.push(seq[i]); ext.push(blank); }
    var S = ext.length;
    if (T < (S + 1) >> 1) return Infinity;

    var skip = new Uint8Array(S);
    for (var s = 2; s < S; s++) {
      if (ext[s] !== blank && ext[s] !== ext[s - 2]) skip[s] = 1;
    }
    var alpha = new Float64Array(S);
    for (s = 0; s < S; s++) alpha[s] = NEG;
    alpha[0] = logp[blank];
    if (S > 1) alpha[1] = logp[ext[1]];
    for (var t = 1; t < T; t++) {
      var row = t * V;
      var prev = t === 1 ? alpha.slice() : null;
      var a = alpha;
      var next = new Float64Array(S);
      for (s = 0; s < S; s++) {
        var from0 = a[s];
        var from1 = s > 0 ? a[s - 1] : NEG;
        var from2 = (s > 1 && skip[s]) ? a[s - 2] : NEG;
        var m = Math.max(from0, Math.max(from1, from2));
        var val;
        if (m <= NEG / 2) val = NEG;
        else {
          var sumExp = Math.exp(from0 - m);
          if (from1 > NEG / 2) sumExp += Math.exp(from1 - m);
          if (from2 > NEG / 2) sumExp += Math.exp(from2 - m);
          val = m + Math.log(sumExp);
        }
        next[s] = val + logp[row + ext[s]];
      }
      alpha = next;
      void prev;
    }
    var tail = alpha[S - 1];
    if (S > 1) {
      var a1 = alpha[S - 2], a2 = alpha[S - 1];
      var mm = Math.max(a1, a2);
      tail = mm <= NEG / 2 ? NEG : mm + Math.log(Math.exp(a1 - mm) + Math.exp(a2 - mm));
    }
    return tail > NEG / 2 ? -tail : Infinity;
  }

  /**
   * Attention beam search — decode.py'deki BeamSearch sınıfının portu.
   * runDecoder(tokens, K, L, stride, h, Tp) → Promise<Float32Array> [K,L,V]
   */
  function BeamSearch(opts) {
    this.sp = opts.sp;               // { pad, bos, eos, unk, lang: {}, style: {}, control: [] }
    this.maxPositions = opts.maxPositions || 448;
    this.runDecoder = opts.runDecoder;
  }

  BeamSearch.prototype.search = async function (h, Tp, logp, T, V, beam, lang, ctcWeight, onStep) {
    var sp = this.sp;
    var ctcSeq = ctcGreedyIds(logp, T, V, sp.pad);
    var maxLen = Math.min(this.maxPositions - 4, 8 + Math.floor(T / 3));
    if (ctcWeight > 0) maxLen = Math.min(maxLen, runawayBound(ctcSeq.length));
    var K = beam;
    var nPrefix = 3;
    var control = sp.control;
    var langIds = Object.keys(sp.lang).map(function (k) { return sp.lang[k]; }).sort(function (a, b) { return a - b; });
    var langForced = lang === null ? langIds : [sp.lang[lang]];

    var maxT = maxLen + nPrefix - 1;
    var stride = maxT + 2;
    var tokens = new Int32Array(K * stride);
    for (var i = 0; i < K; i++) tokens[i] = sp.bos;
    var lens = new Int32Array(K);
    for (i = 0; i < K; i++) lens[i] = 1;
    var scores = new Float32Array(K);
    for (i = 0; i < K; i++) scores[i] = NEG;
    scores[0] = 0;
    var finished = new Uint8Array(K);

    var row = new Float32Array(V);
    var candScore = new Float32Array(K * V);
    var logitsScratch = new Float32Array(V);
    var keep = new Float32Array(V);
    for (var v = 0; v < V; v++) keep[v] = NEG;
    for (var li = 0; li < langForced.length; li++) keep[langForced[li]] = 0;

    for (var t = 0; t < maxT; t++) {
      var L = lens[0]; // tüm ışınlar aynı uzunlukta
      var logits = await this.runDecoder(tokens, K, L, stride, h, Tp);
      for (var k = 0; k < K; k++) {
        var last = (k * L + (L - 1)) * V;
        for (v = 0; v < V; v++) logitsScratch[v] = logits[last + v];
        logSoftmaxRow(logitsScratch, row, V);
        if (t === 0) {
          for (v = 0; v < V; v++) row[v] += keep[v];
        } else if (t === 1) {
          for (v = 0; v < V; v++) row[v] = NEG;
          row[sp.style.cased] = 0;
        } else {
          row[sp.pad] = NEG;
          row[sp.bos] = NEG;
          if (control) for (var ci = 0; ci < control.length; ci++) row[control[ci]] = NEG;
        }
        if (finished[k]) {
          for (v = 0; v < V; v++) row[v] = NEG;
          row[sp.eos] = 0;
        }
        var s = scores[k];
        var base = k * V;
        for (v = 0; v < V; v++) candScore[base + v] = s + row[v];
      }

      // Top-K seçimi (K*V aday içinden)
      var bestScore = new Float32Array(K);
      var bestIdx = new Int32Array(K);
      for (i = 0; i < K; i++) bestScore[i] = -Infinity;
      for (var c = 0; c < K * V; c++) {
        var cs = candScore[c];
        if (cs <= bestScore[K - 1]) continue;
        var pos = K - 1;
        while (pos > 0 && bestScore[pos - 1] < cs) {
          bestScore[pos] = bestScore[pos - 1];
          bestIdx[pos] = bestIdx[pos - 1];
          pos--;
        }
        bestScore[pos] = cs;
        bestIdx[pos] = c;
      }

      var newTokens = new Int32Array(K * stride);
      var newLens = new Int32Array(K);
      var newFinished = new Uint8Array(K);
      var newScores = new Float32Array(K);
      for (i = 0; i < K; i++) {
        var src = Math.floor(bestIdx[i] / V);
        var tok = bestIdx[i] % V;
        var srcBase = src * stride;
        var dstBase = i * stride;
        for (var j = 0; j < lens[src]; j++) newTokens[dstBase + j] = tokens[srcBase + j];
        newTokens[dstBase + lens[src]] = tok;
        newLens[i] = lens[src] + 1;
        newFinished[i] = (finished[src] || tok === sp.eos) ? 1 : 0;
        newScores[i] = bestScore[i];
      }
      tokens = newTokens; lens = newLens; finished = newFinished; scores = newScores;
      if (onStep && (t % 4 === 3)) onStep(t + 1, maxT);
      var allDone = true;
      for (i = 0; i < K; i++) if (!finished[i]) { allDone = false; break; }
      if (t >= nPrefix && allDone) break;
    }

    var result = finalize(tokens, lens, scores, stride, nPrefix, K, sp, logp, T, V, ctcSeq, ctcWeight);
    if (this.debug) {
      result.debug = {
        tokens: Array.from(tokens), lens: Array.from(lens), scores: Array.from(scores),
        stride: stride, K: K, nPrefix: nPrefix, ctcSeq: ctcSeq
      };
    }
    return result;
  };

  function finalize(tokens, lens, scores, stride, nPrefix, K, sp, logp, T, V, ctcSeq, ctcWeight) {
    var hyps = [], total = new Float64Array(K), hypLens = new Float64Array(K);
    for (var k = 0; k < K; k++) {
      var seq = [];
      for (var j = nPrefix; j < lens[k]; j++) {
        var tok = tokens[k * stride + j];
        if (tok === sp.eos) break;
        seq.push(tok);
      }
      hyps.push(seq);
      hypLens[k] = seq.length + 1;
      total[k] = scores[k];
    }
    if (ctcWeight > 0) {
      for (k = 0; k < K; k++) {
        var nll = ctcNll(logp, T, V, hyps[k], sp.pad);
        total[k] = (1 - ctcWeight) * total[k] - ctcWeight * nll;
      }
    }
    for (k = 0; k < K; k++) {
      total[k] = isFinite(total[k]) ? total[k] / Math.max(hypLens[k], 1) : -Infinity;
    }
    var order = [];
    for (k = 0; k < K; k++) order.push(k);
    order.sort(function (a, b) { return total[b] - total[a]; });

    var langUsed = tokens[1];
    if (ctcWeight > 0) {
      if (ctcSeq.length <= 1 && hyps[order[0]].length > ctcSeq.length + 1) return { ids: [], lang: langUsed };
      for (var oi = 0; oi < order.length; oi++) {
        var idx = order[oi];
        if (isFinite(total[idx]) && !isRunaway(hyps[idx], ctcSeq.length)) {
          return { ids: hyps[idx], lang: tokens[idx * stride + 1] };
        }
      }
      return { ids: ctcSeq, lang: langUsed };
    }
    return { ids: hyps[order[0]], lang: langUsed };
  }

  // ---------------------------------------------------------------------------
  // Uzun sesi parçalama (audio.py chunks)
  // ---------------------------------------------------------------------------
  function chunks(audio, maxS, limitS, searchS, sr) {
    maxS = maxS || 25; limitS = limitS || 30; searchS = searchS || 4; sr = sr || SAMPLE_RATE;
    if (audio.length <= limitS * sr) return [audio];
    var frame = Math.floor(sr / 50);
    var n = audio.length;
    var rms = new Float64Array(n);
    var sum = 0;
    for (var i = 0; i < n; i++) { sum += audio[i] * audio[i]; rms[i] = sum; }
    var out = [], start = 0;
    while (n - start > limitS * sr) {
      var target = start + Math.floor(maxS * sr);
      var lo = Math.max(start + sr, target - Math.floor(searchS * sr));
      var hi = Math.min(n - sr, target + Math.floor(searchS * sr));
      var cut = target;
      if (hi > lo) {
        cut = lo;
        var best = Infinity;
        for (var p = lo; p < hi; p++) {
          // kayan pencere enerjisi (frame uzunluğu) — Python'daki convolve 'same' eşdeğeri
          var a = Math.max(0, p - (frame >> 1)), b = Math.min(n, a + frame);
          var e = (rms[b - 1] - (a > 0 ? rms[a - 1] : 0)) / frame;
          if (e < best) { best = e; cut = p; }
        }
      }
      out.push(audio.subarray(start, cut));
      start = cut;
    }
    out.push(audio.subarray(start));
    return out;
  }

  // ---------------------------------------------------------------------------
  // Motor: ONNX oturumları + tablolar
  // ---------------------------------------------------------------------------
  function Engine(cfg) {
    this.ort = cfg.ort;
    this.sessions = cfg.sessions;       // { pre, pass, post, decoder }
    this.meta = cfg.meta;               // engine.json
    this.tables = cfg.tables;           // window/mel/gates/passEmbed
    this.fbank = new Fbank(cfg.tables);
    this.spm = new SpeechPieces(cfg.spmBuffer);
    if (cfg.meta.vocab_size && this.spm.pieces.length < cfg.meta.vocab_size) {
      throw new Error('spm: sözlük eksik (' + this.spm.pieces.length + '/' + cfg.meta.vocab_size + ')');
    }
    var lang = {}, style = {};
    var m = cfg.meta.lang || {};
    Object.keys(m).forEach(function (k) { lang[k] = m[k]; });
    var st = cfg.meta.style || {};
    Object.keys(st).forEach(function (k) { style[k] = st[k]; });
    this.sp = {
      pad: cfg.meta.pad, bos: cfg.meta.bos, eos: cfg.meta.eos, unk: cfg.meta.unk,
      lang: lang, style: style,
      control: Object.keys(lang).map(function (k) { return lang[k]; })
        .concat(Object.keys(style).map(function (k) { return style[k]; }))
    };
    var self = this;
    this.beamSearch = new BeamSearch({
      sp: self.sp,
      maxPositions: cfg.meta.max_positions || 448,
      runDecoder: cfg.runDecoder
    });
  }
  Engine.prototype.decodeIds = function (ids) {
    return this.spm.decode(ids, this.sp.control);
  };

  /** Dalgayı kodlar → { h: Float32Array [1,Tp,256], Tp, logp: Float32Array [Tp,V], T, V } */
  Engine.prototype.encode = async function (wav, onStage) {
    var ort = this.ort;
    var feats = this.fbank.compute(wav);
    var T = feats.frames;
    if (T < 1) throw new Error('Ses çok kısa');
    if (onStage) onStage('features', 1);
    var featTensor = new ort.Tensor('float32', feats.data, [1, T, 160]);
    var x = (await this.sessions.pre.run({ feats: featTensor })).x;
    var Tp = x.dims[1], D = x.dims[2];
    var cur = new Float32Array(x.data.length);
    cur.set(x.data);
    var nPass = this.tables.passCount;
    var emb = this.tables.passEmbed, gates = this.tables.gates;
    for (var p = 0; p < nPass; p++) {
      var input = new Float32Array(Tp * D);
      var embBase = p * D;
      for (var fr = 0; fr < Tp; fr++) {
        var rowOff = fr * D;
        for (var d = 0; d < D; d++) input[rowOff + d] = cur[rowOff + d] + emb[embBase + d];
      }
      var y = (await this.sessions.pass.run({ x: new ort.Tensor('float32', input, [1, Tp, D]) })).y;
      if (p === 0) {
        cur.set(y.data);
      } else {
        var gate = gates[p];
        for (var i2 = 0; i2 < cur.length; i2++) cur[i2] = cur[i2] + gate * (y.data[i2] - cur[i2]);
      }
      if (onStage) onStage('encode', (p + 1) / nPass);
    }
    var logpTensor = (await this.sessions.post.run({ x: new ort.Tensor('float32', cur, [1, Tp, D]) })).log_probs;
    return {
      h: cur, Tp: Tp, D: D,
      logp: logpTensor.data, T: Tp, V: logpTensor.dims[2],
      features: T
    };
  };

  /** Tek parça (<= ~30 s) için metin üretir. */
  Engine.prototype.transcribeUtterance = async function (wav, opts) {
    opts = opts || {};
    var lang = opts.lang === undefined ? 'mix' : opts.lang;
    var mode = opts.mode || 'auto';
    var beam = opts.beam || 5;
    var ctcWeight = opts.ctcWeight === undefined ? 0.3 : opts.ctcWeight;
    var onStage = opts.onStage || function () {};

    var audio = wav;
    if (opts.tailPad !== false) {
      audio = new Float32Array(wav.length + Math.round(TAIL_PAD_S * SAMPLE_RATE));
      audio.set(wav);
    }
    var enc = await this.encode(audio, onStage);
    if (mode === 'ctc') {
      var ids = ctcGreedyIds(enc.logp, enc.T, enc.V, this.sp.pad);
      return { ids: ids, text: this.decodeIds(ids) };
    }
    var result = await this.beamSearch.search(
      enc.h, enc.Tp, enc.logp, enc.T, enc.V, beam, lang, ctcWeight, opts.onStep
    );
    return { ids: result.ids, text: this.decodeIds(result.ids) };
  };

  /** Her uzunlukta ses: 25 s'lik parçalara böl, birleştir. */
  Engine.prototype.transcribe = async function (wav, opts) {
    opts = opts || {};
    var parts = chunks(wav);
    var texts = [];
    for (var i = 0; i < parts.length; i++) {
      if (opts.onProgress) opts.onProgress(i, parts.length);
      var r = await this.transcribeUtterance(parts[i], opts);
      if (r.text) texts.push(r.text);
    }
    return texts.join(' ').replace(/\s+/g, ' ').trim();
  };

  // ---------------------------------------------------------------------------
  // Dışa aktarım
  // ---------------------------------------------------------------------------
  return {
    SAMPLE_RATE: SAMPLE_RATE,
    TAIL_PAD_S: TAIL_PAD_S,
    loadModelTables: loadModelTables,
    unzipEntries: unzipEntries,
    parseNpy: parseNpy,
    Fbank: Fbank,
    SpeechPieces: SpeechPieces,
    BeamSearch: BeamSearch,
    ctcGreedyIds: ctcGreedyIds,
    ctcNll: ctcNll,
    isRunaway: isRunaway,
    chunks: chunks,
    Engine: Engine
  };
});

