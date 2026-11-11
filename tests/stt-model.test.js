/**
 * YazNot — Sesten metne model entegrasyon testi (isteğe bağlı)
 *
 * 56 MB'lık model ağırlıkları depoda tutulmadığı için bu test yalnızca model
 * yerel olarak indirilmişse çalışır; aksi halde atlanır.
 *
 *   $env:YAZNOT_STT_MODEL_DIR = "C:\path\to\model"
 *   $env:YAZNOT_STT_AUDIO_DIR = "C:\path\to\audio"
 *   node tests/stt-model.test.js
 *
 * Klasörlerde: int8/*.onnx, engine.json, fbank.npz, passes.npz, spm.model
 * ve 16 kHz mono WAV dosyaları (en1.wav, tr1.wav …) bulunmalıdır.
 */
const fs = require('fs');
const path = require('path');

const MODEL_DIR = process.env.YAZNOT_STT_MODEL_DIR || path.join(__dirname, '..', '.models');
const AUDIO_DIR = process.env.YAZNOT_STT_AUDIO_DIR || path.join(__dirname, '..', '.audio');

function skip(reason) {
  console.log('\nModel testi atlandı: ' + reason);
  process.exit(0);
}
if (!fs.existsSync(path.join(MODEL_DIR, 'int8', 'encoder_pass.onnx'))) {
  skip('model dosyaları yok (' + MODEL_DIR + ')');
}
if (!fs.existsSync(AUDIO_DIR)) skip('test sesleri yok (' + AUDIO_DIR + ')');

let ort;
try { ort = require('onnxruntime-web'); }
catch (e) { skip('onnxruntime-web kurulu değil (npm install)'); }

const core = require('../ui/stt/ds-core.js');

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('  ✔ ' + name);
  else { failures++; console.log('  ✘ ' + name + (extra ? '  → ' + extra : '')); }
}

function loadWav16k(file) {
  const b = fs.readFileSync(file);
  let off = 12, dataOff = -1, dataLen = 0;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'data') { dataOff = off + 8; dataLen = size; break; }
    off += 8 + size + (size % 2);
  }
  if (dataOff < 0) throw new Error('WAV verisi yok: ' + file);
  const pcm = new Int16Array(b.buffer, b.byteOffset + dataOff, Math.floor(dataLen / 2));
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 32768;
  return out;
}

function normalize(s) {
  return s.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
function similarity(a, b) {
  const x = normalize(a), y = normalize(b);
  const m = x.length, n = y.length;
  if (!m || !n) return 0;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - dp[n] / Math.max(m, n);
}

const EXPECT = {
  'en1.wav': 'Hello, this is a test of the YazNot speech recognition system. Please write this sentence into my note.',
  'en2.wav': 'Remind me to call the dentist tomorrow at three o clock in the afternoon.',
  'tr1.wav': 'Yarın saat üçte dişçiyi aramayı hatırlat. Akşam için alışveriş listesi yapmayı da unutma.',
  'tr2.wav': 'Toplantı notları: müşteri yeni fiyat teklifini beğendi, ancak teslim tarihi konusunda biraz endişeli.',
  'tr3.wav': 'Bu uygulamada sesimi kaydedip yazıya dönüştürebiliyorum. Türkçe ve İngilizce birlikte çalışıyor.'
};

(async () => {
  console.log('\nSesten metne — model entegrasyonu');
  ort.env.wasm.numThreads = 1;
  ort.env.logLevel = 'error';
  const meta = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'engine.json'), 'utf8'));
  const mk = (n) => ort.InferenceSession.create(path.join(MODEL_DIR, 'int8', n + '.onnx'), { executionProviders: ['wasm'] });
  const t0 = Date.now();
  const [pre, pass, post, decoder] = await Promise.all([
    mk('encoder_pre'), mk('encoder_pass'), mk('encoder_post'), mk('decoder')
  ]);
  console.log('  oturumlar yüklendi: ' + (Date.now() - t0) + ' ms');
  const tables = await core.loadModelTables(
    fs.readFileSync(path.join(MODEL_DIR, 'fbank.npz')),
    fs.readFileSync(path.join(MODEL_DIR, 'passes.npz'))
  );
  const runDecoder = async (tokens, K, L, stride, h, Tp) => {
    const toks = new BigInt64Array(K * L);
    for (let k = 0; k < K; k++) for (let j = 0; j < L; j++) toks[k * L + j] = BigInt(tokens[k * stride + j]);
    const out = await decoder.run({
      tokens: new ort.Tensor('int64', toks, [K, L]),
      memory: new ort.Tensor('float32', h, [1, Tp, 256])
    });
    return out.logits.data;
  };
  const engine = new core.Engine({
    ort, sessions: { pre, pass, post, decoder }, meta, tables,
    spmBuffer: fs.readFileSync(path.join(MODEL_DIR, 'spm.model')), runDecoder
  });
  check('motor kuruldu', !!engine);
  check('sözlük 2048 parça', engine.spm.pieces.length === meta.vocab_size, String(engine.spm.pieces.length));

  const files = Object.keys(EXPECT).filter((f) => fs.existsSync(path.join(AUDIO_DIR, f)));
  if (!files.length) console.log('  (karşılaştırılacak ses dosyası yok)');
  for (const file of files) {
    const wav = loadWav16k(path.join(AUDIO_DIR, file));
    const t = Date.now();
    const attn = await engine.transcribeUtterance(wav, { mode: 'auto', lang: 'mix', beam: 5 });
    const ms = Date.now() - t;
    const sim = similarity(attn.text, EXPECT[file]);
    check(file + ' (benzerlik ' + (sim * 100).toFixed(0) + '%, ' + ms + ' ms)', sim >= 0.8, attn.text);
  }
  console.log('\nSonuç: ' + (failures ? failures + ' başarısız' : 'tüm kontroller geçti'));
  process.exit(failures ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(2); });
