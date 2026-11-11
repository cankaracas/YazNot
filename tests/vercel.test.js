/**
 * YazNot — Vercel sitesi testi
 *
 * `vercel/` klasörünün Vercel Drop'a hazır olduğunu denetler:
 *   • landing sayfası (PWA / Windows / kılavuz düğmeleri)
 *   • PWA'nın /app/ altında eksiksiz kopyası
 *   • kurulduğunda landing yerine uygulamanın açılması (manifest + redirect)
 *   • PDF, kurulum dosyası, service worker ve varlık referansları
 *
 * Çalıştırma:  npm test  (önce `npm run build:vercel`)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'vercel');
const PWA = path.join(ROOT, 'dist', 'pwa');
const APP = path.join(SITE, 'app');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const installerName = 'YazNot-Setup-' + pkg.version + '.exe';

let failures = 0;
let checks = 0;
function check(name, cond, extra) {
  checks++;
  if (cond) console.log('  ✔ ' + name);
  else { failures++; console.log('  ✘ ' + name + (extra ? '  → ' + extra : '')); }
}
function read(p) { return fs.readFileSync(p, 'utf8'); }
function exists(p) { return fs.existsSync(p); }
function dirSize(dir) {
  if (!exists(dir)) return 0;
  let total = 0;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  });
  return total;
}
function refsOf(html) {
  const refs = [];
  const re = /(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (/^(https?:|data:|#|mailto:)/i.test(url)) continue;
    refs.push(url);
  }
  return refs;
}

console.log('Vercel klasörü');
['index.html', 'style.css', 'manifest.json', 'vercel.json', 'kilavuz.pdf',
 'app-shot.png', 'logo-mark.png'].forEach(function (f) {
  check('dosya var: ' + f, exists(path.join(SITE, f)));
});

const html = read(path.join(SITE, 'index.html'));
const css = read(path.join(SITE, 'style.css'));
const rootManifest = JSON.parse(read(path.join(SITE, 'manifest.json')));
const vercel = JSON.parse(read(path.join(SITE, 'vercel.json')));

console.log('\nLanding');
check('PWA düğmesi /app/ adresine gider', (html.match(/href="app\/"/g) || []).length >= 3);
check('Windows kurulum bağlantısı doğru', html.indexOf(installerName) !== -1);
check('kılavuz PDF bağlantısı var', html.indexOf('href="kilavuz.pdf"') !== -1);
check('kılavuz PDF gömülü', html.indexOf('<object class="pdf-frame"') !== -1);
check('manifest bağlantısı var', html.indexOf('rel="manifest"') !== -1);
check('ana ekrana ekleme adımları var', html.indexOf('Ana Ekrana Ekle') !== -1);
check('Android yükleme adımı var', html.indexOf('Uygulamayı yükle') !== -1);
check('kurulduğunda landing açılmaz açıklaması var',
  html.indexOf('bu indirme sayfası bir daha görünmez') !== -1);
check('standalone modda uygulamaya yönlendirme var',
  html.indexOf('display-mode: standalone') !== -1 && html.indexOf("location.replace('app/')") !== -1);
check('OAuth dönüşünde uygulamaya yönlendirme var',
  html.indexOf('access_token=') !== -1 && html.indexOf("location.replace('app/' + query + hash)") !== -1);
check('landing stili yeni tasarımla aynı', css.indexOf('--bg: #0d0e11') !== -1);
check('respond düzeni var', css.indexOf('@media (max-width: 720px)') !== -1);

console.log('\nKök manifest (kurulan kısayol)');
check('start_url app/', rootManifest.start_url === 'app/');
check('scope site kökü', rootManifest.scope === './');
check('standalone', rootManifest.display === 'standalone');
check('maskable ikon var', (rootManifest.icons || []).some(function (i) { return i.purpose === 'maskable'; }));
check('manifest ikonları mevcut', (rootManifest.icons || []).every(function (i) {
  return exists(path.join(SITE, i.src));
}));

console.log('\nPWA (/app/)');
['index.html', 'app.js', 'style.css', 'manifest.json', 'service-worker.js',
 'guide.js', 'guide-content.js', 'yaznot-kullanim-kilavuzu.pdf',
 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
 'stt/stt-app.js', 'stt/ds-core.js', 'stt/ort-wasm-simd-threaded.wasm'].forEach(function (f) {
  check('app dosyası var: ' + f, exists(path.join(APP, f)));
});

const appHtml = read(path.join(APP, 'index.html'));
const appManifest = JSON.parse(read(path.join(APP, 'manifest.json')));
const sw = read(path.join(APP, 'service-worker.js'));

check('app start_url ./ (kurulumda /app/ açılır)', appManifest.start_url === './');
check('app scope ./', appManifest.scope === './');
check('app id tanımlı', appManifest.id === './');
check('app manifest ikonları mevcut', (appManifest.icons || []).every(function (i) {
  return exists(path.join(APP, i.src));
}));
check('app service worker var', sw.indexOf('CACHE_NAME') !== -1);
check('app service worker kılavuzu önbelleğe alır', sw.indexOf('yaznot-kullanim-kilavuzu.pdf') !== -1);
check('app service worker STT çekirdeğini önbelleğe alır', sw.indexOf('stt/ds-core.js') !== -1);
check('app kılavuz PDF uygulamada', exists(path.join(APP, 'yaznot-kullanim-kilavuzu.pdf')));
check('app dosyaları PWA üretimiyle aynı', read(path.join(APP, 'app.js')) === read(path.join(PWA, 'app.js')));
check('app stili PWA ile aynı', read(path.join(APP, 'style.css')) === read(path.join(PWA, 'style.css')));
check('app HTML PWA ile aynı', appHtml === read(path.join(PWA, 'index.html')));

console.log('\nVarlık ve boyut');
const landingRefs = refsOf(html).filter(function (r) {
  return r !== 'app/' && !/^YazNot-Setup-.*\.exe$/i.test(r);
});
const missingLanding = landingRefs.filter(function (r) { return !exists(path.join(SITE, r)); });
check('landing yerel referansları mevcut', missingLanding.length === 0, missingLanding.join(', '));
check('app/ klasörü var', exists(APP) && fs.statSync(APP).isDirectory());
if (exists(path.join(SITE, installerName))) {
  check('kurulum dosyası var', true);
  const mb = fs.statSync(path.join(SITE, installerName)).size / 1e6;
  check('kurulum boyutu hedefin altında (<25 MB)', mb < 25, mb.toFixed(1) + ' MB');
} else {
  console.log('  · kurulum dosyası atlandı (önce npm run build)');
}
check('kılavuz PDF docs ile aynı', exists(path.join(SITE, 'kilavuz.pdf')) &&
  fs.readFileSync(path.join(SITE, 'kilavuz.pdf')).equals(
    fs.readFileSync(path.join(ROOT, 'docs', 'YazNot-Kullanim-Kilavuzu.pdf'))));

const appRefs = refsOf(appHtml);
const missingApp = appRefs.filter(function (r) { return !exists(path.join(APP, r)); });
check('app yerel referansları mevcut', missingApp.length === 0, missingApp.join(', '));

check('vercel.json service worker başlığı içerir',
  JSON.stringify(vercel).indexOf('Service-Worker-Allowed') !== -1);
check('vercel.json trailingSlash', vercel.trailingSlash === true);

const total = dirSize(SITE);
check('Vercel 100 MB sınırının altında', total < 100e6,
  (total / 1e6).toFixed(1) + ' MB');

console.log('\nSonuç: ' + (checks - failures) + '/' + checks + ' kontrol geçti' +
  ' · site ' + (total / 1e6).toFixed(1) + ' MB');
process.exit(failures === 0 ? 0 : 1);
