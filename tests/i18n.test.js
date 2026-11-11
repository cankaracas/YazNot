/**
 * YazNot — dil katmanı testi
 *
 * Arayüzün İngilizceye geçtiğini, kullanıcı içeriğine dokunmadığını ve
 * placeholder gibi öznitelikleri çevirdiğini denetler.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const I18N = fs.readFileSync(path.join(ROOT, 'ui', 'i18n.js'), 'utf8');

let checks = 0;
let failures = 0;
function check(name, condition, extra) {
  checks++;
  if (condition) console.log('  ✔ ' + name);
  else {
    failures++;
    console.log('  ✘ ' + name + (extra ? '  → ' + extra : ''));
  }
}

const dom = new JSDOM(`<!doctype html><html lang="tr"><body>
  <div id="nav">Bölümler</div>
  <div class="note-title">Bölüm</div>
  <input id="search" placeholder="Ara...">
  <button id="new" title="Yeni öğe">Yeni öğe</button>
</body></html>`, {
  url: 'https://yaznot.test/',
  runScripts: 'outside-only'
});
const { window } = dom;
window.localStorage.setItem('yaznot_lang', 'en');
window.eval(I18N);
if (window.document.readyState === 'loading') {
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
}
window.YazNotI18n.apply();

console.log('Dil katmanı');
check('html lang en olur', window.document.documentElement.lang === 'en');
check('bilinen arayüz metni çevrilir',
  window.document.getElementById('nav').textContent === 'Sections');
check('kullanıcı içeriği korunur',
  window.document.querySelector('.note-title').textContent === 'Bölüm');
check('placeholder çevrilir',
  window.document.getElementById('search').getAttribute('placeholder') === 'Search...');
check('title özniteliği çevrilir',
  window.document.getElementById('new').getAttribute('title') === 'New item');
check('t() bilinen metni çevirir', window.YazNotI18n.t('Bölüm') === 'Section');
check('locale en-US olur', window.YazNotI18n.locale() === 'en-US');
check('bilinmeyen metin aynı kalır', window.YazNotI18n.t('Özel notum') === 'Özel notum');

console.log('\nSonuç: ' + (checks - failures) + '/' + checks + ' kontrol geçti');
process.exit(failures === 0 ? 0 : 1);
