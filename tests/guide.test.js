/**
 * YazNot — kullanım kılavuzu testi (jsdom)
 *
 * guide-content.js'in üretilmiş içeriğini ve guide.js görüntüleyicisini
 * tarayıcı açmadan denetler: bölümler, içindekiler, açma/kapama, PDF kaydetme.
 *
 * Çalıştırma:  npm test
 */
const fs = require('fs');
const path = require('path');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (e) {
  console.error('jsdom bulunamadı. Kurmak için: npm install --save-dev jsdom');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'ui', 'index.html'), 'utf8');
const contentSrc = fs.readFileSync(path.join(ROOT, 'ui', 'guide-content.js'), 'utf8');
const guideSrc = fs.readFileSync(path.join(ROOT, 'ui', 'guide.js'), 'utf8');

let failures = 0;
let checks = 0;
function check(name, cond, extra) {
  checks++;
  if (cond) console.log('  ✔ ' + name);
  else { failures++; console.log('  ✘ ' + name + (extra ? '  → ' + extra : '')); }
}
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 30); }); }

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'outside-only'
});
const { window } = dom;
const { document } = window;

let savedPdf = 0;
window.api = {
  saveGuidePdf: async function () { savedPdf++; return { ok: true, filePath: 'kilavuz.pdf' }; }
};

window.eval(contentSrc);
window.eval(guideSrc);
if (document.readyState !== 'loading') document.dispatchEvent(new window.Event('DOMContentLoaded'));

(async function run() {
  await wait(80);

  console.log('\nKılavuz içeriği');
  check('içerik global olarak yüklendi', !!window.YAZNOT_GUIDE);
  const sections = (window.YAZNOT_GUIDE || {}).sections || [];
  check('en az 10 bölüm var', sections.length >= 10, String(sections.length));
  check('sürüm 1.0', window.YAZNOT_GUIDE.version === '1.0');
  check('PDF adı tanımlı', window.YAZNOT_GUIDE.pdf === 'yaznot-kullanim-kilavuzu.pdf');
  check('her bölümün başlığı ve HTML içeriği var',
    sections.every(function (s) { return s.title && s.html && s.id; }));
  check('Markdown içe aktarma kılavuzda anlatılır',
    JSON.stringify(sections).indexOf('Markdown') !== -1);

  console.log('\nGörüntüleyici');
  const modal = document.getElementById('guide-modal');
  check('kılavuz kapalı başlar', modal.classList.contains('hidden'));
  check('küçük düğme HTML içinde', !!document.getElementById('guide-fab'));
  window.YazNotGuide.open({ welcome: true });
  await wait(60);
  check('kılavuz açılır', !modal.classList.contains('hidden'));
  check('hoş geldin notu gösterilir', !document.getElementById('guide-welcome').classList.contains('hidden'));
  check('içindekiler üretilir',
    document.querySelectorAll('#guide-toc .guide-toc-btn').length === sections.length);
  check('bölümler gövdeye yazılır',
    document.querySelectorAll('#guide-body .guide-section').length === sections.length);
  check('ilk bölüm etkin', document.querySelector('#guide-toc .guide-toc-btn').classList.contains('active'));
  check('ilk bölüm başlığı görünür',
    (document.querySelector('#guide-body .guide-section h2') || {}).textContent === sections[0].title);

  document.querySelectorAll('#guide-toc .guide-toc-btn')[3].click();
  await wait(40);
  check('içindekiler tıklaması etkin sekmeyi değiştirir',
    document.querySelectorAll('#guide-toc .guide-toc-btn')[3].classList.contains('active'));

  console.log('\nPDF kaydetme');
  document.getElementById('guide-download').click();
  await wait(80);
  check('PDF kaydetme çağrılır', savedPdf === 1);
  check('kaydetme geri bildirimi verilir',
    document.getElementById('guide-download').textContent.indexOf('Kaydedildi') !== -1);

  console.log('\nKapatma');
  document.getElementById('guide-close').click();
  await wait(40);
  check('kapat düğmesi kılavuzu kapatır', modal.classList.contains('hidden'));

  window.YazNotGuide.open({});
  await wait(40);
  check('yeniden açılınca hoş geldin notu gizlenir',
    document.getElementById('guide-welcome').classList.contains('hidden'));

  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(40);
  check('Esc kılavuzu kapatır', modal.classList.contains('hidden'));

  console.log('\nİngilizce kılavuz');
  const enPath = path.join(ROOT, 'ui', 'guide-content.en.js');
  check('İngilizce kılavuz dosyası var', fs.existsSync(enPath));
  if (fs.existsSync(enPath)) {
    const enSrc = fs.readFileSync(enPath, 'utf8');
    check('İngilizce kılavuz aynı bölüm sayısında',
      (enSrc.match(/"id":/g) || []).length === sections.length);
    check('İngilizce kılavuz başlığı doğru', enSrc.indexOf('"title": "User guide"') !== -1);
    check('İngilizce kılavuzda ürün adı korunmuş', enSrc.indexOf('YazNot') !== -1);
  }

  const pdfPath = path.join(ROOT, 'ui', 'yaznot-kullanim-kilavuzu.pdf');
  check('PDF dosyası pakette', fs.existsSync(pdfPath));
  if (fs.existsSync(pdfPath)) {
    const head = fs.readFileSync(pdfPath).slice(0, 5).toString('latin1');
    check('PDF imzası geçerli', head === '%PDF-', head);
    check('PDF makul boyutta', fs.statSync(pdfPath).size > 50000);
  }

  console.log('\nSonuç: ' + (checks - failures) + '/' + checks + ' kontrol geçti');
  dom.window.close();
  process.exit(failures === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('\nTest çöktü:', err);
  process.exit(1);
});
