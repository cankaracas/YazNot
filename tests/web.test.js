/**
 * YazNot — web/PWA paket testi
 *
 * Tarayıcı açmadan dist/pwa çıktısının bütünlüğünü ve iOS yerleşim kurallarını denetler:
 * güvenli alan (çentik) değişkenleri, viewport ayarları, manifest, service worker
 * önbelleği ve ui → dist/pwa üretiminin güncelliği.
 *
 * Çalıştırma:  npm test
 */
const fs = require('fs');
const path = require('path');
const { computeCacheName } = require('../scripts/lib/cache.cjs');

const ROOT = path.join(__dirname, '..');
const PWA = path.join(ROOT, 'dist', 'pwa');
const UI = path.join(ROOT, 'ui');

let failures = 0;
let checks = 0;
function check(name, cond, extra) {
  checks++;
  if (cond) {
    console.log('  ✔ ' + name);
  } else {
    failures++;
    console.log('  ✘ ' + name + (extra ? '  → ' + extra : ''));
  }
}
function read(p) { return fs.readFileSync(p, 'utf8'); }
function exists(p) { return fs.existsSync(p); }

console.log('\nWeb paketi (dist/pwa)');
['index.html', 'style.css', 'app.js', 'cloud-api.js', 'platform.js', 'auth.js', 'config.js',
 'guide.js', 'guide-content.js', 'yaznot-kullanim-kilavuzu.pdf',
 'manifest.json', 'service-worker.js', 'icon-192.png', 'icon-512.png',
 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'logo-mark.png'].forEach(function (f) {
  check('dosya var: ' + f, exists(path.join(PWA, f)));
});

const html = read(path.join(PWA, 'index.html'));
const css = read(path.join(PWA, 'style.css'));
const manifest = JSON.parse(read(path.join(PWA, 'manifest.json')));
const sw = read(path.join(PWA, 'service-worker.js'));

console.log('\niOS / güvenli alan');
check('viewport-fit=cover tanımlı', html.indexOf('viewport-fit=cover') !== -1);
check('durum çubuğu black-translucent', html.indexOf('black-translucent') !== -1);
check('apple-mobile-web-app-capable', html.indexOf('apple-mobile-web-app-capable') !== -1);
check('telefon numarası otomatik linklenmez', html.indexOf('telephone=no') !== -1);
check('güvenli alan değişkenleri tanımlı', css.indexOf('--safe-top: env(safe-area-inset-top') !== -1);
check('üst bar çentiği hesaba katar', css.indexOf('var(--safe-top)') !== -1);
check('alt bar çentiği hesaba katar', css.indexOf('var(--safe-bottom)') !== -1);
check('yükseklik 100dvh ile hesaplanır', css.indexOf('100dvh') !== -1);
check('yatay modda da mobil düzen uygulanır',
  css.indexOf('(max-height: 520px) and (orientation: landscape)') !== -1);
check('yatay mod güvenli alanları (sol/sağ) kullanılır', css.indexOf('var(--safe-left)') !== -1 && css.indexOf('var(--safe-right)') !== -1);
check('okuyucu barı kaydırınca gizlenir', css.indexOf('.reader-bar-hidden') !== -1);
check('editör başlığı kaydırınca küçülür', css.indexOf('body.editor-compact') !== -1);
check('çekmece sürükleme durumu var', css.indexOf('sidebar-dragging') !== -1);
check('grup görünümünde menü düğmesi gizlenir', css.indexOf('body.view-group .sidebar-reveal') !== -1);
check('okuma ilerleme çubuğu HTML içinde', html.indexOf('reader-progress-bar') !== -1);

console.log('\nEditör yapışkan araç çubuğu');
check('başlık + araç çubuğu yapışkan şeritte',
  /class="editor-sticky"[\s\S]*?id="editor-toolbar"/.test(html));
check('araç çubuğu editör gövdesinden ayrıldı',
  html.indexOf('id="editor-toolbar"') !== -1 &&
  html.indexOf('id="editor-toolbar"') < html.indexOf('class="editor-body"') &&
  html.indexOf('id="editor-content"') > html.indexOf('class="editor-body"'));
check('yapışkan şerit CSS kuralı var',
  /\.editor-sticky\s*\{[^}]*position:\s*sticky/.test(css));
check('mobilde şerit başlığın üstünde kalır', css.indexOf('.editor-sticky { z-index: 12; }') !== -1);
check('açık temada yapışkan şerit arka planı var',
  css.indexOf('body.theme-light .editor-sticky') !== -1);
check('mobil araç çubuğu yatay kaydırılabilir',
  /\.editor-toolbar\s*\{[^}]*overflow-x:\s*auto/.test(css));

console.log('\nManifest');
check('display standalone', manifest.display === 'standalone');
check('orientation any (yatay kullanım serbest)', manifest.orientation === 'any');
check('start_url tanımlı', typeof manifest.start_url === 'string');
check('192 ikonu var', (manifest.icons || []).some(function (i) { return i.sizes === '192x192'; }));
check('512 ikonu var', (manifest.icons || []).some(function (i) { return i.sizes === '512x512'; }));
check('maskable ikon var', (manifest.icons || []).some(function (i) { return i.purpose === 'maskable'; }));
check('maskable ikon dosyası var', (manifest.icons || []).filter(function (i) { return i.purpose === 'maskable'; })
  .every(function (i) { return exists(path.join(PWA, i.src)); }));

console.log('\nVarlık referansları');
const refs = [];
const re = /(?:src|href)="([^"]+)"/g;
let m;
while ((m = re.exec(html)) !== null) {
  const url = m[1];
  if (/^(https?:|data:|#|mailto:)/i.test(url)) continue;
  refs.push(url.replace(/^\.\//, ''));
}
const missingRefs = refs.filter(function (r) { return !exists(path.join(PWA, r)); });
check('tüm yerel dosya referansları mevcut', missingRefs.length === 0, missingRefs.join(', '));

const ids = [];
const idRe = /\sid="([^"]+)"/g;
while ((m = idRe.exec(html)) !== null) ids.push(m[1]);
const dupes = ids.filter(function (id, i) { return ids.indexOf(id) !== i; });
check('tekrarlanan id yok', dupes.length === 0, Array.from(new Set(dupes)).join(', '));

console.log('\nService worker');
const assets = [];
const assetRe = /'\.\/([^']+)'/g;
while ((m = assetRe.exec(sw)) !== null) assets.push(m[1]);
const missingAssets = assets.filter(function (a) { return a && !exists(path.join(PWA, a)); });
check('önbellek listesindeki dosyalar mevcut', missingAssets.length === 0, missingAssets.join(', '));
check('index.html önbellekte', assets.indexOf('index.html') !== -1);
check('app.js önbellekte', assets.indexOf('app.js') !== -1);
check('service worker kaydı yapılır',
  read(path.join(PWA, 'app.js')).indexOf('serviceWorker.register') !== -1);
check('kurulum tek dosya hatasında durmaz', sw.indexOf('cache.add(url).catch') !== -1);
check('çevrimdışı yedek yalnızca gezinmede HTML döner',
  sw.indexOf("event.request.mode === 'navigate'") !== -1);

const cacheName = (sw.match(/var CACHE_NAME = '([^']+)';/) || [])[1];
const expected = computeCacheName(PWA);
check('önbellek sürümü içerikle eşleşir', cacheName === expected, cacheName + ' ≠ ' + expected);
check('ses modeli önbelleği korunur', sw.indexOf("k.indexOf('yaznot-stt-')") !== -1);
check('stt/app.js önbellekte', assets.indexOf('stt/stt-app.js') !== -1);
check('stt/ds-core.js önbellekte', assets.indexOf('stt/ds-core.js') !== -1);
check('kılavuz PDF önbellekte', assets.indexOf('yaznot-kullanim-kilavuzu.pdf') !== -1);
check('kılavuz betiği önbellekte', assets.indexOf('guide.js') !== -1 && assets.indexOf('guide-content.js') !== -1);

console.log('\nKullanım kılavuzu');
check('kılavuz penceresi HTML içinde', html.indexOf('id="guide-modal"') !== -1 && html.indexOf('id="guide-body"') !== -1);
check('kılavuz küçük düğmesi HTML içinde', html.indexOf('id="guide-fab"') !== -1);
check('kılavuz içeriği üretilmiş', read(path.join(PWA, 'guide-content.js')).indexOf('window.YAZNOT_GUIDE') !== -1);
check('kılavuz bölümleri dolu', (read(path.join(PWA, 'guide-content.js')).match(/"id":/g) || []).length >= 8);
check('PDF indirme köprüsü var', read(path.join(PWA, 'cloud-api.js')).indexOf('saveGuidePdf') !== -1);

console.log('\nMasaüstü köprüsü');
check('köprü betiği pakette', exists(path.join(PWA, 'platform.js')));
check('köprü tarayıcıda boş kalır', read(path.join(PWA, 'platform.js')).indexOf('window.yaznotNative = null') !== -1);
check('köprü adı platformdan bağımsız', read(path.join(PWA, 'cloud-api.js')).indexOf('yaznotNative') !== -1);
check('platform değeri desktop', read(path.join(PWA, 'cloud-api.js')).indexOf("'desktop'") !== -1);

console.log('\nMasaüstü ile senkron');
['app.js', 'cloud-api.js', 'auth.js', 'config.js', 'guide.js', 'guide-content.js'].forEach(function (f) {
  check(f + ' güncel', read(path.join(PWA, f)) === read(path.join(UI, f)));
});
['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'logo-mark.png'].forEach(function (f) {
  check(f + ' güncel', fs.readFileSync(path.join(PWA, f)).equals(fs.readFileSync(path.join(UI, f))));
});
check('kılavuz PDF güncel', fs.readFileSync(path.join(PWA, 'yaznot-kullanim-kilavuzu.pdf'))
  .equals(fs.readFileSync(path.join(UI, 'yaznot-kullanim-kilavuzu.pdf'))));
['stt-app.js', 'ds-core.js', 'ds-worker.js'].forEach(function (f) {
  check('stt/' + f + ' güncel', read(path.join(PWA, 'stt', f)) === read(path.join(UI, 'stt', f)));
});
check('ORT wasm web paketinde', exists(path.join(PWA, 'stt', 'ort-wasm-simd-threaded.wasm')));
check('web ek stiller style.css içinde', css.indexOf('MOBİL / PWA EK STİLLERİ') !== -1);
check('web <head> etiketleri index.html içinde', html.indexOf('apple-touch-icon') !== -1);

console.log('\nSonuç: ' + (checks - failures) + '/' + checks + ' kontrol geçti');
process.exit(failures === 0 ? 0 : 1);
