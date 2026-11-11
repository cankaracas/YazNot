/**
 * YazNot — Vercel yayın klasörü
 *
 * `vercel/` klasörü Vercel Drop'a olduğu gibi bırakılabilecek tek klasördür:
 *
 *   vercel/
 *     index.html, style.css, ...     landing (kaynak; elle düzenlenir)
 *     manifest.json                  kök manifest: start_url "app/"
 *     vercel.json                    önbellek / MIME ayarları
 *     kilavuz.pdf                    kullanım kılavuzu
 *     YazNot-Setup-<sürüm>.exe       Windows kurulumu (paket çıktısından)
 *     app/                           PWA'nın tamamı (dist/pwa üretiminden)
 *
 * Çalıştırma:  npm run build:vercel
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWeb } from './build-web.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'vercel');
const APP = path.join(OUT, 'app');
const PWA = path.join(ROOT, 'dist', 'pwa');
const BUNDLE = path.join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'nsis');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const installerName = 'YazNot-Setup-' + pkg.version + '.exe';

function fail(message) {
  console.error('HATA: ' + message);
  process.exit(1);
}

if (!fs.existsSync(path.join(OUT, 'index.html'))) {
  fail('vercel/index.html bulunamadı; landing kaynağı eksik.');
}

buildWeb();

fs.rmSync(APP, { recursive: true, force: true });
fs.mkdirSync(APP, { recursive: true });
fs.cpSync(PWA, APP, { recursive: true });

fs.copyFileSync(
  path.join(ROOT, 'docs', 'YazNot-Kullanim-Kilavuzu.pdf'),
  path.join(OUT, 'kilavuz.pdf')
);
fs.copyFileSync(
  path.join(ROOT, 'docs', 'YazNot-User-Guide.pdf'),
  path.join(OUT, 'kilavuz-en.pdf')
);

// Tanıtım videosu: kökteki master varsa kopyala; yoksa üretilmiş dosyayı koru.
const media = [
  ['YazNot-Tanitim.mp4', 'tanitim.mp4'],
  ['YazNot-Tanitim-Kapak.png', 'tanitim-kapak.png'],
  ['docs/media/YazNot-Tanitim.mp4', 'tanitim.mp4'],
  ['docs/media/YazNot-Tanitim-Kapak.png', 'tanitim-kapak.png'],
  ['docs/media/YazNot-Tanitim-EN.mp4', 'tanitim-en.mp4'],
  ['docs/media/YazNot-Tanitim-EN-Kapak.png', 'tanitim-en-kapak.png']
];
const copied = new Set();
for (const [srcName, destName] of media) {
  const src = path.join(ROOT, srcName);
  const dest = path.join(OUT, destName);
  if (copied.has(destName)) continue;
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    copied.add(destName);
  }
}
for (const destName of ['tanitim.mp4', 'tanitim-kapak.png', 'tanitim-en.mp4', 'tanitim-en-kapak.png']) {
  if (!copied.has(destName) && !fs.existsSync(path.join(OUT, destName))) {
    console.warn('UYARI: ' + destName + ' bulunamadı; site video olmadan üretildi.');
  }
}

// Yeni kurulum paketi varsa eskisini değiştir; yoksa mevcut dosyayı koru.
let installer = null;
if (fs.existsSync(BUNDLE)) {
  const candidates = fs
    .readdirSync(BUNDLE)
    .filter((name) => name.toLowerCase().endsWith('.exe'))
    .map((name) => path.join(BUNDLE, name));
  if (candidates.length > 0) {
    installer = candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  }
}

if (installer) {
  for (const name of fs.readdirSync(OUT)) {
    if (/^YazNot-Setup-.*\.exe$/i.test(name)) {
      fs.rmSync(path.join(OUT, name), { force: true });
    }
  }
  fs.copyFileSync(installer, path.join(OUT, installerName));
} else if (fs.existsSync(path.join(OUT, installerName))) {
  installer = path.join(OUT, installerName);
  console.log('  kurulum   : mevcut dosya korundu');
} else {
  console.warn('UYARI: kurulum dosyası bulunamadı (önce `npm run build`). Site kurulumsuz üretildi.');
}

function totalSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? totalSize(full) : fs.statSync(full).size;
  }
  return total;
}

console.log('YazNot Vercel klasörü hazır');
console.log('  klasör    : ' + path.relative(ROOT, OUT));
console.log('  kurulum   : ' + (installer ? installerName + ' (' + (fs.statSync(path.join(OUT, installerName)).size / 1e6).toFixed(1) + ' MB)' : 'yok'));
console.log('  toplam    : ' + (totalSize(OUT) / 1e6).toFixed(1) + ' MB');
