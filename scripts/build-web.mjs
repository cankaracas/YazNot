/**
 * YazNot — PWA üretimi
 *
 * Tek kaynak `ui/` klasörüdür. Masaüstü kabuğu bu klasörü doğrudan kullanır;
 * tarayıcı sürümü için `dist/pwa/` üretilir:
 *
 *   ui/index.html + web/head.fragment.html  → dist/pwa/index.html
 *   ui/style.css  + web/mobile.css          → dist/pwa/style.css
 *   web/manifest.json, web/service-worker.js
 *
 * Çalıştırma:  npm run web
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cache from './lib/cache.cjs';

const { computeCacheName } = cache;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI = path.join(ROOT, 'ui');
const WEB = path.join(ROOT, 'web');
const OUT = path.join(ROOT, 'dist', 'pwa');

const BANNER_HTML =
  '<!-- ÜRETİLMİŞ DOSYA — elle düzenlemeyin. Kaynak: ui/index.html + web/head.fragment.html (npm run web) -->\n';
const BANNER_CSS =
  '/* ÜRETİLMİŞ DOSYA — elle düzenlemeyin. Kaynak: ui/style.css + web/mobile.css (npm run web) */\n\n';

const skipped = new Set(['print.html']);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, body) {
  fs.writeFileSync(file, body, 'utf8');
}

function copyTree(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

export function buildWeb() {
  fs.rmSync(OUT, { recursive: true, force: true });
  copyTree(UI, OUT);

  const head = read(path.join(WEB, 'head.fragment.html')).trim();
  let html = read(path.join(UI, 'index.html'));
  html = html.replace('<title>YazNot</title>', '<title>YazNot</title>\n' + head);
  write(path.join(OUT, 'index.html'), BANNER_HTML + html);

  const baseCss = read(path.join(UI, 'style.css'));
  const extraCss = read(path.join(WEB, 'mobile.css'));
  write(path.join(OUT, 'style.css'), BANNER_CSS + baseCss + '\n\n' + extraCss);

  fs.copyFileSync(path.join(WEB, 'manifest.json'), path.join(OUT, 'manifest.json'));

  const cacheName = computeCacheName(OUT);
  const template = read(path.join(WEB, 'service-worker.js'));
  write(
    path.join(OUT, 'service-worker.js'),
    template.replace(/var CACHE_NAME = '[^']*';/, `var CACHE_NAME = '${cacheName}';`)
  );

  return { out: OUT, cacheName };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = buildWeb();
  console.log('YazNot PWA üretildi');
  console.log('  klasör       : ' + path.relative(ROOT, result.out));
  console.log('  önbellek     : ' + result.cacheName);
  console.log('  kılavuz PDF  : ' + (fs.existsSync(path.join(result.out, 'yaznot-kullanim-kilavuzu.pdf')) ? 'var' : 'YOK'));
  console.log('  ses motoru   : ' + (fs.existsSync(path.join(result.out, 'stt', 'ort-wasm-simd-threaded.wasm')) ? 'var' : 'YOK'));
}
