/**
 * YazNot — Kullanım kılavuzu üreteci
 *
 * Tek kaynak: docs/USER-GUIDE.tr.md
 *   → ui/guide-content.js       (uygulama içi kılavuz; tema duyarlı HTML)
 *   → dist/guide-print.html     (baskıya hazır HTML; PDF için kullanılır)
 *
 * PDF, uygulamanın kendi PDF dışa aktarma hattıyla veya bir tarayıcının
 * "PDF olarak kaydet" özelliğiyle bu HTML'den üretilir. Depodaki
 * docs/YazNot-Kullanim-Kilavuzu.pdf sürümlenmiş çıktıdır.
 *
 * Çalıştırma:  npm run guide
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MD_PATH = path.join(ROOT, 'docs', 'USER-GUIDE.tr.md');
const LOGO = path.join(ROOT, 'ui', 'logo-mark.png');
const GUIDE_JS = path.join(ROOT, 'ui', 'guide-content.js');
const PRINT_HTML = path.join(ROOT, 'dist', 'guide-print.html');

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz',
  'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(text) {
  const map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
  return String(text || '').toLowerCase()
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, function (ch) { return map[ch] || ch; })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'bolum';
}

// ---- Markdown → HTML (uygulamadaki dönüştürücüyle aynı kurallar) ----
function markdownToHtml(md) {
  let src = String(md || '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
  const codeBlocks = [];

  src = src.replace(/```[^\n]*\n([\s\S]*?)```/g, function (_, code) {
    codeBlocks.push('<pre><code>' + escapeHtml(String(code).replace(/\n$/, '')) + '</code></pre>');
    return '\n\u0000CODE' + (codeBlocks.length - 1) + '\u0000\n';
  });

  function inline(text) {
    let s = escapeHtml(text);
    const codes = [];
    s = s.replace(/`([^`]+)`/g, function (_, c) {
      codes.push('<code>' + c + '</code>');
      return '\u0001' + (codes.length - 1) + '\u0001';
    });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, url) {
      if (!/^(https?:\/\/|data:image\/)/i.test(url)) return alt;
      return '<img src="' + url.replace(/"/g, '&quot;') + '" alt="' + alt + '">';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      if (!/^(https?:\/\/|mailto:)/i.test(url)) return label;
      return '<a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    s = s.replace(/\u0001(\d+)\u0001/g, function (_, n) { return codes[parseInt(n, 10)] || ''; });
    return s;
  }

  function isTableSep(line) {
    return line.indexOf('|') !== -1 && /^[\s:|-]+$/.test(line) && line.indexOf('-') !== -1;
  }
  function splitRow(line) {
    return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); });
  }
  function renderTable(head, rows) {
    let html = '<table><thead><tr>';
    head.forEach(function (c) { html += '<th>' + inline(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>';
      head.forEach(function (_, idx) { html += '<td>' + inline(r[idx] || '') + '</td>'; });
      html += '</tr>';
    });
    return html + '</tbody></table>';
  }

  const lines = src.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const codeMatch = /^\u0000CODE(\d+)\u0000$/.exec(line.trim());
    if (codeMatch) { out.push(codeBlocks[parseInt(codeMatch[1], 10)] || ''); i++; continue; }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = Math.min(h[1].length, 3);
      out.push('<h' + lvl + '>' + inline(h[2].replace(/\s+#+\s*$/, '')) + '</h' + lvl + '>');
      i++; continue;
    }
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push('<blockquote>' + quote.map(inline).map(function (t) { return t.trim(); }).join(' ') + '</blockquote>');
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        const m = /^\s*[-*+]\s+(.*)$/.exec(lines[i]);
        if (m) { items.push(m[1]); i++; continue; }
        // Liste maddesinin alt satıra taşan devamı (girintili satır).
        if (items.length && /^\s{2,}\S/.test(lines[i]) &&
          !/^\s*(?:[-*+]\s+|\d+[.)]\s+|#{1,6}\s+|>|```)/.test(lines[i])) {
          items[items.length - 1] += ' ' + lines[i].trim(); i++; continue;
        }
        break;
      }
      out.push('<ul>' + items.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ul>');
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        const m = /^\s*\d+[.)]\s+(.*)$/.exec(lines[i]);
        if (m) { items.push(m[1]); i++; continue; }
        if (items.length && /^\s{2,}\S/.test(lines[i]) &&
          !/^\s*(?:[-*+]\s+|\d+[.)]\s+|#{1,6}\s+|>|```)/.test(lines[i])) {
          items[items.length - 1] += ' ' + lines[i].trim(); i++; continue;
        }
        break;
      }
      out.push('<ol>' + items.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ol>');
      continue;
    }
    if (line.indexOf('|') !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim()) {
        rows.push(splitRow(lines[i])); i++;
      }
      out.push(renderTable(head, rows));
      continue;
    }

    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() &&
      !/^(#{1,6}\s|>|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[i]) &&
      !/^\u0000CODE\d+\u0000$/.test(lines[i].trim()) &&
      !/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(lines[i]) &&
      !(lines[i].indexOf('|') !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
      para.push(lines[i]); i++;
    }
    out.push('<p>' + para.map(inline).map(function (t) { return t.trim(); }).join(' ') + '</p>');
  }
  return out.join('\n');
}

// ---- Markdown belgesini bölümlere ayır ----
function parseGuide(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  let title = 'YazNot — Kullanım Kılavuzu';
  const intro = [];
  const sections = [];
  let current = null;

  lines.forEach(function (line) {
    const h1 = /^#\s+(.*)$/.exec(line);
    if (h1) { title = h1[1].trim(); return; }
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      if (current) sections.push(current);
      current = { title: h2[1].trim(), lines: [] };
      return;
    }
    if (current) current.lines.push(line);
    else intro.push(line);
  });
  if (current) sections.push(current);

  function cleanHtml(html) {
    return html.replace(/^(\s*<hr>\s*)+/g, '').replace(/(\s*<hr>\s*)+$/g, '').trim();
  }

  const introHtml = cleanHtml(markdownToHtml(intro.join('\n')));
  const used = {};
  const parsed = [];
  if (introHtml) {
    parsed.push({ id: 'hos-geldin', title: 'Hoş geldin', html: introHtml });
  }
  sections.forEach(function (sec) {
    const html = cleanHtml(markdownToHtml(sec.lines.join('\n')));
    if (!html) return;
    let id = slugify(sec.title);
    if (used[id]) {
      used[id] += 1;
      id += '-' + used[id];
    } else {
      used[id] = 1;
    }
    parsed.push({ id: id, title: sec.title, html: html });
  });
  return { title: title, sections: parsed };
}

function buildGuideJs(guide, updated) {
  const payload = {
    version: '1.0',
    updated: updated,
    title: 'Kullanım kılavuzu',
    subtitle: 'YazNot 1.0 · her şeyi adım adım anlatır',
    pdf: 'yaznot-kullanim-kilavuzu.pdf',
    sections: guide.sections
  };
  return '/* ÜRETİLMİŞ DOSYA — elle düzenlemeyin. Kaynak: docs/USER-GUIDE.tr.md (npm run guide) */\n' +
    'window.YAZNOT_GUIDE = ' + JSON.stringify(payload, null, 2) + ';\n';
}

function buildPrintHtml(guide, updated) {
  const logoUrl = pathToFileURL(LOGO).href;
  const toc = guide.sections.map(function (s, i) {
    return '<li><span class="toc-num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="toc-title">' + escapeHtml(s.title) + '</span></li>';
  }).join('');

  const body = guide.sections.map(function (s, i) {
    return '<section class="chapter' + (i === 0 ? ' first' : '') + '">' +
      '<h2><span class="chapter-num">' + String(i + 1).padStart(2, '0') + '</span>' +
      escapeHtml(s.title) + '</h2>' + s.html + '</section>';
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<title>YazNot 1.0 — Kullanım Kılavuzu</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fbf8f2; }
  body {
    font-family: "Segoe UI", "Segoe UI Variable Text", Arial, sans-serif;
    color: #26231e; background: #fff; font-size: 10.5pt; line-height: 1.68;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page-pad { padding: 0 17mm; }
  /* ---- Kapak ---- */
  .cover {
    height: 276mm; padding: 28mm 20mm 15mm;
    display: flex; flex-direction: column; justify-content: space-between;
    background: #faf6ee;
    page-break-after: always;
  }
  .cover-top { display: flex; align-items: center; gap: 12px; }
  .cover-mark { width: 46px; height: 46px; }
  .cover-brand { font-size: 12pt; font-weight: 700; letter-spacing: 0.02em; color: #26231e; }
  .cover-brand small { display: block; font-size: 8pt; font-weight: 600; letter-spacing: 0.16em; color: #b9a88f; text-transform: uppercase; margin-top: 2px; }
  .cover-main { margin-top: 54mm; }
  .cover h1 {
    margin: 0; font-size: 40pt; line-height: 1.02; letter-spacing: -0.035em;
    color: #17140f; font-weight: 750;
  }
  .cover h1 span { color: #e2601f; }
  .cover-sub { margin: 12px 0 0; font-size: 17pt; font-weight: 400; color: #6f675b; letter-spacing: -0.01em; }
  .cover-rule { width: 52px; height: 3px; background: #e2601f; margin: 22px 0; border-radius: 2px; }
  .cover-desc { max-width: 112mm; color: #5c554a; font-size: 10pt; line-height: 1.7; margin: 0; }
  .cover-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; color: #8d8375; font-size: 8.5pt; }
  .cover-badge {
    display: inline-block; padding: 3px 9px; border-radius: 999px;
    background: #f1e2d2; color: #b34f17; font-weight: 700; font-size: 8.5pt;
    letter-spacing: 0.06em;
  }
  /* ---- İçindekiler ---- */
  .toc-page { page-break-after: always; padding: 24mm 20mm 0; }
  .toc-page h2 { margin: 0 0 4mm; font-size: 19pt; letter-spacing: -0.02em; color: #17140f; }
  .toc-page .toc-intro { color: #7b7265; font-size: 9.5pt; margin: 0 0 9mm; }
  .toc { list-style: none; margin: 0; padding: 0; }
  .toc li { display: flex; align-items: baseline; gap: 10px; padding: 4.4mm 0; border-bottom: 1px solid #eee7da; }
  .toc-num { width: 24px; color: #e2601f; font-weight: 700; font-size: 9pt; letter-spacing: 0.02em; }
  .toc-title { font-size: 11pt; color: #2c2822; }
  /* ---- İçerik ---- */
  .chapter { padding: 11mm 20mm 1mm; page-break-inside: auto; }
  .chapter.first { padding-top: 12mm; }
  .chapter + .chapter { padding-top: 11mm; }
  .chapter h2 {
    display: flex; align-items: baseline; gap: 9px;
    margin: 0 0 5mm; font-size: 17pt; line-height: 1.22; letter-spacing: -0.025em;
    color: #17140f; font-weight: 720; page-break-after: avoid;
  }
  .chapter-num { color: #e2601f; font-size: 9pt; font-weight: 700; letter-spacing: 0.04em; }
  .chapter h3 { margin: 7mm 0 2mm; font-size: 11.5pt; color: #211d17; page-break-after: avoid; }
  p { margin: 0 0 3.2mm; }
  ul, ol { margin: 0 0 4mm; padding-left: 6mm; }
  li { margin: 0 0 1.4mm; break-inside: avoid; }
  li::marker { color: #e2601f; }
  strong { color: #17140f; font-weight: 650; }
  a { color: #b34f17; text-decoration: none; }
  code { font-family: "Cascadia Mono", Consolas, monospace; font-size: 9pt; background: #f5f1e9; border-radius: 3px; padding: 0.5mm 1mm; }
  pre { background: #f7f3eb; border: 1px solid #e9e0d2; border-radius: 3mm; padding: 3mm 4mm; overflow: hidden; page-break-inside: avoid; }
  pre code { background: transparent; padding: 0; }
  blockquote { margin: 4mm 0; padding: 2mm 0 2mm 4mm; border-left: 2px solid #e2601f; color: #6a6156; font-style: italic; }
  hr { border: 0; border-top: 1px solid #eee7da; margin: 6mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 3mm 0 5mm; page-break-inside: avoid; font-size: 9.5pt; }
  th, td { border: 1px solid #e6ddce; padding: 2mm 2.6mm; text-align: left; vertical-align: top; }
  th { background: #f7f2e8; color: #26231e; font-weight: 650; }
  img { max-width: 100%; }
  .cover, .toc-page { break-inside: avoid-page; }
  .chapter p, .chapter li { orphans: 2; widows: 2; }
</style></head>
<body>
  <section class="cover">
    <div class="cover-top">
      <img class="cover-mark" src="${logoUrl}" alt="">
      <div class="cover-brand">YazNot<small>Not alma defterin</small></div>
    </div>
    <div class="cover-main">
      <h1>Yaz<span>Not</span> 1.0</h1>
      <p class="cover-sub">Kullanım Kılavuzu</p>
      <div class="cover-rule"></div>
      <p class="cover-desc">Bölümler, notlar, sesten metne, arama, okuma ve paylaşım.
        Bu kılavuz; YazNot'u ilk kez açan herkesin aradığı her şeyi tek yerde toplar.</p>
    </div>
    <div class="cover-bottom">
      <span>${updated}</span>
      <span class="cover-badge">SÜRÜM 1.0</span>
    </div>
  </section>

  <section class="toc-page">
    <h2>İçindekiler</h2>
    <p class="toc-intro">Kılavuzun tamamı uygulamanın içinde de okunabilir; sağ alttaki ? düğmesine bak.</p>
    <ol class="toc">${toc}</ol>
  </section>

  ${body}
</body></html>`;
}

function writeOutputs(guide, updated) {
  fs.mkdirSync(path.dirname(PRINT_HTML), { recursive: true });
  fs.writeFileSync(GUIDE_JS, buildGuideJs(guide, updated), 'utf8');
  fs.writeFileSync(PRINT_HTML, buildPrintHtml(guide, updated), 'utf8');
  console.log('  guide-content.js : ' + guide.sections.length + ' bölüm');
  console.log('  baskı HTML       : ' + path.relative(ROOT, PRINT_HTML));
}

const md = fs.readFileSync(MD_PATH, 'utf8');
const guide = parseGuide(md);
const now = new Date();
const updated = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
writeOutputs(guide, updated);
console.log('Kılavuz üretildi (' + updated + ').');
