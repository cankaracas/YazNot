/**
 * YazNot — user guide generator
 *
 * One source per language:
 *   docs/USER-GUIDE.tr.md → ui/guide-content.js + dist/guide-print.html
 *   docs/USER-GUIDE.md    → ui/guide-content.en.js + dist/guide-print-en.html
 *
 * The print HTML is used to make the two PDFs that ship in the app and on the
 * site. Run `npm run guide`; the PDFs are generated from the print pages as a
 * release step.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = path.join(ROOT, 'ui', 'logo-mark.png');

const CONFIGS = [
  {
    lang: 'tr',
    markdown: path.join(ROOT, 'docs', 'USER-GUIDE.tr.md'),
    sourceLabel: 'docs/USER-GUIDE.tr.md',
    js: path.join(ROOT, 'ui', 'guide-content.js'),
    global: 'YAZNOT_GUIDE',
    print: path.join(ROOT, 'dist', 'guide-print.html'),
    title: 'Kullanım kılavuzu',
    subtitle: 'YazNot 1.0 · kısa ve net',
    pdf: 'yaznot-kullanim-kilavuzu.pdf',
    docTitle: 'YazNot 1.0 — Kullanım Kılavuzu',
    coverTagline: 'Not alma defterin',
    coverSub: 'Kullanım Kılavuzu',
    coverDesc: 'Bölümler, notlar, sesten metne, arama, okuma ve paylaşım. İlk nottan yedeğe kadar ihtiyacın olan her şey, kısa ve net.',
    tocTitle: 'İçindekiler',
    tocIntro: 'Kılavuzun tamamı uygulamanın içinde de okunur; sağ alttaki ? düğmesine bak.',
    introTitle: 'Hoş geldin'
  },
  {
    lang: 'en',
    markdown: path.join(ROOT, 'docs', 'USER-GUIDE.md'),
    sourceLabel: 'docs/USER-GUIDE.md',
    js: path.join(ROOT, 'ui', 'guide-content.en.js'),
    global: 'YAZNOT_GUIDE_EN',
    print: path.join(ROOT, 'dist', 'guide-print-en.html'),
    title: 'User guide',
    subtitle: 'YazNot 1.0 · short and clear',
    pdf: 'yaznot-user-guide.pdf',
    docTitle: 'YazNot 1.0 — User Guide',
    coverTagline: 'Your notebook',
    coverSub: 'User Guide',
    coverDesc: 'Sections, notes, speech to text, search, reading and sharing. Everything from the first note to a safe backup, short and clear.',
    tocTitle: 'Contents',
    tocIntro: 'The same guide opens inside the app; look for the ? button in the bottom-right corner.',
    introTitle: 'Welcome'
  }
];

const MONTHS = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

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
    .slice(0, 60) || 'section';
}

// ---- Markdown → HTML (same rules as the app renderer) ----
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

function parseGuide(md, config) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  let title = config.docTitle;
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
  if (introHtml) parsed.push({ id: 'welcome', title: config.introTitle, html: introHtml });
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

function buildGuideJs(guide, config, updated) {
  const payload = {
    version: '1.0',
    updated: updated,
    title: config.title,
    subtitle: config.subtitle,
    pdf: config.pdf,
    sections: guide.sections
  };
  return '/* GENERATED FILE — edit ' + config.sourceLabel + ' and run `npm run guide` */\n' +
    'window.' + config.global + ' = ' + JSON.stringify(payload, null, 2) + ';\n';
}

function buildPrintHtml(guide, config, updated) {
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
<html lang="${config.lang}"><head><meta charset="utf-8">
<title>${escapeHtml(config.docTitle)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f7f2e9; }
  body {
    font-family: "Segoe UI", "Segoe UI Variable Text", Arial, sans-serif;
    color: #26231e; background: #fff; font-size: 10.5pt; line-height: 1.68;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .cover {
    height: 297mm; padding: 28mm 20mm 20mm;
    display: flex; flex-direction: column; justify-content: space-between;
    background: #111112; color: #f3eee6;
    page-break-after: always;
  }
  .cover-top { display: flex; align-items: center; gap: 12px; }
  .cover-mark { width: 46px; height: 46px; }
  .cover-brand { font-size: 12pt; font-weight: 700; letter-spacing: 0.02em; color: #f3eee6; }
  .cover-brand small { display: block; font-size: 8pt; font-weight: 600; letter-spacing: 0.16em; color: #9f9486; text-transform: uppercase; margin-top: 2px; }
  .cover-main { margin-top: 54mm; }
  .cover h1 { margin: 0; font-size: 40pt; line-height: 1.02; letter-spacing: -0.035em; color: #f7f2e9; font-weight: 750; }
  .cover h1 span { color: #e36a35; }
  .cover-sub { margin: 12px 0 0; font-size: 17pt; font-weight: 400; color: #c8bbab; letter-spacing: -0.01em; }
  .cover-rule { width: 52px; height: 3px; background: #e36a35; margin: 22px 0; border-radius: 2px; }
  .cover-desc { max-width: 112mm; color: #b9ad9f; font-size: 10pt; line-height: 1.7; margin: 0; }
  .cover-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; color: #8f8273; font-size: 8.5pt; }
  .cover-badge { display: inline-block; padding: 3px 9px; border: 1px solid #5a4032; border-radius: 999px; color: #e8895d; font-weight: 700; font-size: 8.5pt; letter-spacing: 0.06em; }
  .toc-page { page-break-after: always; padding: 24mm 20mm 0; }
  .toc-page h2 { margin: 0 0 4mm; font-size: 19pt; letter-spacing: -0.02em; color: #17140f; }
  .toc-page .toc-intro { color: #7b7265; font-size: 9.5pt; margin: 0 0 9mm; }
  .toc { list-style: none; margin: 0; padding: 0; }
  .toc li { display: flex; align-items: baseline; gap: 10px; padding: 4.4mm 0; border-bottom: 1px solid #e6ddcf; }
  .toc-num { width: 24px; color: #c45625; font-weight: 700; font-size: 9pt; }
  .toc-title { font-size: 11pt; color: #2c2822; }
  .chapter { padding: 11mm 20mm 1mm; page-break-inside: auto; }
  .chapter.first { padding-top: 12mm; }
  .chapter + .chapter { padding-top: 11mm; }
  .chapter h2 { display: flex; align-items: baseline; gap: 9px; margin: 0 0 5mm; font-size: 17pt; line-height: 1.22; letter-spacing: -0.025em; color: #17140f; font-weight: 720; page-break-after: avoid; }
  .chapter-num { color: #c45625; font-size: 9pt; font-weight: 700; }
  .chapter h3 { margin: 7mm 0 2mm; font-size: 11.5pt; color: #211d17; page-break-after: avoid; }
  p { margin: 0 0 3.2mm; }
  ul, ol { margin: 0 0 4mm; padding-left: 6mm; }
  li { margin: 0 0 1.4mm; break-inside: avoid; }
  li::marker { color: #c45625; }
  strong { color: #17140f; font-weight: 650; }
  a { color: #a8461b; text-decoration: none; }
  code { font-family: "Cascadia Mono", Consolas, monospace; font-size: 9pt; background: #f3ede3; border-radius: 3px; padding: 0.5mm 1mm; }
  pre { background: #f5efe5; border: 1px solid #e5dbcb; border-radius: 3mm; padding: 3mm 4mm; overflow: hidden; page-break-inside: avoid; }
  pre code { background: transparent; padding: 0; }
  blockquote { margin: 4mm 0; padding: 2mm 0 2mm 4mm; border-left: 2px solid #c45625; color: #6a6156; font-style: italic; }
  hr { border: 0; border-top: 1px solid #e6ddcf; margin: 6mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 3mm 0 5mm; page-break-inside: avoid; font-size: 9.5pt; }
  th, td { border: 1px solid #e2d8c8; padding: 2mm 2.6mm; text-align: left; vertical-align: top; }
  th { background: #f4ede1; color: #26231e; font-weight: 650; }
  img { max-width: 100%; }
  .cover, .toc-page { break-inside: avoid-page; }
  .chapter p, .chapter li { orphans: 2; widows: 2; }
</style></head>
<body>
  <section class="cover">
    <div class="cover-top">
      <img class="cover-mark" src="${logoUrl}" alt="">
      <div class="cover-brand">YazNot<small>${escapeHtml(config.coverTagline)}</small></div>
    </div>
    <div class="cover-main">
      <h1>Yaz<span>Not</span> 1.0</h1>
      <p class="cover-sub">${escapeHtml(config.coverSub)}</p>
      <div class="cover-rule"></div>
      <p class="cover-desc">${escapeHtml(config.coverDesc)}</p>
    </div>
    <div class="cover-bottom">
      <span>${escapeHtml(updated)}</span>
      <span class="cover-badge">${config.lang === 'en' ? 'VERSION 1.0' : 'SÜRÜM 1.0'}</span>
    </div>
  </section>

  <section class="toc-page">
    <h2>${escapeHtml(config.tocTitle)}</h2>
    <p class="toc-intro">${escapeHtml(config.tocIntro)}</p>
    <ol class="toc">${toc}</ol>
  </section>

  ${body}
</body></html>`;
}

const now = new Date();
for (const config of CONFIGS) {
  const md = fs.readFileSync(config.markdown, 'utf8');
  const guide = parseGuide(md, config);
  const updated = MONTHS[config.lang][now.getMonth()] + ' ' + now.getFullYear();
  fs.mkdirSync(path.dirname(config.print), { recursive: true });
  fs.writeFileSync(config.js, buildGuideJs(guide, config, updated), 'utf8');
  fs.writeFileSync(config.print, buildPrintHtml(guide, config, updated), 'utf8');
  console.log(config.lang.toUpperCase() + ': ' + guide.sections.length + ' sections → ' +
    path.relative(ROOT, config.js) + ', ' + path.relative(ROOT, config.print));
}
console.log('Guides generated. Build PDFs from the two print pages as a release step.');
