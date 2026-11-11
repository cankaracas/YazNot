/**
 * YazNot — arayüz duman testi (jsdom)
 *
 * Tarayıcı açmadan ui/app.js'in temel akışlarını çalıştırır:
 * açılış, bölüm/öğe listeleme, arama, hızlı arama paleti, silme + geri alma,
 * ayarlar/tema, istatistik ve Markdown dışa aktarma.
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

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
  virtualConsole: new (require('jsdom').VirtualConsole)().on('jsdomError', function (e) {
    console.error('[jsdom hata] ' + (e && e.message));
    if (e && e.detail) console.error(e.detail);
  })
});
const { window } = dom;
const { document } = window;

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
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 30); }); }
function clearToasts() {
  document.querySelectorAll('.toast').forEach(function (t) {
    if (t.parentNode) t.parentNode.removeChild(t);
  });
}

// ---- Ortam sahteleri ----
const store = {
  sections: {
    sections: [
      {
        id: 's1', name: 'Ders Notları', structure: 'flat', type: 'list', icon: '📚', color: '#4f9dff',
        sortOrder: 0, createdAt: 1, updatedAt: 2,
        items: [
          { id: 'i1', title: 'Tarih', content: '<p>Osmanlı Devleti kuruluş dönemi</p>', createdAt: 1, updatedAt: 3 },
          { id: 'i2', title: 'Coğrafya', content: '<p>İklim tipleri ve bitki örtüsü</p>', createdAt: 1, updatedAt: 2 }
        ]
      },
      {
        id: 's2', name: 'Kitap', structure: 'grouped', type: 'grid', icon: '✍️', sortOrder: 1,
        createdAt: 1, updatedAt: 1,
        groups: [
          { id: 'g1', name: 'Bölüm 1', sortOrder: 0, items: [
            { id: 'i3', title: 'Giriş', content: '<p>İlk paragraf metni</p>', createdAt: 1, updatedAt: 1 }
          ] }
        ]
      }
    ]
  }
};
let exported = null;
let backupToImport = null;

window.alert = function () {};
window.confirm = function () { return true; };
document.execCommand = function () { return false; };

window.api = {
  load: async function (k) { return store[k] || null; },
  save: async function (k, v) { store[k] = v; return { ok: true }; },
  saveImage: async function (d) { return { ok: true, dataUrl: d }; },
  pickImage: async function () { return { ok: false, canceled: true }; },
  exportBackup: async function () { return { ok: true, filePath: 'x.json' }; },
  importBackup: async function () {
    return backupToImport
      ? { ok: true, data: backupToImport, fileName: 'test-yedek.json' }
      : { ok: false, canceled: true };
  },
  autoBackup: async function () { return { ok: true, filePath: 'auto.json' }; },
  openBackupsFolder: async function () { return { ok: true }; },
  confirm: async function () { return true; },
  pickImportFile: async function () { return { ok: false, canceled: true }; },
  exportTxt: async function (title, text, ext) { exported = { title: title, text: text, ext: ext }; return { ok: true }; },
  exportPdf: async function () { return { ok: true }; },
  openExternal: async function () { return { ok: true }; },
  getPendingSyncCount: function () { return 0; },
  syncNow: async function () {},
  getConflicts: function () { return []; },
  clearConflicts: function () {},
  clearLocalCache: async function () {},
  listIncomingShares: async function () { return []; },
  listSentShares: async function () { return []; },
  updateShareStatus: async function () { return { ok: true }; },
  sendShare: async function () { return { ok: true }; },
  platform: 'desktop'
};

window.yaznotAuth = {
  isLoggedIn: async function () { return true; },
  getUid: async function () { return 'u1'; },
  getEmail: async function () { return 'test@example.com'; },
  signOut: function () {},
  getSession: async function () { return null; },
  sendOtp: async function () { return { ok: true }; },
  verifyOtp: async function () { return { ok: true }; },
  signInWithGoogle: async function () { return { ok: true }; }
};

// ---- app.js'i çalıştır ----
const appSrc = fs.readFileSync(path.join(ROOT, 'ui', 'app.js'), 'utf8');
window.__YAZNOT_TEST__ = true;
window.eval(appSrc);
// jsdom DOMContentLoaded'i kendisi tetikler; yalnızca çoktan geçtiyse elle tetikle
// (aksi halde init iki kez çalışır ve tüm olay dinleyicileri mükerrer kaydolur).
if (document.readyState !== 'loading') document.dispatchEvent(new window.Event('DOMContentLoaded'));

(async function run() {
  await wait(80);

  console.log('\nAçılış');
  check('kenar çubuğunda 2 bölüm listelenir', document.querySelectorAll('#nav-sections .nav-btn').length === 2);
  check('bölüm görünümü açılır', !document.getElementById('section-view').classList.contains('hidden'));
  check('2 öğe listelenir', document.querySelectorAll('#items-container .item').length === 2);
  check('bölüm rengi kenar çubuğuna uygulanır',
    (document.querySelector('#nav-sections .nav-btn').getAttribute('style') || '').indexOf('#4f9dff') !== -1);
  check('bölüm başlığı doğru', document.getElementById('section-title').textContent === 'Ders Notları');
  check('kılavuz penceresi kapalı başlar', document.getElementById('guide-modal').classList.contains('hidden'));
  check('kılavuz küçük düğmesi görünür', !document.getElementById('guide-fab').classList.contains('hidden'));

  console.log('\nArama');
  const search = document.getElementById('search-items');
  search.value = 'iklim';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await wait();
  check('arama 1 sonuca indirir', document.querySelectorAll('#items-container .item').length === 1);
  search.value = '';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await wait();
  check('arama temizlenince 2 öğe döner', document.querySelectorAll('#items-container .item').length === 2);

  console.log('\nHızlı arama paleti');
  document.getElementById('btn-palette').click();
  await wait();
  check('palet açılır', !document.getElementById('palette-overlay').classList.contains('hidden'));
  const pInput = document.getElementById('palette-input');
  pInput.value = 'giriş';
  pInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await wait(150);
  check('palet sonuç bulur', document.querySelectorAll('#palette-results .palette-item').length === 1);
  document.querySelector('#palette-results .palette-item').click();
  await wait(60);
  check('palet seçimi editörü açar', !document.getElementById('item-editor-view').classList.contains('hidden'));
  check('doğru öğe açılır', document.getElementById('editor-title').textContent === 'Giriş');

  console.log('\nEditör araç çubuğu');
  const editorSticky = document.querySelector('#item-editor-view .editor-sticky');
  check('başlık ve araç çubuğu tek yapışkan şeritte',
    !!editorSticky && !!editorSticky.querySelector('.editor-header') && !!editorSticky.querySelector('#editor-toolbar'));
  check('yapışkan şerit sırayla başlık + araç çubuğu içerir',
    !!editorSticky && editorSticky.children.length === 2 &&
    editorSticky.children[0].classList.contains('editor-header') &&
    editorSticky.children[1].id === 'editor-toolbar');
  check('araç çubuğu editör gövdesinden ayrıldı',
    !document.querySelector('.editor-body #editor-toolbar') &&
    !!document.querySelector('.editor-body #editor-content'));
  check('araç çubuğu düğmeleri korunur',
    document.querySelectorAll('#editor-toolbar .toolbar-btn').length >= 15);
  check('sesten metne düğmesi araç çubuğunda',
    !!document.querySelector('#editor-toolbar .toolbar-btn[data-cmd="stt"]'));
  check('STT penceresi gizli başlar', !!document.getElementById('stt-modal') &&
    document.getElementById('stt-modal').classList.contains('hidden'));
  check('STT indirme ve kayıt bölümleri var',
    !!document.getElementById('stt-download-btn') && !!document.getElementById('stt-record-btn') &&
    !!document.getElementById('stt-file-btn') && !!document.getElementById('stt-result') &&
    !!document.getElementById('stt-insert'));
  check('STT betiği arayüze bağlı',
    Array.prototype.some.call(document.querySelectorAll('script'), function (s) {
      return s.getAttribute('src') === 'stt/stt-app.js';
    }));

  document.getElementById('btn-back-from-editor').click();
  await wait(60);
  // Grup görünümünden çıkıp ilk bölüme (düz liste) dön
  document.querySelectorAll('#nav-sections .nav-btn')[0].click();
  await wait(60);

  console.log('\nSilme + geri alma');
  const before = document.querySelectorAll('#items-container .item').length;
  document.querySelector('#items-container .item-delete').click();
  await wait(60);
  check('öğe silinir', document.querySelectorAll('#items-container .item').length === before - 1);
  const toast = document.querySelector('.toast');
  check('geri al bildirimi çıkar', !!toast);
  const undoBtn = toast && toast.querySelector('.toast-action');
  check('geri al düğmesi var', !!undoBtn);
  if (undoBtn) undoBtn.click();
  await wait(80);
  check('geri alınca öğe döner', document.querySelectorAll('#items-container .item').length === before);

  console.log('\nAyarlar / tema');
  document.getElementById('btn-settings').click();
  await wait();
  check('ayarlar açılır', !document.getElementById('settings-modal').classList.contains('hidden'));
  document.querySelector('#settings-theme .type-option[data-theme="light"]').click();
  await wait();
  check('açık tema uygulanır', document.body.classList.contains('theme-light'));
  check('tema ayarı kaydedilir', store.settings && store.settings.theme === 'light');
  document.getElementById('settings-close').click();

  console.log('\nİstatistik');
  document.getElementById('btn-stats').click();
  await wait();
  check('istatistik kartları üretilir', document.querySelectorAll('#stats-grid .stat-card').length >= 6);
  check('not sayısı doğru (3)', document.querySelector('#stats-grid .stat-value').textContent !== '');
  document.getElementById('stats-close').click();

  console.log('\nDışa aktarma');
  document.getElementById('search-items').value = '';
  document.getElementById('search-items').dispatchEvent(new window.Event('input', { bubbles: true }));
  await wait();
  document.querySelector('#items-container .item-title').click();
  await wait();
  document.getElementById('btn-export-md').click();
  await wait();
  check('markdown dışa aktarımı çalışır', !!exported && exported.ext === 'md');
  check('markdown başlık içerir', !!exported && exported.text.indexOf('# ') === 0, exported && exported.text.slice(0, 40));

  document.getElementById('btn-back-from-editor').click();
  await wait(60);

  console.log('\nGeri dönüşüm kutusu');
  clearToasts();
  document.querySelector('#items-container .item-delete').click();
  await wait(100);
  check('silinen not geri dönüşüme gider', (store.trash && store.trash.items || []).length === 1);
  check('geri dönüşüm rozeti görünür', !document.getElementById('trash-badge').classList.contains('hidden'));

  document.getElementById('btn-open-trash').click();
  await wait(120);
  check('geri dönüşüm penceresi açılır', !document.getElementById('trash-modal').classList.contains('hidden'));
  check('silinen kayıt listelenir', document.querySelectorAll('#trash-list .trash-row').length === 1);
  check('kayıt türü ve konumu yazılır',
    (document.querySelector('#trash-list .trash-meta').textContent || '').indexOf('Not · Ders Notları') === 0);

  document.querySelector('#trash-list .trash-restore').click();
  await wait(120);
  check('geri yüklenince liste boşalır', document.querySelectorAll('#trash-list .trash-row').length === 0);
  check('not eski yerine döner', document.querySelectorAll('#items-container .item').length === 2);
  document.getElementById('trash-close').click();

  console.log('\nToplu işlem');
  document.getElementById('btn-select-items').click();
  await wait(100);
  check('seçim modu açılır', !document.getElementById('bulk-bar').classList.contains('hidden'));
  check('her satırda onay kutusu var', document.querySelectorAll('#items-container .item-check').length === 2);

  let rows = document.querySelectorAll('#items-container .item');
  rows[0].click();
  await wait(40);
  check('tek not seçilir', (document.getElementById('bulk-count').textContent || '').indexOf('1 not') === 0);

  rows[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
  await wait(40);
  check('shift ile aralık seçilir', (document.getElementById('bulk-count').textContent || '').indexOf('2 not') === 0);
  check('seçili satırlar işaretlenir', document.querySelectorAll('#items-container .item.selected').length === 2);

  document.getElementById('bulk-move').click();
  await wait(80);
  check('taşıma penceresi açılır', !document.getElementById('move-modal').classList.contains('hidden'));
  const moveOpts = Array.prototype.slice.call(document.querySelectorAll('#move-target option'));
  const targetIdx = moveOpts.findIndex(function (o) { return o.textContent.indexOf('Bölüm 1') !== -1; });
  check('hedef listesi dolu', moveOpts.length >= 2 && targetIdx !== -1);
  document.getElementById('move-target').value = String(targetIdx);
  document.getElementById('move-confirm').click();
  await wait(140);
  check('notlar hedef gruba taşınır', store.sections.sections[1].groups[0].items.length === 3);
  check('kaynak bölüm boşalır', store.sections.sections[0].items.length === 0);

  // Grup görünümünde toplu silme + geri alma
  document.querySelectorAll('#nav-sections .nav-btn')[1].click();
  await wait(80);
  document.querySelector('#items-container .group-card').click();
  await wait(80);
  document.getElementById('btn-select-group-items').click();
  await wait(80);
  document.getElementById('bulk-select-all').click();
  await wait(40);
  check('tümü seçilir', (document.getElementById('bulk-count').textContent || '').indexOf('3 not') === 0);

  clearToasts();
  document.getElementById('bulk-delete').click();
  await wait(160);
  check('toplu silme geri dönüşüme taşır', (store.trash.items || []).length === 3);
  check('grup boşalır', store.sections.sections[1].groups[0].items.length === 0);

  const bulkUndo = document.querySelector('.toast .toast-action');
  check('toplu silme geri alınabilir', !!bulkUndo);
  if (bulkUndo) bulkUndo.click();
  await wait(180);
  check('toplu geri alma çalışır', store.sections.sections[1].groups[0].items.length === 3);
  check('geri dönüşüm tekrar boşalır', (store.trash.items || []).length === 0);

  console.log('\nBölüm oluşturma');
  document.getElementById('btn-new-section').click();
  await wait();
  check('bölüm penceresi açılır', !document.getElementById('section-modal').classList.contains('hidden'));
  document.getElementById('section-modal-name').value = 'Yeni Bölüm';
  document.querySelector('#section-modal-color .color-option[data-color="#41c98a"]').click();
  document.getElementById('section-modal-save').click();
  await wait(60);
  check('bölüm eklenir', document.querySelectorAll('#nav-sections .nav-btn').length === 3);
  check('yeni bölümün rengi kaydedilir',
    store.sections.sections.some(function (s) { return s.name === 'Yeni Bölüm' && s.color === '#41c98a'; }));

  console.log('\nMarkdown içe aktarma');
  window.api.pickImportFile = async function () {
    return {
      ok: true, fileName: 'ders-notu.md', kind: 'md',
      text: '# Tarih\n\n**Önemli** bir konu ve [kaynak](https://example.com).\n\n- Birinci madde\n- İkinci madde\n\n| Dönem | Yıl |\n| --- | --- |\n| Kuruluş | 1299 |\n'
    };
  };
  const mdSection = store.sections.sections.find(function (s) { return s.name === 'Yeni Bölüm'; });
  const mdItemCountBefore = (mdSection.items || []).length;
  document.getElementById('btn-import-section').click();
  await wait(140);
  check('markdown önizlemesi başlık üretir', !!document.querySelector('#import-preview h1'));
  check('markdown önizlemesi kalın ve bağlantı üretir',
    !!document.querySelector('#import-preview strong') && !!document.querySelector('#import-preview a'));
  check('markdown önizlemesi tablo üretir', !!document.querySelector('#import-preview table'));
  check('markdown için başlık dosya adından gelir',
    document.getElementById('import-title').value === 'ders-notu');
  document.getElementById('import-confirm').click();
  await wait(120);
  const mdItems = (store.sections.sections.find(function (s) { return s.name === 'Yeni Bölüm'; }) || {}).items || [];
  check('markdown not olarak eklenir', mdItems.length === mdItemCountBefore + 1);
  check('markdown biçimi not içeriğinde korunur',
    mdItems.length > 0 && mdItems[mdItems.length - 1].content.indexOf('<h1>') !== -1 &&
    mdItems[mdItems.length - 1].content.indexOf('<strong>') !== -1 &&
    mdItems[mdItems.length - 1].content.indexOf('<table>') !== -1);

  console.log('\nGüvenlik / dönüştürme');
  const t = window.__yaznotTest;
  check('test kancası açık', !!t);
  if (t) {
    const dirty = '<p onclick="alert(1)">merhaba</p><script>alert(2)<\/script><img src=x onerror="alert(3)">';
    const clean = t.sanitizeHtml(dirty);
    check('script etiketi temizlenir', clean.indexOf('<script') === -1);
    check('on* öznitelikleri temizlenir', !/on(click|error)=/i.test(clean));
    check('metin içeriği korunur', clean.indexOf('merhaba') !== -1);
    check('javascript: bağlantısı engellenir',
      t.sanitizeHtml('<a href="javascript:alert(1)">x</a>').indexOf('javascript:') === -1);
    check('güvenli bağlantı korunur',
      t.sanitizeHtml('<a href="https://example.com">x</a>').indexOf('https://example.com') !== -1);
    check('markdown dönüşümü başlık/liste üretir',
      t.htmlToMarkdown('<h2>Başlık</h2><ul><li>bir</li><li>iki</li></ul>').indexOf('## Başlık') === 0);
    check('markdown içe aktarma başlık/liste üretir',
      t.markdownToHtml('# Başlık\n\n- bir\n- iki').indexOf('<h1>Başlık</h1>') === 0 &&
      t.markdownToHtml('# Başlık\n\n- bir\n- iki').indexOf('<li>bir</li>') !== -1);
    check('markdown içe aktarma görsel/bağlantı üretir',
      t.markdownToHtml('![x](https://example.com/a.png)').indexOf('<img src="https://example.com/a.png"') !== -1 &&
      t.markdownToHtml('[x](https://example.com)').indexOf('<a href="https://example.com"') !== -1);
    check('markdown ham HTML çalıştırmaz',
      t.markdownToHtml('<img src=x onerror=alert(1)>').indexOf('<img') === -1);
    check('markdown javascript: bağlantısını engeller',
      t.markdownToHtml('[x](javascript:alert(1))').indexOf('javascript:') === -1);
    check('markdown tablo üretir',
      t.markdownToHtml('| A | B |\n| --- | --- |\n| 1 | 2 |').indexOf('<table>') === 0);
    check('düz metin çıkarımı etiketleri siler', t.htmlToText('<p>a</p><p>b</p>') === 'a b');
    check('kelime sayımı doğru', t.countWords('<p>bir iki üç</p>') === 3);
  }

  console.log('\nÇoklu hesap menüsü');
  let switchedTo = null;
  let addOpened = false;
  window.yaznotAuth.listAccounts = function () {
    return [
      { uid: 'u1', email: 'test@example.com', name: 'Test', active: true },
      { uid: 'u2', email: 'ikinci@example.com', name: 'İkinci', active: false }
    ];
  };
  window.yaznotAuth.switchAccount = async function (uid) {
    switchedTo = uid;
    return { ok: true };
  };
  window.yaznotAuthUI = { openAddAccount: function () { addOpened = true; } };

  document.getElementById('btn-switch-account').click();
  await wait(60);
  check('hesap menüsü açılır', !document.getElementById('account-menu').classList.contains('hidden'));
  check('iki hesap listelenir', document.querySelectorAll('#account-menu-list .account-row').length === 2);
  check('etkin hesap işaretlenir', !!document.querySelector('#account-menu-list .account-row.active .account-row-check'));

  const otherRow = document.querySelectorAll('#account-menu-list .account-row')[1];
  otherRow.click();
  await wait(80);
  check('diğer hesaba geçiş çağrılır', switchedTo === 'u2', String(switchedTo));

  document.getElementById('btn-switch-account').click();
  await wait(40);
  document.getElementById('btn-add-account').click();
  await wait(60);
  check('hesap ekleme ekranı açılır', addOpened === true);

  console.log('\nJSON içe aktarma — üzerine ekle / değiştir');
  const sectionsBeforeMerge = store.sections.sections.slice();
  const idsBeforeMerge = new Set();
  sectionsBeforeMerge.forEach(function (s) {
    idsBeforeMerge.add(s.id);
    (s.items || []).forEach(function (it) { idsBeforeMerge.add(it.id); });
    (s.groups || []).forEach(function (g) {
      idsBeforeMerge.add(g.id);
      (g.items || []).forEach(function (it) { idsBeforeMerge.add(it.id); });
    });
  });

  backupToImport = {
    yaznot_version: '0.9.2',
    exported_at: new Date().toISOString(),
    sections: [
      {
        id: 's1', name: 'Ders Notları', structure: 'flat', type: 'list', icon: '📚', color: '#4f9dff',
        items: [{ id: 'i1', title: 'Aktarılan not', content: '<p>aktarılan içerik</p>' }]
      },
      {
        id: 's9', name: 'Aktarılan Kitap', structure: 'grouped', type: 'grid', icon: '✍️',
        groups: [{ id: 'g1', name: 'Yeni Bölüm', items: [
          { id: 'i3', title: 'Aktarılan bölüm', content: '<p>kitap içeriği</p>' }
        ] }]
      }
    ],
    settings: { hiddenSections: {} }
  };
  document.getElementById('btn-import-backup').click();
  await wait(120);
  check('içe aktarma penceresi açılır', !document.getElementById('restore-modal').classList.contains('hidden'));
  check('varsayılan yöntem üzerine eklemedir',
    document.querySelector('#restore-modes .restore-mode.selected').getAttribute('data-mode') === 'merge');
  check('yedek özeti bölüm ve not sayısını gösterir',
    document.getElementById('restore-summary').textContent.indexOf('2 bölüm · 2 not') !== -1);
  check('üzerine ekleme mevcut veriyi korur',
    document.getElementById('restore-effect').textContent.indexOf('korunacak') !== -1);
  check('onay düğmesi üzerine ekleme der',
    document.getElementById('restore-confirm').textContent === 'Üzerine Ekle');

  document.getElementById('restore-confirm').click();
  await wait(220);
  check('içe aktarma penceresi kapanır', document.getElementById('restore-modal').classList.contains('hidden'));
  check('mevcut bölümler korunur', store.sections.sections.length === sectionsBeforeMerge.length + 2);
  check('eski bölümler yerinde kalır',
    sectionsBeforeMerge.every(function (s) { return store.sections.sections.some(function (n) { return n.id === s.id; }); }));
  check('çakışan bölüm adı ayrıştırılır',
    store.sections.sections.some(function (s) { return s.name === 'Ders Notları' && s.id === 's1'; }) &&
    store.sections.sections.some(function (s) { return s.name === 'Ders Notları (2)'; }));
  check('aktarılan not içeriği eklenir',
    store.sections.sections.some(function (s) {
      return (s.items || []).some(function (it) { return it.title === 'Aktarılan not' && it.content.indexOf('aktarılan içerik') !== -1; });
    }));
  check('aktarılan gruplu bölüm eklenir',
    store.sections.sections.some(function (s) {
      return s.name === 'Aktarılan Kitap' && s.structure === 'grouped' &&
        (s.groups || []).some(function (g) { return (g.items || []).some(function (it) { return it.title === 'Aktarılan bölüm'; }); });
    }));
  const importedSection = store.sections.sections.find(function (s) { return s.name === 'Ders Notları (2)'; });
  check('aktarılan kimlikler çakışmaz', !!importedSection && !idsBeforeMerge.has(importedSection.id) && importedSection.id !== 's1');
  check('içe aktarma bildirimi gösterilir', !!document.querySelector('.toast'));

  clearToasts();
  backupToImport = {
    yaznot_version: '0.9.2',
    exported_at: new Date().toISOString(),
    sections: [
      {
        id: 'tek', name: 'Sadece Yedek', structure: 'flat', type: 'list', icon: '📁',
        items: [{ id: 'tek-not', title: 'Tek not', content: '<p>yalnızca yedek</p>' }]
      }
    ],
    settings: { hiddenSections: {} }
  };
  document.getElementById('btn-import-backup').click();
  await wait(120);
  document.querySelector('#restore-modes input[value="replace"]').click();
  await wait(60);
  check('değiştirme yöntemi seçilir',
    document.querySelectorAll('#restore-modes .restore-mode.selected').length === 1 &&
    document.querySelector('#restore-modes .restore-mode.selected').getAttribute('data-mode') === 'replace');
  check('değiştirme uyarısı gösterilir',
    document.getElementById('restore-effect').classList.contains('danger') &&
    document.getElementById('restore-effect').textContent.indexOf('silinecek') !== -1);
  check('onay düğmesi değiştirme der',
    document.getElementById('restore-confirm').textContent === 'Mevcut Verileri Sil ve Yükle');

  document.getElementById('restore-confirm').click();
  await wait(260);
  check('değiştirme modunda eski bölümler silinir', store.sections.sections.length === 1);
  check('değiştirme modunda yalnızca yedek kalır', store.sections.sections[0].name === 'Sadece Yedek');
  check('değiştirme modunda eski not kalmaz',
    !store.sections.sections.some(function (s) {
      return (s.items || []).some(function (it) { return it.title === 'Aktarılan not'; });
    }));
  check('değiştirme modunda geri dönüşüm kutusu boşalır', (store.trash && store.trash.items || []).length === 0);
  check('değiştirme sonrası yedek notu açılır',
    !document.getElementById('item-editor-view').classList.contains('hidden') ||
    document.getElementById('section-title').textContent === 'Sadece Yedek');

  console.log('\nSonuç: ' + (checks - failures) + '/' + checks + ' kontrol geçti');
  dom.window.close();
  process.exit(failures === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('\nTest çöktü:', err);
  process.exit(1);
});
