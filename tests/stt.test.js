/**
 * YazNot — Sesten metne çekirdek testleri
 *
 * Model ağırlıkları olmadan çalışır: SentencePiece çözümü (sentetik protobuf),
 * NPY ayrıştırma, CTC greedy, CTC olasılığı (Python referansıyla), ışın araması
 * (sahte decoder), uzun ses parçalama ve guard'lar.
 *
 * Modelle uçtan uca test için: tests/stt-model.test.js (model yoksa atlanır).
 *
 * Çalıştırma:  npm test
 */
const core = require('../ui/stt/ds-core.js');

let failures = 0;
let checks = 0;
function check(name, cond, extra) {
  checks++;
  if (cond) console.log('  ✔ ' + name);
  else { failures++; console.log('  ✘ ' + name + (extra ? '  → ' + extra : '')); }
}
function near(a, b, eps) {
  return Math.abs(a - b) <= (eps === undefined ? 1e-4 : eps);
}

// ---------------------------------------------------------------------------
// Protobuf yardımcıları (sentetik spm.model)
// ---------------------------------------------------------------------------
function varint(n) {
  const out = [];
  while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n >>>= 7; }
  out.push(n);
  return out;
}
function fieldKey(field, wire) { return varint((field << 3) | wire); }
function lenField(field, bytes) { return fieldKey(field, 2).concat(varint(bytes.length), bytes); }
function strField(field, s) { return lenField(field, Array.from(Buffer.from(s, 'utf8'))); }

function buildSpm(pieces) {
  const chunks = [];
  pieces.forEach(function (p) {
    const inner = strField(1, p).concat(fieldKey(2, 5), [0, 0, 0, 0]); // score=0.0
    chunks.push.apply(chunks, lenField(1, inner));
  });
  return Buffer.from(chunks);
}

console.log('\nSesten metne — çekirdek');

check('modül yükleniyor', !!core && typeof core.Engine === 'function');
check('örnekleme hızı 16 kHz', core.SAMPLE_RATE === 16000);

// SentencePiece decode --------------------------------------------------------
const pieces = [
  '<pad>', '<unk>', '<s>', '</s>', '<tr>', '<en>', '<mix>', '<cased>', '<plain>',
  '\u2581Hello', '\u2581world', '.', '<0xE2>', '<0x82>', '<0xAC>', '\u2581ve'
];
const spm = new core.SpeechPieces(buildSpm(pieces));
const control = [4, 5, 6, 7, 8];
check('spm: parça sayısı', spm.pieces.length === pieces.length, String(spm.pieces.length));
check('spm: düz metin', spm.decode([9, 10, 11], control) === 'Hello world.', spm.decode([9, 10, 11], control));
check('spm: kontrol token’ları atlanır', spm.decode([0, 2, 3, 4, 5, 6, 7, 8, 9], control) === 'Hello', spm.decode([0, 2, 3, 4, 5, 6, 7, 8, 9], control));
check('spm: byte-fallback (€)', spm.decode([12, 13, 14], control) === '€', spm.decode([12, 13, 14], control));
check('spm: Türkçe parça', spm.decode([15, 9], control) === 've Hello', spm.decode([15, 9], control));

// NPY ayrıştırma -------------------------------------------------------------
function buildNpy(values, dtype) {
  const descr = dtype === 'f8' ? '<f8' : '<f4';
  let header = "{'descr': '" + descr + "', 'fortran_order': False, 'shape': (" + values.length + ",), }";
  const total = 10 + header.length + 1;
  const pad = (64 - (total % 64)) % 64;
  header = header + ' '.repeat(pad) + '\n';
  const headerBytes = Buffer.from(header, 'latin1');
  const data = Buffer.alloc(values.length * (dtype === 'f8' ? 8 : 4));
  values.forEach(function (v, i) { dtype === 'f8' ? data.writeDoubleLE(v, i * 8) : data.writeFloatLE(v, i * 4); });
  return Buffer.concat([
    Buffer.from([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0]),
    Buffer.from([headerBytes.length & 0xff, headerBytes.length >> 8]),
    headerBytes, data
  ]);
}
const npy4 = core.parseNpy(buildNpy([1.5, -2.25, 3], 'f4'));
check('npy: float32 değerler', npy4.data.length === 3 && near(npy4.data[1], -2.25, 1e-6));
const npy8 = core.parseNpy(buildNpy([0.1, 0.2], 'f8'));
check('npy: float64 değerler', npy8.data.length === 2 && near(npy8.data[0], 0.1, 1e-9));

// CTC greedy ------------------------------------------------------------------
const V = 5, T = 6;
const logp = new Float32Array(T * V).fill(-10);
function setMax(t, id) { logp[t * V + id] = 0; }
setMax(0, 1); setMax(1, 1); setMax(2, 0); setMax(3, 2); setMax(4, 2); setMax(5, 3);
const greedy = core.ctcGreedyIds(logp, T, V, 0);
check('ctc greedy: tekrarlar birleşir, blank düşer', JSON.stringify(greedy) === JSON.stringify([1, 2, 3]), JSON.stringify(greedy));

// CTC olasılığı (Python referansı) -------------------------------------------
const refLogp = new Float32Array([
  -1.4230087995529175, -1.1254934072494507, -1.6983767747879028, -2.314830780029297, -1.878909707069397,
  -2.8482234477996826, -1.7964333295822144, -0.5163617134094238, -2.348783493041992, -2.4770517349243164,
  -1.2217271327972412, -1.354682207107544, -1.6061549186706543, -2.6420371532440186, -1.7408210039138794,
  -0.5054551362991333, -2.5449728965759277, -1.6583740711212158, -3.1019811630249023, -2.4902961254119873
]);
check('ctc nll: [1]', near(core.ctcNll(refLogp, 4, 5, [1], 0), 3.2365182110289243, 1e-5), String(core.ctcNll(refLogp, 4, 5, [1], 0)));
check('ctc nll: [2,3]', near(core.ctcNll(refLogp, 4, 5, [2, 3], 0), 3.817583021421912, 1e-5));
check('ctc nll: [1,1]', near(core.ctcNll(refLogp, 4, 5, [1, 1], 0), 5.13076918087516, 1e-5));
check('ctc nll: [4,0,2]', near(core.ctcNll(refLogp, 4, 5, [4, 0, 2], 0), 7.607234358787537, 1e-5));
check('ctc nll: boş dizi', near(core.ctcNll(refLogp, 4, 5, [], 0), 5.998414039611816, 1e-5));
check('ctc nll: hizalanamaz → sonsuz', core.ctcNll(refLogp, 1, 5, [1, 2, 3], 0) === Infinity);

// Guard'lar -------------------------------------------------------------------
check('runaway: kısa dizi normal', core.isRunaway([1, 2, 3, 4], 10) === false);
check('runaway: aşırı uzun', core.isRunaway(new Array(60).fill(1), 5) === true);
check('runaway: 6 kez tekrar', core.isRunaway([1, 2, 2, 2, 2, 2, 2, 3], 10) === true);

// Parçalama -------------------------------------------------------------------
const sr = 16000;
const audio = new Float32Array(70 * sr);
for (let i = 0; i < audio.length; i++) audio[i] = Math.sin(i / 100) * 0.1;
const parts = core.chunks(audio);
check('chunks: 70 sn → birden çok parça', parts.length >= 2, String(parts.length));
check('chunks: her parça <= 30 sn', parts.every(function (p) { return p.length <= 30 * sr; }));
const totalLen = parts.reduce(function (a, p) { return a + p.length; }, 0);
check('chunks: veri kaybı yok', totalLen === audio.length, totalLen + ' ≠ ' + audio.length);
check('chunks: kısa ses tek parça', core.chunks(new Float32Array(5 * sr)).length === 1);

// Işın araması (sahte decoder) ------------------------------------------------
async function beamTest() {
  const sp = {
    pad: 0, bos: 2, eos: 3, unk: 1,
    lang: { tr: 4, en: 5, mix: 6 }, style: { cased: 7, plain: 8 },
    control: [4, 5, 6, 7, 8]
  };
  const Vb = 16;
  const fake = async function (tokens, K, L) {
    const out = new Float32Array(K * L * Vb);
    for (let k = 0; k < K; k++) {
      const base = (k * L + (L - 1)) * Vb;
      if (L === 3) out[base + 9] = 12;       // ilk içerik token'ı
      else if (L === 4) out[base + 10] = 12; // ikinci
      else if (L >= 5) out[base + 3] = 12;   // </s>
    }
    return out;
  };
  const bs = new core.BeamSearch({ sp: sp, maxPositions: 64, runDecoder: fake });
  const Tb = 12;
  const ctc = new Float32Array(Tb * Vb).fill(-10);
  for (let t = 0; t < Tb; t++) ctc[t * Vb + 0] = 0; // hepsi blank → ctc_seq boş
  const res = await bs.search(new Float32Array(1), 1, ctc, Tb, Vb, 3, 'mix', 0, null);
  check('beam: zorunlu dil + stil + içerik + eos', JSON.stringify(res.ids) === JSON.stringify([9, 10]), JSON.stringify(res.ids));
  check('beam: dil token’ı <mix>', res.lang === 6, String(res.lang));
}
beamTest().then(function () {
  console.log('\nSonuç: ' + (checks - failures) + '/' + checks + ' kontrol geçti');
  process.exit(failures ? 1 : 0);
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
