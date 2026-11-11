document.addEventListener('DOMContentLoaded', function () {

  function localeTag() {
    try { return window.YazNotI18n ? window.YazNotI18n.locale() : 'tr-TR'; } catch (e) { return 'tr-TR'; }
  }

  // ============ PWA: SERVICE WORKER ============
  // Tarayıcıda (mobil/PWA) çevrimdışı önbelleği devreye alır.
  // Masaüstü kabuğunda protokol file: olduğu için atlanır.
  if (!window.yaznotNative && 'serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function (err) {
        console.warn('[pwa] service worker kaydedilemedi:', err && err.message);
      });
    });
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // DOM oluşturmadan HTML -> düz metin. Liste önizlemeleri ve kelime sayımı
  // her tuş vuruşunda çalıştığı için DOM tabanlı sürümden çok daha hızlı.
  function htmlToText(html) {
    return String(html == null ? '' : html)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|pre)>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ').trim();
  }

  function countWordsInHtml(html) {
    var text = htmlToText(html);
    if (!text) return 0;
    return text.split(' ').filter(Boolean).length;
  }

  function stripHtml(html) { return htmlToText(html); }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(self, args); }, wait);
    };
  }

  // ===== HTML temizleme =====
  // Yapıştırılan/içe aktarılan/paylaşılan içerik doğrudan innerHTML'e yazıldığı
  // için script, on* öznitelikleri ve javascript: bağlantıları ayıklanır.
  var ALLOWED_TAGS = {
    P: 1, DIV: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1,
    H1: 1, H2: 1, H3: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1, IMG: 1,
    CODE: 1, PRE: 1, MARK: 1, SPAN: 1, HR: 1, SUB: 1, SUP: 1, TABLE: 1,
    THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1
  };

  function sanitizeHtml(html) {
    if (!html) return '';
    var doc;
    try { doc = document.implementation.createHTMLDocument('yaznot-sanitize'); }
    catch (e) { return escapeHtml(html); }
    doc.body.innerHTML = String(html);

    function clean(node) {
      var children = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c.nodeType === 8) { node.removeChild(c); continue; }
        if (c.nodeType !== 1) continue;
        var tag = c.tagName;
        if (!ALLOWED_TAGS[tag]) {
          // İzinsiz etiketi kaldır, içeriğini koru (script/style içeriği atılır).
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') {
            node.removeChild(c);
            continue;
          }
          while (c.firstChild) node.insertBefore(c.firstChild, c);
          node.removeChild(c);
          continue;
        }
        var attrs = Array.prototype.slice.call(c.attributes);
        for (var j = 0; j < attrs.length; j++) {
          var name = attrs[j].name.toLowerCase();
          var val = attrs[j].value;
          if (name === 'href') {
            if (!/^(https?:|mailto:|#)/i.test(val)) c.removeAttribute(attrs[j].name);
          } else if (name === 'src') {
            if (!/^(data:image\/|https?:|blob:)/i.test(val)) c.removeAttribute(attrs[j].name);
          } else if (name === 'alt' || name === 'title') {
            // güvenli
          } else {
            c.removeAttribute(attrs[j].name);
          }
        }
        if (tag === 'A' && c.getAttribute('href')) {
          c.setAttribute('target', '_blank');
          c.setAttribute('rel', 'noopener noreferrer');
        }
        clean(c);
      }
    }
    clean(doc.body);
    return doc.body.innerHTML;
  }


  function trLower(s) {
    return String(s || '').toLocaleLowerCase('tr');
  }

  // ============ SYNC INDICATOR ============
  function updateSyncIndicator() {
    var syncIcon = document.getElementById('sidebar-sync-icon');
    var syncText = document.getElementById('sidebar-sync-text');
    var editorDot = document.getElementById('editor-sync-dot');
    if (!syncText) return;
    var isOnline = navigator.onLine;
    var hasCloud = window.api && typeof window.api.getPendingSyncCount === 'function';
    var pending = 0;
    if (hasCloud) { try { pending = window.api.getPendingSyncCount(); } catch (e) { pending = 0; } }
    var text, cls;
    if (!hasCloud) { text = 'Yerel kayıt'; cls = 'sync-off'; }
    else if (!isOnline) { text = 'Çevrimdışı' + (pending > 0 ? ' (' + pending + ')' : ''); cls = 'sync-off'; }
    else if (pending > 0) { text = pending + ' bekliyor…'; cls = 'sync-pending'; }
    else { text = 'Senkronize'; cls = 'sync-ok'; }
    if (syncIcon) syncIcon.className = 'sync-icon ' + cls;
    syncText.textContent = text;
    // Renk sınıfla verilir; böylece açık temada da doğru kontrast korunur.
    syncText.className = 'sync-text ' + cls;
    if (editorDot) { editorDot.className = 'sync-dot ' + cls; editorDot.title = text; }
    var chip = document.getElementById('sidebar-sync');
    if (chip) chip.title = 'Senkronizasyon: ' + text;
  }

  function setupSyncIndicator() {
    updateSyncIndicator();
    window.addEventListener('online', updateSyncIndicator);
    window.addEventListener('offline', updateSyncIndicator);
    setInterval(updateSyncIndicator, 5000);
  }

  // ============ IMAGE HELPERS ============
  // Görseller not içine gömüldüğü (base64) ve buluta aynen gönderildiği için
  // eklemeden önce boyutlandırılıp sıkıştırılır. Bu, hem senkronizasyonu hem
  // de büyük notlarda editör akıcılığını korur.
  var MAX_IMAGE_DIM = 1600;
  var IMAGE_QUALITY = 0.85;

  function insertImageAtCursor(contentEl, src) {
    contentEl.focus();
    document.execCommand('insertHTML', false, '<img src="' + String(src).replace(/"/g, '&quot;') + '">');
    contentEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function loadImageElement(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image-load-failed')); };
      img.src = src;
    });
  }

  async function optimizeImageDataUrl(dataUrl) {
    if (!/^data:image\//i.test(dataUrl)) return dataUrl;
    // SVG (vektör) ve GIF (animasyon) yeniden kodlanmaz.
    if (/^data:image\/(svg\+xml|gif)/i.test(dataUrl)) return dataUrl;
    try {
      var img = await loadImageElement(dataUrl);
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h) return dataUrl;
      var scale = Math.min(1, MAX_IMAGE_DIM / Math.max(w, h));
      if (scale === 1 && dataUrl.length < 500000) return dataUrl;

      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      var ctx = canvas.getContext('2d');
      if (!ctx) return dataUrl;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      var out = canvas.toDataURL('image/webp', IMAGE_QUALITY);
      if (out.indexOf('data:image/webp') !== 0) out = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
      return (out.length < dataUrl.length) ? out : dataUrl;
    } catch (e) {
      return dataUrl;
    }
  }

  async function processImageDataUrl(contentEl, dataUrl) {
    var optimized = await optimizeImageDataUrl(dataUrl);
    var result = await window.api.saveImage(optimized);
    if (result && result.ok) {
      insertImageAtCursor(contentEl, result.dataUrl || ('yaznot://' + result.filename));
    } else {
      alert('Resim kaydedilemedi: ' + ((result && result.error) || 'bilinmeyen hata'));
    }
  }
  function processImageFile(contentEl, file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = async function (ev) { await processImageDataUrl(contentEl, ev.target.result); resolve(); };
      reader.onerror = function () { resolve(); };
      reader.readAsDataURL(file);
    });
  }
  function setupImagePaste(contentEl) {
    contentEl.addEventListener('paste', function (e) {
      var cd = e.clipboardData;
      if (!cd) return;
      var items = cd.items;
      if (items) {
        for (var i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.indexOf('image') === 0) {
            e.preventDefault();
            var file = items[i].getAsFile();
            if (file) processImageFile(contentEl, file);
            return;
          }
        }
      }
      // Zengin metin yapıştırmayı temizleyerek ekle (Word/web kaynaklı çöp stil gelmesin).
      var html = cd.getData ? cd.getData('text/html') : '';
      if (html) {
        var clean = sanitizeHtml(html);
        e.preventDefault();
        if (clean && clean.replace(/<[^>]*>/g, '').trim()) {
          document.execCommand('insertHTML', false, clean);
        } else {
          document.execCommand('insertText', false, cd.getData('text/plain') || '');
        }
        contentEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }
  function setupImageDrop(contentEl) {
    contentEl.addEventListener('dragover', function (e) {
      if (e.dataTransfer && e.dataTransfer.types) {
        for (var i = 0; i < e.dataTransfer.types.length; i++) {
          if (e.dataTransfer.types[i] === 'Files') { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; return; }
        }
      }
    });
    contentEl.addEventListener('drop', async function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || files.length === 0) return;
      var imageFiles = [];
      for (var i = 0; i < files.length; i++) {
        if (files[i].type && files[i].type.indexOf('image') === 0) imageFiles.push(files[i]);
      }
      if (imageFiles.length === 0) return;
      e.preventDefault();
      for (var j = 0; j < imageFiles.length; j++) await processImageFile(contentEl, imageFiles[j]);
    });
  }


  // ============ SETTINGS ============
  var EDITOR_WIDTHS = { narrow: 680, normal: 820, wide: 1100 };
  var settings = {
    sidebarHidden: false,
    hiddenSections: {},
    theme: 'dark',
    fontSize: 17,
    lineHeight: 185,
    editorWidth: 'normal',
    spellcheck: false,
    focusMode: false
  };

  async function loadSettings() {
    var data = await window.api.load('settings');
    if (!data) return;
    if (typeof data.sidebarHidden === 'boolean') settings.sidebarHidden = data.sidebarHidden;
    if (data.hiddenSections && typeof data.hiddenSections === 'object') settings.hiddenSections = data.hiddenSections;
    if (data.theme === 'light' || data.theme === 'dark') settings.theme = data.theme;
    if (typeof data.fontSize === 'number' && data.fontSize >= 14 && data.fontSize <= 24) settings.fontSize = data.fontSize;
    if (typeof data.lineHeight === 'number' && data.lineHeight >= 140 && data.lineHeight <= 220) settings.lineHeight = data.lineHeight;
    if (EDITOR_WIDTHS[data.editorWidth]) settings.editorWidth = data.editorWidth;
    if (typeof data.spellcheck === 'boolean') settings.spellcheck = data.spellcheck;
    if (typeof data.focusMode === 'boolean') settings.focusMode = data.focusMode;
  }

  async function saveSettings() { await window.api.save('settings', settings); }

  function applySettings() {
    var body = document.body;
    body.classList.toggle('sidebar-collapsed', !!settings.sidebarHidden);
    body.classList.toggle('theme-light', settings.theme === 'light');
    body.classList.toggle('focus-mode', !!settings.focusMode);
    var root = document.documentElement;
    root.style.setProperty('--editor-font-size', settings.fontSize + 'px');
    root.style.setProperty('--editor-line-height', (settings.lineHeight / 100).toFixed(2));
    root.style.setProperty('--editor-width', (EDITOR_WIDTHS[settings.editorWidth] || 820) + 'px');
    var content = document.getElementById('editor-content');
    if (content) content.setAttribute('spellcheck', settings.spellcheck ? 'true' : 'false');
    var focusBtn = document.getElementById('btn-focus-mode');
    if (focusBtn) focusBtn.classList.toggle('active', !!settings.focusMode);
  }

  function setSetting(key, value) {
    settings[key] = value;
    applySettings();
    saveSettings();
  }


  // ============ STATE ============
  var sections = [];
  var activeSectionId = null;
  var activeGroupId = null;
  var activeItemId = null;
  var searchItemsQuery = '';
  var editorSaveTimer = null;

  // Geri dönüşüm kutusu
  var TRASH_KEY = 'trash';
  var TRASH_RETENTION_DAYS = 30;
  var trash = [];

  // Toplu işlem
  var selectionMode = false;
  var selectedIds = {};
  var lastSelectedIndex = -1;
  var moveTargets = [];

  function getActiveSection() { return sections.find(function (s) { return s.id === activeSectionId; }); }
  function getActiveGroup() {
    var s = getActiveSection();
    if (!s || !Array.isArray(s.groups)) return null;
    return s.groups.find(function (g) { return g.id === activeGroupId; });
  }
  function getActiveItems() {
    var s = getActiveSection();
    if (!s) return [];
    if (s.structure === 'grouped') {
      var g = getActiveGroup();
      return g && Array.isArray(g.items) ? g.items : [];
    }
    return Array.isArray(s.items) ? s.items : [];
  }
  function getActiveItem() {
    var items = getActiveItems();
    return items.find(function (i) { return i.id === activeItemId; });
  }

  // ============ CONTEXT MENU ============
  var contextMenu = document.getElementById('context-menu');
  function showContextMenu(x, y, items) {
    contextMenu.innerHTML = '';
    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'context-menu-item';
      btn.textContent = item.label;
      btn.addEventListener('click', function () { contextMenu.classList.add('hidden'); item.action(); });
      contextMenu.appendChild(btn);
    });
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');
  }
  document.addEventListener('click', function () { contextMenu.classList.add('hidden'); });
  document.addEventListener('contextmenu', function (e) {
    if (!e.target.closest('.nav-btn') && !e.target.closest('.context-menu') &&
        !e.target.closest('.group-card') && !e.target.closest('.group-row')) {
      contextMenu.classList.add('hidden');
    }
  });

  // Dokunmatik cihazlarda (iOS/Android) sağ tık olmadığı için "uzun basma" ile
  // aynı menüyü açar. Masaüstünde sağ tık (contextmenu) eskisi gibi çalışır.
  function bindContextMenuTrigger(el, onOpen) {
    var longPressTimer = null;
    function coords(e) {
      if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      return { x: e.clientX || 0, y: e.clientY || 0 };
    }
    el.addEventListener('contextmenu', function (e) {
      e.preventDefault(); e.stopPropagation();
      var c = coords(e); onOpen(c.x, c.y);
    });
    el.addEventListener('touchstart', function (e) {
      longPressTimer = setTimeout(function () {
        longPressTimer = null;
        var c = coords(e); onOpen(c.x, c.y);
      }, 550);
    }, { passive: true });
    el.addEventListener('touchend', function () { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
    el.addEventListener('touchmove', function () { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
  }

  // ============ TOAST ============
  var toastContainer = document.getElementById('toast-container');
  if (toastContainer) {
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('aria-atomic', 'false');
  }

  var TOAST_ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 14h10l1-14"/><path d="M10 11v5M14 11v5"/></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
    account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
  };

  function inferToastKind(message) {
    var m = String(message || '');
    if (/edilemedi|alamadı|bulunamadı|başarısız|kullanılamıyor|hata/i.test(m)) return 'danger';
    if (/boşaltıldı|kalıcı olarak silindi/i.test(m)) return 'danger';
    if (/geri dönüşüm|taşındı|silindi/i.test(m)) return 'warning';
    if (/oluşturuldu|yüklendi|dönüştürüldü|kaydedildi|tamamlandı|hazır/i.test(m)) return 'success';
    return 'info';
  }

  function showToast(message, actionLabel, onAction, timeout, options) {
    if (message && typeof message === 'object') {
      options = message;
      message = options.title || options.message || '';
      actionLabel = options.actionLabel;
      onAction = options.onAction;
      timeout = options.timeout;
    }
    if (!toastContainer) return;
    options = options || {};
    var title = options.title || message;
    var detail = options.detail || '';
    var kind = options.kind || inferToastKind(title + ' ' + detail);
    var duration = timeout || options.timeout || 6000;

    while (toastContainer.children.length >= 3) {
      var oldest = toastContainer.firstElementChild;
      if (!oldest) break;
      oldest.remove();
    }

    var toast = document.createElement('div');
    toast.className = 'toast kind-' + kind;
    toast.setAttribute('role', 'status');
    toast.style.setProperty('--toast-duration', duration + 'ms');

    var icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = TOAST_ICONS[options.icon] || TOAST_ICONS[kind] || TOAST_ICONS.info;

    var body = document.createElement('div');
    body.className = 'toast-body';
    var titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.textContent = title;
    body.appendChild(titleEl);
    if (detail) {
      var detailEl = document.createElement('div');
      detailEl.className = 'toast-detail';
      detailEl.textContent = detail;
      body.appendChild(detailEl);
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Bildirimi kapat');
    close.textContent = '×';

    toast.appendChild(icon);
    toast.appendChild(body);
    toast.appendChild(close);

    if (actionLabel && onAction) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = actionLabel;
      btn.addEventListener('click', function () { dismiss(); onAction(); });
      toast.appendChild(btn);
    }

    var progress = document.createElement('span');
    progress.className = 'toast-progress';
    toast.appendChild(progress);

    var timer = null;
    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      if (timer) { clearTimeout(timer); timer = null; }
      toast.classList.add('toast-out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 190);
    }

    close.addEventListener('click', dismiss);
    toastContainer.appendChild(toast);
    timer = setTimeout(dismiss, duration);
    return toast;
  }

  // ============ ONAY PENCERESİ ============
  var activeConfirmClose = null;
  var CONFIRM_ICONS = {
    trash: TOAST_ICONS.warning,
    alert: TOAST_ICONS.danger,
    account: TOAST_ICONS.account,
    info: TOAST_ICONS.info
  };

  function showConfirm(opts) {
    opts = opts || {};
    if (activeConfirmClose) activeConfirmClose(false);
    return new Promise(function (resolve) {
      var previousFocus = document.activeElement;
      var tone = opts.tone || 'danger';
      var iconKey = opts.icon || (tone === 'account' ? 'account' : (tone === 'danger' ? 'alert' : 'info'));
      var overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      var card = document.createElement('div');
      card.className = 'confirm-card tone-' + tone;
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');

      var top = document.createElement('div');
      top.className = 'confirm-top';
      var icon = document.createElement('div');
      icon.className = 'confirm-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = CONFIRM_ICONS[iconKey] || CONFIRM_ICONS.info;
      var head = document.createElement('div');
      var kicker = document.createElement('div');
      kicker.className = 'confirm-kicker';
      kicker.textContent = opts.kicker || (tone === 'danger' ? 'DİKKAT' : 'ONAY');
      var title = document.createElement('div');
      title.className = 'confirm-title';
      title.id = 'confirm-title-' + Date.now();
      title.textContent = opts.title || 'Emin misin?';
      card.setAttribute('aria-labelledby', title.id);
      head.appendChild(kicker);
      head.appendChild(title);
      top.appendChild(icon);
      top.appendChild(head);
      card.appendChild(top);

      if (opts.message) {
        var msg = document.createElement('p');
        msg.className = 'confirm-message';
        msg.textContent = opts.message;
        card.appendChild(msg);
      }
      if (opts.detail) {
        var detail = document.createElement('p');
        detail.className = 'confirm-detail';
        detail.textContent = opts.detail;
        card.appendChild(detail);
      }
      if (opts.subject) {
        var subject = document.createElement('div');
        subject.className = 'confirm-subject';
        var subjectIcon = document.createElement('span');
        subjectIcon.setAttribute('aria-hidden', 'true');
        subjectIcon.innerHTML = CONFIRM_ICONS[iconKey] || TOAST_ICONS.info;
        var subjectText = document.createElement('span');
        subjectText.textContent = opts.subject;
        subject.appendChild(subjectIcon);
        subject.appendChild(subjectText);
        card.appendChild(subject);
      }

      var actions = document.createElement('div');
      actions.className = 'confirm-actions';
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'confirm-btn confirm-btn-ghost';
      cancel.textContent = opts.cancelLabel || 'Vazgeç';
      var confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'confirm-btn ' + (tone === 'danger' ? 'confirm-btn-danger' : 'confirm-btn-primary');
      confirm.textContent = opts.confirmLabel || 'Onayla';
      actions.appendChild(cancel);
      actions.appendChild(confirm);
      card.appendChild(actions);
      overlay.appendChild(card);

      var closed = false;
      function close(result) {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey, true);
        overlay.classList.add('confirm-out');
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          if (activeConfirmClose === close) activeConfirmClose = null;
          if (previousFocus && previousFocus.focus) {
            try { previousFocus.focus(); } catch (e) {}
          }
        }, 180);
        resolve(result);
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          close(false);
          return;
        }
        if (e.key !== 'Tab') return;
        var focusables = Array.prototype.slice.call(card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(function (el) {
          return !el.disabled;
        });
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }

      cancel.addEventListener('click', function () { close(false); });
      confirm.addEventListener('click', function () { close(true); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(overlay);
      activeConfirmClose = close;
      requestAnimationFrame(function () {
        overlay.classList.add('open');
        if (tone === 'danger') cancel.focus(); else confirm.focus();
      });
    });
  }

  window.YazNotConfirm = showConfirm;

  // ============ HESAP DEĞİŞTİRME ============
  var activeSwitchOverlay = null;
  function hideSwitchOverlay() {
    if (!activeSwitchOverlay) return;
    var el = activeSwitchOverlay;
    activeSwitchOverlay = null;
    el.classList.remove('open');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 170);
  }

  function showSwitchOverlay(account) {
    hideSwitchOverlay();
    var email = account && account.email ? account.email : '';
    var name = account && account.name ? account.name : '';
    var initial = (name || email || 'Y').trim().charAt(0).toUpperCase();
    var overlay = document.createElement('div');
    overlay.className = 'switch-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');

    var card = document.createElement('div');
    card.className = 'switch-card';
    var avatar = document.createElement('div');
    avatar.className = 'switch-avatar';
    avatar.textContent = initial;
    var ring = document.createElement('span');
    ring.className = 'switch-ring';
    ring.setAttribute('aria-hidden', 'true');
    avatar.appendChild(ring);
    var title = document.createElement('div');
    title.className = 'switch-title';
    title.textContent = 'Hesap değiştiriliyor';
    var emailEl = document.createElement('div');
    emailEl.className = 'switch-email';
    emailEl.textContent = email || 'Yeni hesap hazırlanıyor';
    var status = document.createElement('div');
    status.className = 'switch-status';
    status.textContent = 'Bağlantı kuruluyor';
    var line = document.createElement('div');
    line.className = 'switch-line';
    line.appendChild(document.createElement('span'));

    card.appendChild(avatar);
    card.appendChild(title);
    card.appendChild(emailEl);
    card.appendChild(status);
    card.appendChild(line);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('open'); });
    activeSwitchOverlay = overlay;
    return hideSwitchOverlay;
  }

  // ============ MENÜLER (⋯) ============
  // Ekrandaki düğme sayısını azaltmak için ikincil işlemler açılır menülerde
  // toplanır. Menü tetikleyicileri tek yerden yönetilir.
  var MENU_TRIGGERS = {
    'btn-sidebar-more': 'sidebar-more-menu',
    'btn-section-more': 'section-more-menu',
    'btn-group-more': 'group-more-menu',
    'btn-editor-more': 'editor-more-menu'
  };
  var menuTriggers = [];

  function closeMenus(exceptId) {
    Object.keys(MENU_TRIGGERS).forEach(function (triggerId) {
      var menuId = MENU_TRIGGERS[triggerId];
      if (exceptId && menuId === exceptId) return;
      var menu = document.getElementById(menuId);
      var trigger = document.getElementById(triggerId);
      if (menu) menu.classList.add('hidden');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function toggleMenu(triggerId) {
    var menuId = MENU_TRIGGERS[triggerId];
    if (!menuId) return;
    var menu = document.getElementById(menuId);
    var trigger = document.getElementById(triggerId);
    if (!menu || !trigger) return;
    var willOpen = menu.classList.contains('hidden');
    closeMenus(willOpen ? menuId : null);
    menu.classList.toggle('hidden', !willOpen);
    trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  }

  function setupMenus() {
    Object.keys(MENU_TRIGGERS).forEach(function (triggerId) {
      var trigger = document.getElementById(triggerId);
      var menu = document.getElementById(MENU_TRIGGERS[triggerId]);
      if (!trigger || !menu) return;
      menuTriggers.push(trigger);
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(triggerId);
      });
      // Bir menü öğesine tıklanınca menü kapanır; işlem kendi dinleyicisinde çalışır.
      menu.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.menu-item')) {
          setTimeout(function () { closeMenus(); }, 0);
        }
      });
      menu.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        closeMenus();
        trigger.focus();
      });
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.menu-anchor')) return;
      closeMenus();
    });
    window.addEventListener('resize', function () { closeMenus(); });
  }

  // ============ KULLANIM KILAVUZU ============
  function openGuide(opts) {
    if (window.YazNotGuide && typeof window.YazNotGuide.open === 'function') {
      window.YazNotGuide.open(opts || {});
      return;
    }
    showToast('Kullanım kılavuzu bu sürümde bulunamadı');
  }

  function guideSeenKey() {
    var uid = (window.api && typeof window.api.getActiveUid === 'function') ? window.api.getActiveUid() : null;
    return 'yaznot_guide_seen_1_0' + (uid ? ':' + uid : '');
  }

  // İlk kez giriş yapan kullanıcıya kılavuzu bir kez kendiliğinden göster.
  // Sonrasında sağ alttaki küçük ? düğmesi her zaman erişilebilir.
  function maybeShowGuideFirstRun() {
    if (window.__YAZNOT_TEST__) return;
    if (!window.YazNotGuide || typeof window.YazNotGuide.open !== 'function') return;
    var seen = null;
    try { seen = localStorage.getItem(guideSeenKey()); } catch (e) { return; }
    if (seen) return;
    try { localStorage.setItem(guideSeenKey(), String(Date.now())); } catch (e) {}
    setTimeout(function () {
      if (document.getElementById('auth-overlay').classList.contains('hidden')) {
        openGuide({ welcome: true });
      }
    }, 700);
  }

  function setupGuideButtons() {
    ['btn-guide', 'btn-guide-more', 'btn-guide-editor'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', function () { openGuide({}); });
    });
    var fab = document.getElementById('guide-fab');
    if (fab) fab.addEventListener('click', function () { openGuide({}); });
  }

  // ============ GERİ DÖNÜŞÜM KUTUSU ============
  function trashTypeLabel(type) {
    if (type === 'section') return 'Bölüm';
    if (type === 'group') return 'Grup';
    return 'Not';
  }

  function purgeOldTrash() {
    var cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    var before = trash.length;
    trash = trash.filter(function (e) { return (e.deletedAt || 0) >= cutoff; });
    return before !== trash.length;
  }

  function updateTrashBadge() {
    var badge = document.getElementById('trash-badge');
    if (!badge) return;
    var n = Array.isArray(trash) ? trash.length : 0;
    badge.textContent = n;
    badge.classList.toggle('hidden', n === 0);
  }

  function saveTrash() {
    try { window.api.save(TRASH_KEY, { items: trash }); } catch (e) {}
    updateTrashBadge();
  }

  async function loadTrash() {
    var data = null;
    try { data = await window.api.load(TRASH_KEY); } catch (e) {}
    if (data && Array.isArray(data.items)) trash = data.items;
    if (!Array.isArray(trash)) trash = [];
    if (purgeOldTrash()) saveTrash();
    updateTrashBadge();
  }

  function makeTrashEntry(type, payload, ctx) {
    ctx = ctx || {};
    return {
      id: uid('tr'),
      type: type,
      deletedAt: Date.now(),
      payload: JSON.parse(JSON.stringify(payload)),
      sectionId: ctx.sectionId || null,
      sectionName: ctx.sectionName || '',
      sectionIcon: ctx.sectionIcon || '📁',
      groupId: ctx.groupId || null,
      groupName: ctx.groupName || '',
      index: typeof ctx.index === 'number' ? ctx.index : -1
    };
  }

  function pushTrash(entry) {
    trash.unshift(entry);
    return entry;
  }

  function findSectionById(id) {
    return sections.find(function (s) { return s.id === id; });
  }

  // Bölümü/grupu silinmiş bir notu kurtarmak için açılan güvenli bölüm.
  function ensureRecoverySection() {
    var rec = sections.find(function (s) { return s.recovery === true; });
    if (rec) return rec;
    var maxOrder = sections.reduce(function (m, s) { return Math.max(m, s.sortOrder || 0); }, -1);
    rec = {
      id: uid('s'), name: 'Geri Yüklenenler', structure: 'flat', type: 'list',
      icon: '♻️', color: '#e8c34a', sortOrder: maxOrder + 1, hidden: false,
      recovery: true, items: [], createdAt: Date.now(), updatedAt: Date.now()
    };
    sections.push(rec);
    return rec;
  }

  /**
   * Geri dönüşüm kutusundaki kaydı eski yerine koyar.
   * defer=true ise kaydetme/çizim çağırana bırakılır (toplu geri alma için).
   */
  function restoreTrashEntry(entryId, defer) {
    var idx = -1;
    for (var i = 0; i < trash.length; i++) {
      if (trash[i].id === entryId) { idx = i; break; }
    }
    if (idx === -1) return false;

    var entry = trash.splice(idx, 1)[0];
    var payload = entry.payload || {};
    var restored = false;

    if (entry.type === 'section') {
      if (!findSectionById(payload.id)) {
        var maxOrder = sections.reduce(function (m, s) { return Math.max(m, s.sortOrder || 0); }, -1);
        payload.sortOrder = maxOrder + 1;
        payload.hidden = false;
        sections.push(payload);
        restored = true;
      }
    } else if (entry.type === 'group') {
      var sec = findSectionById(entry.sectionId) || ensureRecoverySection();
      if (sec.structure !== 'grouped') {
        var oldItems = Array.isArray(sec.items) ? sec.items : [];
        sec.structure = 'grouped';
        sec.groups = [];
        if (oldItems.length) {
          sec.groups.push({
            id: uid('g'), name: 'Genel', icon: '📁', sortOrder: 0,
            items: oldItems, createdAt: Date.now(), updatedAt: Date.now()
          });
        }
        delete sec.items;
      }
      if (!Array.isArray(sec.groups)) sec.groups = [];
      if (!sec.groups.some(function (g) { return g.id === payload.id; })) {
        sec.groups.push(payload);
        restored = true;
      }
    } else {
      var targetArr = null;
      var sec2 = findSectionById(entry.sectionId);
      if (sec2) {
        if (entry.groupId) {
          var grp = (sec2.groups || []).find(function (g) { return g.id === entry.groupId; });
          if (grp) {
            if (!Array.isArray(grp.items)) grp.items = [];
            targetArr = grp.items;
          }
        } else if (sec2.structure === 'flat') {
          if (!Array.isArray(sec2.items)) sec2.items = [];
          targetArr = sec2.items;
        }
      }
      if (!targetArr) {
        var rec = ensureRecoverySection();
        if (!Array.isArray(rec.items)) rec.items = [];
        targetArr = rec.items;
      }
      if (!targetArr.some(function (it) { return it.id === payload.id; })) {
        var at = entry.index >= 0 ? Math.min(entry.index, targetArr.length) : targetArr.length;
        targetArr.splice(at, 0, payload);
        restored = true;
      }
    }

    if (defer) return restored;

    saveTrash();
    if (restored) {
      persistSections();
      renderSidebar();
      updateEmptyState();
      if (activeSectionId) refreshActiveView();
    }
    return restored;
  }

  function trashEntryTitle(entry) {
    var p = entry.payload || {};
    if (entry.type === 'section') return p.name || 'Bölüm';
    if (entry.type === 'group') return p.name || 'Grup';
    return p.title || 'Başlıksız';
  }

  function renderTrashList() {
    var listEl = document.getElementById('trash-list');
    if (!listEl) return;
    if (!Array.isArray(trash) || trash.length === 0) {
      listEl.innerHTML = '<div class="trash-empty-state">Geri dönüşüm kutusu boş.<br>Sildiğin notlar 30 gün boyunca burada görünür.</div>';
      return;
    }
    var html = '';
    trash.forEach(function (e) {
      var icon = e.type === 'section' ? (e.payload.icon || '📁')
        : (e.type === 'group' ? '📁' : (e.sectionIcon || '📄'));
      var where = e.type === 'section'
        ? 'Bölüm'
        : (e.sectionName || 'Bölüm') + (e.groupName ? ' › ' + e.groupName : '');
      var count = 0;
      if (e.type === 'section') {
        var p = e.payload || {};
        if (p.structure === 'grouped') {
          (p.groups || []).forEach(function (g) { count += (g.items || []).length; });
        } else {
          count = (p.items || []).length;
        }
      } else if (e.type === 'group') {
        count = ((e.payload && e.payload.items) || []).length;
      }
      var meta = trashTypeLabel(e.type) + ' · ' + where + ' · ' + new Date(e.deletedAt).toLocaleString(localeTag());
      if (count) meta += ' · ' + count + ' not';

      html += '<div class="trash-row">';
      html += '<span class="trash-icon">' + escapeHtml(icon) + '</span>';
      html += '<div class="trash-main">';
      html += '<div class="trash-title">' + escapeHtml(trashEntryTitle(e)) + '</div>';
      html += '<div class="trash-meta">' + escapeHtml(meta) + '</div>';
      html += '</div>';
      html += '<button class="trash-restore" data-restore="' + e.id + '">Geri Yükle</button>';
      html += '</div>';
    });
    listEl.innerHTML = html;
    listEl.querySelectorAll('[data-restore]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ok = restoreTrashEntry(btn.getAttribute('data-restore'));
        renderTrashList();
        if (ok) showToast('Geri yüklendi.', null, null, 2500);
      });
    });
  }

  async function openTrashModal() {
    closeMobileSidebar();
    document.getElementById('trash-modal').classList.remove('hidden');
    document.getElementById('trash-list').innerHTML = '<div class="trash-empty-state">Yükleniyor…</div>';
    await loadTrash();
    renderTrashList();
  }

  function emptyTrash() {
    if (!trash.length) return;
    var count = trash.length;
    window.api.confirm({
      title: 'Geri dönüşüm kutusunu boşalt',
      kicker: 'GERİ DÖNÜŞÜM KUTUSU',
      tone: 'danger',
      icon: 'trash',
      message: count + ' öğe kalıcı olarak silinsin mi?',
      detail: 'Bu işlem geri alınamaz; 30 günlük bekleme süresi atlanır.',
      subject: count + ' öğe · kalıcı silme',
      confirmLabel: 'Kalıcı olarak sil',
      cancelLabel: 'Vazgeç'
    }).then(function (ok) {
      if (!ok) return;
      trash = [];
      saveTrash();
      renderTrashList();
      var trashModal = document.getElementById('trash-modal');
      if (trashModal) trashModal.classList.add('hidden');
      if (toastContainer) {
        while (toastContainer.firstElementChild) toastContainer.firstElementChild.remove();
      }
      showToast({
        kind: 'danger',
        icon: 'warning',
        title: 'Geri dönüşüm kutusu boşaltıldı',
        detail: count + ' öğe kalıcı olarak silindi.'
      });
    });
  }

  function setupTrash() {
    var openBtn = document.getElementById('btn-open-trash');
    if (openBtn) openBtn.addEventListener('click', openTrashModal);
    var modalEl = document.getElementById('trash-modal');
    if (!modalEl) return;
    document.getElementById('trash-close').addEventListener('click', function () { modalEl.classList.add('hidden'); });
    modalEl.addEventListener('click', function (e) { if (e.target === modalEl) modalEl.classList.add('hidden'); });
    document.getElementById('trash-empty').addEventListener('click', emptyTrash);
  }

  // ============ TOPLU İŞLEM ============
  function currentItemContainer() {
    return document.getElementById(groupView.classList.contains('hidden') ? 'items-container' : 'group-items-container');
  }

  function visibleItemRows() {
    var container = currentItemContainer();
    if (!container) return [];
    return Array.prototype.slice.call(container.querySelectorAll('.item, .book-card'));
  }

  function selectedCount() { return Object.keys(selectedIds).length; }

  function syncSelectButtons() {
    ['btn-select-items', 'btn-select-group-items'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.toggle('active', selectionMode);
      var label = btn.querySelector('span:not(.menu-icon)');
      if (label) label.textContent = selectionMode ? 'Bitti' : 'Seç';
      else btn.textContent = selectionMode ? 'Bitti' : 'Seç';
    });
  }

  function updateBulkBar() {
    var bar = document.getElementById('bulk-bar');
    if (!bar) return;
    document.body.classList.toggle('bulk-active', !!selectionMode);
    if (!selectionMode) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    var n = selectedCount();
    document.getElementById('bulk-count').textContent = n === 0 ? 'Not seç' : n + ' not seçildi';
    ['bulk-move', 'bulk-export', 'bulk-delete'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = n === 0;
    });
  }

  function toggleSelectionMode(force) {
    selectionMode = (typeof force === 'boolean') ? force : !selectionMode;
    selectedIds = {};
    lastSelectedIndex = -1;
    syncSelectButtons();
    updateBulkBar();
    if (activeSectionId) refreshActiveView();
  }

  // Görünüm değişirken seçimi sessizce kapatır (yeniden çizim çağırmaz).
  function exitSelectionSilently() {
    if (!selectionMode && selectedCount() === 0) return;
    selectionMode = false;
    selectedIds = {};
    lastSelectedIndex = -1;
    syncSelectButtons();
    updateBulkBar();
  }

  function applySelectionClasses() {
    visibleItemRows().forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.classList.add('selectable');
      row.classList.toggle('selected', !!selectedIds[id]);
      var box = row.querySelector('.item-check');
      if (box) box.classList.toggle('checked', !!selectedIds[id]);
    });
  }

  function applySelectionUi(container) {
    if (!selectionMode || !container) return;
    container.querySelectorAll('.item, .book-card').forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.classList.add('selectable');
      if (selectedIds[id]) row.classList.add('selected');
      if (!row.querySelector('.item-check')) {
        var box = document.createElement('span');
        box.className = 'item-check' + (selectedIds[id] ? ' checked' : '');
        row.insertBefore(box, row.firstChild);
      }
    });
  }

  function toggleItemSelection(id, index, shiftKey) {
    if (!id) return;
    if (shiftKey && lastSelectedIndex >= 0 && index >= 0) {
      var rows = visibleItemRows();
      var from = Math.min(lastSelectedIndex, index);
      var to = Math.max(lastSelectedIndex, index);
      for (var i = from; i <= to; i++) {
        var rid = rows[i] && rows[i].getAttribute('data-id');
        if (rid) selectedIds[rid] = true;
      }
    } else if (selectedIds[id]) {
      delete selectedIds[id];
    } else {
      selectedIds[id] = true;
    }
    lastSelectedIndex = index;
    applySelectionClasses();
    updateBulkBar();
  }

  function selectAllVisible() {
    visibleItemRows().forEach(function (row) {
      var id = row.getAttribute('data-id');
      if (id) selectedIds[id] = true;
    });
    applySelectionClasses();
    updateBulkBar();
  }

  function collectSelectedItems() {
    var arr = getActiveItems();
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      if (selectedIds[arr[i].id]) out.push({ item: arr[i], arr: arr, index: i });
    }
    return out;
  }

  function selectionContext() {
    var s = getActiveSection();
    var g = s && s.structure === 'grouped' ? getActiveGroup() : null;
    return { section: s, group: g };
  }

  function bulkDelete() {
    var picked = collectSelectedItems();
    if (picked.length === 0) return;
    var ctx = selectionContext();
    if (!ctx.section) return;

    var entries = [];
    // Sondan başa silmek indeksleri kaydırmaz.
    picked.slice().sort(function (a, b) { return b.index - a.index; }).forEach(function (x) {
      var entry = makeTrashEntry('item', x.item, {
        sectionId: ctx.section.id, sectionName: ctx.section.name, sectionIcon: ctx.section.icon,
        groupId: ctx.group ? ctx.group.id : null,
        groupName: ctx.group ? ctx.group.name : '',
        index: x.index
      });
      pushTrash(entry);
      entries.push(entry);
      x.arr.splice(x.index, 1);
    });

    var n = entries.length;
    saveTrash();
    persistSections();
    toggleSelectionMode(false);

    showToast({
      kind: 'warning',
      title: n + ' not geri dönüşüme taşındı',
      detail: '30 gün içinde geri yükleyebilirsin.',
      actionLabel: 'Geri Al',
      timeout: 8000,
      onAction: function () {
        entries.forEach(function (e) { restoreTrashEntry(e.id, true); });
        saveTrash();
        persistSections();
        refreshActiveView();
        showToast({ kind: 'success', title: n + ' not geri yüklendi', detail: 'Notlar eski yerinde.' });
      }
    });
  }

  function buildMoveTargets() {
    var out = [];
    sections.forEach(function (s) {
      if (s.structure === 'grouped') {
        (Array.isArray(s.groups) ? s.groups : []).forEach(function (g) {
          out.push({
            sectionId: s.id, groupId: g.id,
            label: (s.icon || '📁') + ' ' + s.name + ' › ' + (g.icon || '📁') + ' ' + g.name
          });
        });
      } else {
        out.push({ sectionId: s.id, groupId: null, label: (s.icon || '📁') + ' ' + s.name });
      }
    });
    return out;
  }

  function openMoveModal() {
    var picked = collectSelectedItems();
    if (picked.length === 0) return;
    moveTargets = buildMoveTargets();
    if (moveTargets.length === 0) { alert('Taşınacak başka bölüm yok.'); return; }

    var select = document.getElementById('move-target');
    select.innerHTML = moveTargets.map(function (t, i) {
      return '<option value="' + i + '">' + escapeHtml(t.label) + '</option>';
    }).join('');

    // Mevcut konumu varsayılan hedef yapma: ilk farklı hedefi seç.
    var ctx = selectionContext();
    var sameIdx = -1;
    for (var i = 0; i < moveTargets.length; i++) {
      var t = moveTargets[i];
      if (t.sectionId === (ctx.section && ctx.section.id) && t.groupId === (ctx.group ? ctx.group.id : null)) {
        sameIdx = i; break;
      }
    }
    if (sameIdx !== -1) {
      for (var j = 0; j < moveTargets.length; j++) {
        if (j !== sameIdx) { select.value = String(j); break; }
      }
    }

    document.getElementById('move-summary').textContent = picked.length + ' not taşınacak.';
    document.getElementById('move-status').textContent = '';
    document.getElementById('move-modal').classList.remove('hidden');
  }

  function closeMoveModal() {
    document.getElementById('move-modal').classList.add('hidden');
  }

  function doMove() {
    var picked = collectSelectedItems();
    var target = moveTargets[parseInt(document.getElementById('move-target').value, 10)];
    if (!target || picked.length === 0) return;

    var destSection = findSectionById(target.sectionId);
    if (!destSection) {
      document.getElementById('move-status').textContent = 'Hedef bölüm bulunamadı.';
      return;
    }
    var destArr;
    if (target.groupId) {
      var grp = (destSection.groups || []).find(function (g) { return g.id === target.groupId; });
      if (!grp) {
        document.getElementById('move-status').textContent = 'Hedef grup bulunamadı.';
        return;
      }
      if (!Array.isArray(grp.items)) grp.items = [];
      destArr = grp.items;
    } else {
      if (!Array.isArray(destSection.items)) destSection.items = [];
      destArr = destSection.items;
    }

    var moved = 0;
    picked.slice().sort(function (a, b) { return b.index - a.index; }).forEach(function (x) {
      if (x.arr === destArr) return;
      x.arr.splice(x.index, 1);
      x.item.updatedAt = Date.now();
      destArr.push(x.item);
      moved++;
    });

    closeMoveModal();
    toggleSelectionMode(false);
    persistSections();
    if (moved) showToast({ kind: 'success', title: moved + ' not taşındı', detail: 'Yeni konum kaydedildi.' });
  }

  function bulkExport() {
    var picked = collectSelectedItems();
    if (picked.length === 0) return;
    var md = picked.map(function (x) {
      return '# ' + (x.item.title || 'Başlıksız') + '\n\n' + htmlToMarkdown(x.item.content);
    }).join('\n\n---\n\n');
    window.api.exportTxt('secilen-notlar', md, 'md').then(function (res) {
      if (res && res.error) alert('Dışa aktarılamadı: ' + res.error);
    });
  }

  function setupBulk() {
    ['btn-select-items', 'btn-select-group-items'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', function () { toggleSelectionMode(); });
    });
    var cancel = document.getElementById('bulk-cancel');
    if (cancel) cancel.addEventListener('click', function () { toggleSelectionMode(false); });
    var all = document.getElementById('bulk-select-all');
    if (all) all.addEventListener('click', selectAllVisible);
    var del = document.getElementById('bulk-delete');
    if (del) del.addEventListener('click', bulkDelete);
    var move = document.getElementById('bulk-move');
    if (move) move.addEventListener('click', openMoveModal);
    var exp = document.getElementById('bulk-export');
    if (exp) exp.addEventListener('click', bulkExport);

    var moveModalEl = document.getElementById('move-modal');
    if (moveModalEl) {
      document.getElementById('move-cancel').addEventListener('click', closeMoveModal);
      document.getElementById('move-confirm').addEventListener('click', doMove);
      moveModalEl.addEventListener('click', function (e) { if (e.target === moveModalEl) closeMoveModal(); });
    }
  }

  // ============ HIZLI ARAMA PALETİ (Ctrl+K) ============
  var paletteOverlay = document.getElementById('palette-overlay');
  var paletteInput = document.getElementById('palette-input');
  var paletteResultsEl = document.getElementById('palette-results');
  var paletteEntries = [];
  var paletteFiltered = [];
  var paletteIndex = 0;

  function collectSearchEntries() {
    var out = [];
    visibleSections().forEach(function (s) {
      function pushItem(it, group) {
        var text = htmlToText(it.content);
        var title = it.title || 'Başlıksız';
        out.push({
          sectionId: s.id,
          groupId: group ? group.id : null,
          itemId: it.id,
          title: title,
          sectionName: s.name,
          groupName: group ? group.name : '',
          icon: s.icon || '📁',
          text: text,
          // Arama için önceden küçük harfe çevrilir (her tuş vuruşunda tekrar çevirmemek için).
          hay: trLower(title + ' ' + text + ' ' + s.name)
        });
      }
      if (s.structure === 'grouped') {
        (Array.isArray(s.groups) ? s.groups : []).forEach(function (g) {
          (Array.isArray(g.items) ? g.items : []).forEach(function (it) { pushItem(it, g); });
        });
      } else {
        (Array.isArray(s.items) ? s.items : []).forEach(function (it) { pushItem(it, null); });
      }
    });
    return out;
  }

  function renderPalette(query) {
    var q = trLower(query);
    paletteFiltered = paletteEntries.filter(function (e) {
      if (!q) return true;
      return e.hay.indexOf(q) !== -1;
    }).slice(0, 40);

    if (paletteFiltered.length === 0) {
      paletteResultsEl.innerHTML = '<div class="palette-empty">Sonuç bulunamadı.</div>';
      paletteIndex = 0;
      return;
    }
    if (paletteIndex >= paletteFiltered.length) paletteIndex = 0;

    var html = '';
    paletteFiltered.forEach(function (e, i) {
      var sub = (e.groupName ? e.groupName + ' › ' : '') + e.sectionName;
      var preview = '';
      if (q && e.text) {
        var idx = trLower(e.text).indexOf(q);
        if (idx !== -1) {
          var start = Math.max(0, idx - 30);
          preview = (start > 0 ? '…' : '') + e.text.slice(start, start + 90);
          if (e.text.length > start + 90) preview += '…';
        }
      }
      html += '<div class="palette-item' + (i === paletteIndex ? ' selected' : '') + '" data-idx="' + i + '">';
      html += '<span class="palette-item-icon">' + escapeHtml(e.icon) + '</span>';
      html += '<div class="palette-item-main">';
      html += '<div class="palette-item-title">' + escapeHtml(e.title) + '</div>';
      html += '<div class="palette-item-sub">' + escapeHtml(sub) + (preview ? ' · ' + escapeHtml(preview) : '') + '</div>';
      html += '</div></div>';
    });
    paletteResultsEl.innerHTML = html;
    paletteResultsEl.querySelectorAll('.palette-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = parseInt(el.getAttribute('data-idx'), 10);
        openPaletteEntry(paletteFiltered[idx]);
      });
    });
  }

  function openPaletteEntry(entry) {
    if (!entry) return;
    closePalette();
    openSection(entry.sectionId);
    if (entry.groupId) openGroup(entry.groupId);
    openItemEditor(entry.itemId);
  }

  function openPalette() {
    paletteEntries = collectSearchEntries();
    paletteIndex = 0;
    paletteInput.value = '';
    renderPalette('');
    paletteOverlay.classList.remove('hidden');
    setTimeout(function () { paletteInput.focus(); }, 0);
  }

  function closePalette() {
    paletteOverlay.classList.add('hidden');
    paletteInput.value = '';
  }

  function movePaletteSelection(delta) {
    if (paletteFiltered.length === 0) return;
    paletteIndex = (paletteIndex + delta + paletteFiltered.length) % paletteFiltered.length;
    renderPalette(paletteInput.value);
    var sel = paletteResultsEl.querySelector('.palette-item.selected');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }

  paletteInput.addEventListener('input', debounce(function () {
    paletteIndex = 0;
    renderPalette(paletteInput.value);
  }, 90));
  paletteInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); movePaletteSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); movePaletteSelection(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); openPaletteEntry(paletteFiltered[paletteIndex]); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  });
  paletteOverlay.addEventListener('click', function (e) { if (e.target === paletteOverlay) closePalette(); });

  // ============ MODAL ============
  var modal = document.getElementById('modal');
  var modalTitle = document.getElementById('modal-title');
  var modalInput = document.getElementById('modal-input');
  var modalCancel = document.getElementById('modal-cancel');
  var modalSave = document.getElementById('modal-save');
  var modalOnSave = null;
  function openModal(opts) {
    modalTitle.textContent = opts.title || '';
    modalInput.value = opts.initialValue || '';
    modalInput.placeholder = opts.placeholder || '';
    modalOnSave = opts.onSave || null;
    modal.classList.remove('hidden');
    setTimeout(function () { modalInput.focus(); modalInput.select(); }, 0);
  }
  function closeModal() { modal.classList.add('hidden'); modalOnSave = null; }
  modalCancel.addEventListener('click', closeModal);
  modalSave.addEventListener('click', function () {
    var value = modalInput.value.trim();
    if (!value) return;
    var cb = modalOnSave;
    closeModal();
    if (cb) cb(value);
  });
  modalInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); modalSave.click(); }
    else if (e.key === 'Escape') closeModal();
  });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  // ============ SECTION MODAL ============
  var sectionModal = document.getElementById('section-modal');
  var sectionModalTitle = document.getElementById('section-modal-title');
  var sectionModalName = document.getElementById('section-modal-name');
  var sectionModalStructure = document.getElementById('section-modal-structure');
  var sectionModalType = document.getElementById('section-modal-type');
  var sectionModalEmoji = document.getElementById('section-modal-emoji');
  var sectionModalCancel = document.getElementById('section-modal-cancel');
  var sectionModalSave = document.getElementById('section-modal-save');
  var sectionModalOnSave = null;
  var selectedStructure = 'flat';
  var selectedType = 'list';
  var selectedEmoji = '📚';
  var selectedColor = '#ff6126';
  var sectionModalEmojiCustom = document.getElementById('section-modal-emoji-custom');
  var sectionModalColor = document.getElementById('section-modal-color');

  sectionModalStructure.addEventListener('click', function (e) {
    var btn = e.target.closest('.structure-option');
    if (!btn) return;
    sectionModalStructure.querySelectorAll('.structure-option').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    selectedStructure = btn.getAttribute('data-structure');
  });
  sectionModalType.addEventListener('click', function (e) {
    var btn = e.target.closest('.type-option');
    if (!btn) return;
    sectionModalType.querySelectorAll('.type-option').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    selectedType = btn.getAttribute('data-type');
  });
  sectionModalEmoji.addEventListener('click', function (e) {
    var btn = e.target.closest('.emoji-option');
    if (!btn) return;
    sectionModalEmoji.querySelectorAll('.emoji-option').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    selectedEmoji = btn.getAttribute('data-emoji');
    sectionModalEmojiCustom.value = '';
  });

  sectionModalEmojiCustom.addEventListener('input', function () {
    var v = sectionModalEmojiCustom.value.trim();
    if (!v) return;
    selectedEmoji = v;
    sectionModalEmoji.querySelectorAll('.emoji-option').forEach(function (b) { b.classList.remove('active'); });
  });

  if (sectionModalColor) {
    sectionModalColor.addEventListener('click', function (e) {
      var btn = e.target.closest('.color-option');
      if (!btn) return;
      sectionModalColor.querySelectorAll('.color-option').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      selectedColor = btn.getAttribute('data-color');
    });
  }

  function openSectionModal(opts) {
    sectionModalTitle.textContent = opts.title || 'Yeni Bölüm';
    sectionModalName.value = opts.initialName || '';
    selectedStructure = opts.initialStructure || 'flat';
    selectedType = opts.initialType || 'list';
    selectedEmoji = opts.initialEmoji || '📚';
    selectedColor = opts.initialColor || '#ff6126';
    sectionModalEmojiCustom.value = '';
    sectionModalStructure.querySelectorAll('.structure-option').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-structure') === selectedStructure);
    });
    sectionModalType.querySelectorAll('.type-option').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-type') === selectedType);
    });
    var matched = false;
    sectionModalEmoji.querySelectorAll('.emoji-option').forEach(function (b) {
      var isMatch = b.getAttribute('data-emoji') === selectedEmoji;
      if (isMatch) matched = true;
      b.classList.toggle('active', isMatch);
    });
    if (!matched) {
      sectionModalEmoji.querySelectorAll('.emoji-option').forEach(function (b) { b.classList.remove('active'); });
      sectionModalEmojiCustom.value = selectedEmoji;
    }
    if (sectionModalColor) {
      sectionModalColor.querySelectorAll('.color-option').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-color') === selectedColor);
      });
    }
    sectionModalOnSave = opts.onSave || null;
    sectionModal.classList.remove('hidden');
    setTimeout(function () { sectionModalName.focus(); sectionModalName.select(); }, 0);
  }
  function closeSectionModal() {
    sectionModal.classList.add('hidden');
    sectionModalOnSave = null;
  }
  sectionModalCancel.addEventListener('click', closeSectionModal);
  sectionModalSave.addEventListener('click', function () {
    var name = sectionModalName.value.trim();
    if (!name) { sectionModalName.focus(); return; }
    var cb = sectionModalOnSave;
    var structure = selectedStructure;
    var type = selectedType;
    var emoji = selectedEmoji;
    var color = selectedColor;
    closeSectionModal();
    if (cb) cb({ name: name, structure: structure, type: type, emoji: emoji, color: color });
  });
  sectionModalName.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); sectionModalSave.click(); }
    else if (e.key === 'Escape') closeSectionModal();
  });
  sectionModal.addEventListener('click', function (e) { if (e.target === sectionModal) closeSectionModal(); });

  // ============ SIDEBAR ============
  var navSections = document.getElementById('nav-sections');
  var emptySectionsView = document.getElementById('sections-empty-view');
  var sectionView = document.getElementById('section-view');
  var groupView = document.getElementById('group-view');
  var itemEditorView = document.getElementById('item-editor-view');

  function visibleSections() {
    return sections
      .filter(function (s) { return !settings.hiddenSections[s.id]; })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
  }

  function renderSidebar() {
    var list = visibleSections();
    var html = '';
    list.forEach(function (s) {
      var isActive = s.id === activeSectionId ? ' active' : '';
      var accent = /^#[0-9a-fA-F]{6}$/.test(s.color || '') ? s.color : '';
      html += '<button class="nav-btn' + isActive + '" data-section-id="' + s.id + '" draggable="true"' +
        (accent ? ' style="--accent:' + accent + '"' : '') + ' title="' + escapeHtml(s.name) + '">';
      html += '<span class="nav-btn-emoji">' + escapeHtml(s.icon || '📁') + '</span>';
      html += '<span class="nav-btn-label">' + escapeHtml(s.name) + '</span>';
      html += '</button>';
    });
    navSections.innerHTML = html;

    navSections.querySelectorAll('.nav-btn').forEach(function (btn) {
      var sid = btn.getAttribute('data-section-id');
      btn.addEventListener('click', function () { openSection(sid); closeMobileSidebar(); });
      bindContextMenuTrigger(btn, function (x, y) { showSectionContextMenu(x, y, sid); });
      btn.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/section-id', sid);
        e.dataTransfer.effectAllowed = 'move';
        btn.classList.add('dragging');
      });
      btn.addEventListener('dragend', function () { btn.classList.remove('dragging'); });
      btn.addEventListener('dragover', function (e) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        btn.classList.add('drag-over');
      });
      btn.addEventListener('dragleave', function () { btn.classList.remove('drag-over'); });
      btn.addEventListener('drop', function (e) {
        e.preventDefault(); btn.classList.remove('drag-over');
        var fromId = e.dataTransfer.getData('text/section-id');
        var toId = sid;
        if (!fromId || fromId === toId) return;
        reorderSections(fromId, toId);
      });
    });
  }

  function reorderSections(fromId, toId) {
    var list = visibleSections();
    var fromIdx = list.findIndex(function (s) { return s.id === fromId; });
    var toIdx = list.findIndex(function (s) { return s.id === toId; });
    if (fromIdx === -1 || toIdx === -1) return;
    var moved = list.splice(fromIdx, 1)[0];
    list.splice(toIdx, 0, moved);
    list.forEach(function (s, i) { s.sortOrder = i; });
    var hidden = sections.filter(function (s) { return settings.hiddenSections[s.id]; });
    hidden.forEach(function (s, i) { s.sortOrder = list.length + i; });
    persistSections();
    renderSidebar();
  }

  function showSectionContextMenu(x, y, sid) {
    var s = sections.find(function (sec) { return sec.id === sid; });
    if (!s) return;
    var items = [
      { label: 'Yeniden Adlandır', action: function () { renameSection(sid); } },
      { label: 'Simge Değiştir', action: function () { editSectionModal(sid); } },
      { label: 'Görünüm Tipi Değiştir', action: function () { editSectionModal(sid); } }
    ];
    if (s.structure === 'flat') {
      items.push({ label: 'Alt Kategorili Yap', action: function () { convertToGrouped(sid); } });
    } else {
      items.push({ label: 'Düz Yap (grupları kaldır)', action: function () { convertToFlat(sid); } });
    }
    items.push({ label: '📄 Markdown Olarak Dışa Aktar', action: function () { exportSectionMarkdown(sid); } });
    items.push({ label: '📤 Paylaş', action: function () { openShareSend('section', sid); } });
    items.push({ label: 'Gizle', action: function () { hideSection(sid); } });
    items.push({ label: 'Sil', action: function () { deleteSection(sid); } });
    showContextMenu(x, y, items);
  }

  function renameSection(sid) {
    var s = sections.find(function (sec) { return sec.id === sid; });
    if (!s) return;
    openModal({
      title: 'Bölümü Yeniden Adlandır',
      initialValue: s.name, placeholder: 'Bölüm adı',
      onSave: function (newName) {
        s.name = newName; persistSections(); renderSidebar();
        if (activeSectionId === sid) renderSectionView();
      }
    });
  }

  function editSectionModal(sid) {
    var s = sections.find(function (sec) { return sec.id === sid; });
    if (!s) return;
    openSectionModal({
      title: 'Bölümü Düzenle',
      initialName: s.name,
      initialStructure: s.structure || 'flat',
      initialType: s.type || 'list',
      initialEmoji: s.icon || '📚',
      initialColor: s.color || '#ff6126',
      onSave: function (data) {
        s.name = data.name; s.type = data.type; s.icon = data.emoji;
        s.color = data.color;
        s.updatedAt = Date.now();
        if (data.structure !== s.structure) {
          if (data.structure === 'grouped') convertToGrouped(sid, false);
          else convertToFlat(sid, false);
        }
        persistSections(); renderSidebar();
        if (activeSectionId === sid) renderSectionView();
      }
    });
  }

  function convertToGrouped(sid, doPersist) {
    var s = sections.find(function (sec) { return sec.id === sid; });
    if (!s) return;
    if (s.structure === 'grouped') return;
    var oldItems = Array.isArray(s.items) ? s.items : [];
    s.structure = 'grouped';
    s.groups = [];
    if (oldItems.length > 0) {
      s.groups.push({
        id: uid('g'),
        name: 'Genel',
        icon: '📁',
        items: oldItems,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    delete s.items;
    if (doPersist !== false) {
      persistSections();
      if (activeSectionId === sid) renderSectionView();
    }
  }

  function convertToFlat(sid, doPersist) {
    var s = sections.find(function (sec) { return sec.id === sid; });
    if (!s) return;
    if (s.structure !== 'grouped') return;
    var groups = Array.isArray(s.groups) ? s.groups : [];
    var allItems = [];
    groups.forEach(function (g) {
      if (Array.isArray(g.items)) {
        g.items.forEach(function (it) { allItems.push(it); });
      }
    });
    s.structure = 'flat';
    s.items = allItems;
    delete s.groups;
    if (doPersist !== false) {
      persistSections();
      if (activeSectionId === sid) renderSectionView();
    }
  }

  function hideSection(sid) {
    var visible = visibleSections();
    if (visible.length <= 1 && visible[0] && visible[0].id === sid) {
      alert('En az bir bölüm görünür kalmalı.');
      return;
    }
    settings.hiddenSections[sid] = true;
    saveSettings();
    if (activeSectionId === sid) {
      var remaining = visible.filter(function (s) { return s.id !== sid; });
      if (remaining.length > 0) openSection(remaining[0].id);
      else closeAll();
    }
    renderSidebar();
  }

  function deleteSection(sid) {
    var s = sections.find(function (sec) { return sec.id === sid; });
    if (!s) return;
    var count = 0;
    if (s.structure === 'grouped' && Array.isArray(s.groups)) {
      s.groups.forEach(function (g) { count += (g.items ? g.items.length : 0); });
    } else if (Array.isArray(s.items)) {
      count = s.items.length;
    }
    window.api.confirm({
      title: 'Bölümü Geri Dönüşüme Taşı',
      message: '"' + s.name + '" bölümü silinsin mi?',
      detail: count + ' not ile birlikte geri dönüşüm kutusuna taşınacak. 30 gün içinde geri yükleyebilirsin.',
      confirmLabel: 'Geri Dönüşüme Taşı'
    }).then(function (ok) {
      if (!ok) return;
      var entry = pushTrash(makeTrashEntry('section', s, {
        sectionId: s.id, sectionName: s.name, sectionIcon: s.icon
      }));
      sections = sections.filter(function (sec) { return sec.id !== sid; });
      delete settings.hiddenSections[sid];
      if (selectionMode) toggleSelectionMode(false);
      saveSettings(); saveTrash(); persistSections();
      if (activeSectionId === sid) closeAll();
      renderSidebar(); updateEmptyState();
      showToast({
        kind: 'warning',
        title: 'Bölüm geri dönüşüme taşındı',
        detail: '"' + s.name + '" · 30 gün içinde geri yükleyebilirsin.',
        actionLabel: 'Geri Al',
        timeout: 8000,
        onAction: function () { restoreTrashEntry(entry.id); }
      });
    });
  }

  // ============ VIEWS ============
  function updateEmptyState() {
    var hasSections = sections.length > 0;
    if (!hasSections) {
      emptySectionsView.classList.remove('hidden');
      sectionView.classList.add('hidden');
      groupView.classList.add('hidden');
      itemEditorView.classList.add('hidden');
    } else {
      emptySectionsView.classList.add('hidden');
    }
  }

  function closeAll() {
    activeSectionId = null; activeGroupId = null; activeItemId = null;
    sectionView.classList.add('hidden');
    groupView.classList.add('hidden');
    itemEditorView.classList.add('hidden');
    document.body.classList.remove('editing', 'editor-compact', 'view-group');
    renderSidebar(); updateEmptyState();
  }

  function openSection(sid) {
    activeSectionId = sid; activeGroupId = null; activeItemId = null;
    document.body.classList.remove('view-group');
    exitSelectionSilently();
    resetSearchQueries();
    emptySectionsView.classList.add('hidden');
    groupView.classList.add('hidden');
    itemEditorView.classList.add('hidden');
    document.body.classList.remove('editing', 'editor-compact');
    sectionView.classList.remove('hidden');
    var mc = document.getElementById('main-content');
    if (mc) mc.scrollTop = 0;
    renderSidebar();
    renderSectionView();
  }

  function resetSearchQueries() {
    searchItemsQuery = '';
    var a = document.getElementById('search-items');
    var b = document.getElementById('group-search');
    if (a) a.value = '';
    if (b) b.value = '';
  }

  function openGroup(gid) {
    activeGroupId = gid; activeItemId = null;
    document.body.classList.add('view-group');
    exitSelectionSilently();
    resetSearchQueries();
    sectionView.classList.add('hidden');
    itemEditorView.classList.add('hidden');
    document.body.classList.remove('editing', 'editor-compact');
    groupView.classList.remove('hidden');
    var mc = document.getElementById('main-content');
    if (mc) mc.scrollTop = 0;
    renderGroupView();
  }

  function backToSection() {
    activeGroupId = null; activeItemId = null;
    document.body.classList.remove('view-group');
    groupView.classList.add('hidden');
    itemEditorView.classList.add('hidden');
    document.body.classList.remove('editing', 'editor-compact');
    sectionView.classList.remove('hidden');
    renderSectionView();
  }

  // ============ SECTION VIEW ============
  function renderSectionView() {
    var s = getActiveSection();
    if (!s) { closeAll(); return; }

    document.getElementById('section-title').textContent = s.name;
    document.getElementById('section-icon-display').textContent = s.icon || '📁';

    var searchInput = document.getElementById('search-items');
    var btnNew = document.getElementById('btn-new-item');
    var container = document.getElementById('items-container');
    var importBtn = document.getElementById('btn-import-section');
    var selectBtn = document.getElementById('btn-select-items');
    var searchWrap = document.getElementById('section-search-wrap');
    var subEl = document.getElementById('section-sub');
    var newLabel = btnNew ? btnNew.querySelector('span') : null;

    if (s.structure === 'grouped') {
      if (searchWrap) searchWrap.style.display = 'none';
      if (newLabel) newLabel.textContent = 'Yeni grup';
      else if (btnNew) btnNew.textContent = '+ Yeni Grup';
      if (btnNew) {
        btnNew.setAttribute('aria-label', 'Yeni grup');
        btnNew.setAttribute('title', 'Yeni grup oluştur');
      }
      if (importBtn) importBtn.style.display = 'none';
      if (selectBtn) selectBtn.style.display = 'none';
      var groups = Array.isArray(s.groups) ? s.groups : [];
      var noteTotal = groups.reduce(function (n, g) { return n + (Array.isArray(g.items) ? g.items.length : 0); }, 0);
      if (subEl) subEl.textContent = groups.length + ' grup · ' + noteTotal + ' not';
      renderGroupsGrid(s, container);
    } else {
      if (searchWrap) searchWrap.style.display = '';
      searchInput.style.display = '';
      searchInput.placeholder = s.name + ' içinde ara';
      if (newLabel) newLabel.textContent = 'Yeni öğe';
      else if (btnNew) btnNew.textContent = '+ Yeni Öğe';
      if (btnNew) {
        btnNew.setAttribute('aria-label', 'Yeni öğe');
        btnNew.setAttribute('title', 'Yeni öğe (Ctrl+N)');
      }
      if (importBtn) importBtn.style.display = '';
      if (selectBtn) selectBtn.style.display = '';
      var itemCount = Array.isArray(s.items) ? s.items.length : 0;
      if (subEl) subEl.textContent = itemCount + ' not';
      renderItemsList(s.items || [], s.type || 'list', container);
    }
  }

  function renderGroupsGrid(s, container) {
    var groups = Array.isArray(s.groups) ? s.groups.slice() : [];
    groups.sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });

    if (groups.length === 0) {
      container.className = 'list-container';
      container.innerHTML = '<p class="empty-state">Bu bölümde henüz grup yok. Yukarıdaki &quot;+ Yeni Grup&quot; butonuna tıklayarak başlayın.</p>';
      return;
    }

    container.className = 'grid-container';
    var html = '';
    groups.forEach(function (g) {
      var itemCount = Array.isArray(g.items) ? g.items.length : 0;
      html += '<div class="book-card group-card" data-gid="' + g.id + '">';
      html += '<div class="book-card-title">' + escapeHtml(g.name) + '</div>';
      html += '<div class="book-card-meta">' + itemCount + ' öğe</div>';
      html += '<button class="book-card-delete" data-gid="' + g.id + '" title="Sil">×</button>';
      html += '</div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.group-card').forEach(function (card) {
      var gid = card.getAttribute('data-gid');
      card.addEventListener('click', function (e) {
        if (e.target.classList.contains('book-card-delete')) return;
        openGroup(gid);
      });
      bindContextMenuTrigger(card, function (x, y) { showGroupContextMenu(x, y, gid); });
    });
    container.querySelectorAll('.book-card-delete').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteGroup(el.getAttribute('data-gid'));
      });
    });
  }

  function showGroupContextMenu(x, y, gid) {
    showContextMenu(x, y, [
      { label: 'Aç', action: function () { openGroup(gid); } },
      { label: 'Yeniden Adlandır', action: function () { renameGroup(gid); } },
      { label: '📤 Paylaş', action: function () { openShareSend('group', gid); } },
      { label: 'Sil', action: function () { deleteGroup(gid); } }
    ]);
  }

  function renameGroup(gid) {
    var s = getActiveSection();
    if (!s || !Array.isArray(s.groups)) return;
    var g = s.groups.find(function (x) { return x.id === gid; });
    if (!g) return;
    openModal({
      title: 'Grubu Yeniden Adlandır',
      initialValue: g.name, placeholder: 'Grup adı',
      onSave: function (newName) {
        g.name = newName; persistSections();
        renderSectionView();
      }
    });
  }

  function deleteGroup(gid) {
    var s = getActiveSection();
    if (!s || !Array.isArray(s.groups)) return;
    var g = s.groups.find(function (x) { return x.id === gid; });
    if (!g) return;
    var count = Array.isArray(g.items) ? g.items.length : 0;
    window.api.confirm({
      title: 'Grubu Geri Dönüşüme Taşı',
      message: '"' + g.name + '" grubu silinsin mi?',
      detail: count + ' not ile birlikte geri dönüşüm kutusuna taşınacak.',
      confirmLabel: 'Geri Dönüşüme Taşı'
    }).then(function (ok) {
      if (!ok) return;
      var index = s.groups.indexOf(g);
      var entry = pushTrash(makeTrashEntry('group', g, {
        sectionId: s.id, sectionName: s.name, sectionIcon: s.icon, index: index
      }));
      s.groups = s.groups.filter(function (x) { return x.id !== gid; });
      saveTrash(); persistSections();
      renderSectionView();
      showToast({
        kind: 'warning',
        title: 'Grup geri dönüşüme taşındı',
        detail: '"' + g.name + '" · 30 gün içinde geri yükleyebilirsin.',
        actionLabel: 'Geri Al',
        timeout: 8000,
        onAction: function () { restoreTrashEntry(entry.id); }
      });
    });
  }

  function bindItemRows(container) {
    applySelectionUi(container);
    container.querySelectorAll('.item, .book-card').forEach(function (row, index) {
      row.addEventListener('click', function (e) {
        if (e.target.classList.contains('item-delete') || e.target.classList.contains('book-card-delete')) return;
        var id = row.getAttribute('data-id');
        if (selectionMode) { toggleItemSelection(id, index, e.shiftKey); return; }
        openItemEditor(id);
      });
    });
  }

  function renderItemsList(items, type, container) {
    var q = trLower(searchItemsQuery);
    var filtered = items.filter(function (it) {
      if (!q) return true;
      if (it.title && trLower(it.title).indexOf(q) !== -1) return true;
      if (it.content && trLower(stripHtml(it.content)).indexOf(q) !== -1) return true;
      return false;
    });

    if (items.length === 0) {
      container.className = 'list-container';
      container.innerHTML = '<p class="empty-state">Burada henüz öğe yok. Yukarıdaki &quot;+ Yeni Öğe&quot; butonuna tıklayarak başlayın.</p>';
      return;
    }
    if (filtered.length === 0) {
      container.className = 'list-container';
      container.innerHTML = '<p class="empty-state">Aramanızla eşleşen öğe bulunamadı.</p>';
      return;
    }

    if (type === 'grid') {
      container.className = 'grid-container';
      var gHtml = '';
      filtered.forEach(function (it) {
        var words = countWordsInHtml(it.content);
        gHtml += '<div class="book-card" data-id="' + it.id + '">';
        gHtml += '<div class="book-card-title">' + escapeHtml(it.title || 'Başlıksız') + '</div>';
        gHtml += '<div class="book-card-meta">' + words.toLocaleString(localeTag()) + ' kelime</div>';
        gHtml += '<button class="book-card-delete" data-id="' + it.id + '" title="Sil">×</button>';
        gHtml += '</div>';
      });
      container.innerHTML = gHtml;
      bindItemRows(container);
      container.querySelectorAll('.book-card-delete').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          deleteItem(el.getAttribute('data-id'));
        });
      });
    } else {
      container.className = 'list-container';
      var lHtml = '';
      filtered.forEach(function (it) {
        var preview = '';
        if (it.content) {
          var t = stripHtml(it.content).replace(/\s+/g, ' ');
          if (t) preview = ' <span class="item-preview">' + escapeHtml(t.slice(0, 60)) + (t.length > 60 ? '…' : '') + '</span>';
        }
        lHtml += '<div class="item" data-id="' + it.id + '">';
        lHtml += '<span class="item-title">' + escapeHtml(it.title || 'Başlıksız') + preview + '</span>';
        lHtml += '<button class="item-delete" data-id="' + it.id + '" title="Sil">×</button>';
        lHtml += '</div>';
      });
      container.innerHTML = lHtml;
      bindItemRows(container);
      container.querySelectorAll('.item-delete').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          deleteItem(el.getAttribute('data-id'));
        });
      });
    }
  }

  function deleteItem(itemId) {
    var s = getActiveSection();
    if (!s) return;
    var arr = null;
    var g = null;
    if (s.structure === 'grouped') {
      g = getActiveGroup();
      if (g && Array.isArray(g.items)) arr = g.items;
    } else if (Array.isArray(s.items)) {
      arr = s.items;
    }
    if (!arr) return;
    var idx = -1;
    for (var i = 0; i < arr.length; i++) { if (arr[i].id === itemId) { idx = i; break; } }
    if (idx === -1) return;

    var removed = arr.splice(idx, 1)[0];
    if (activeItemId === itemId) {
      activeItemId = null;
      itemEditorView.classList.add('hidden');
      document.body.classList.remove('editing', 'editor-compact');
    }

    var entry = pushTrash(makeTrashEntry('item', removed, {
      sectionId: s.id, sectionName: s.name, sectionIcon: s.icon,
      groupId: g ? g.id : null, groupName: g ? g.name : '', index: idx
    }));

    saveTrash();
    persistSections();
    if (s.structure === 'grouped') renderGroupView(); else renderSectionView();
    if (selectionMode) { delete selectedIds[itemId]; applySelectionClasses(); updateBulkBar(); }

    showToast({
      kind: 'warning',
      title: 'Not geri dönüşüme taşındı',
      detail: '"' + (removed.title || 'Başlıksız not') + '" · 30 gün içinde geri yükleyebilirsin.',
      actionLabel: 'Geri Al',
      timeout: 8000,
      onAction: function () { restoreTrashEntry(entry.id); }
    });
  }

  document.getElementById('search-items').addEventListener('input', function (e) {
    searchItemsQuery = e.target.value;
    var s = getActiveSection();
    if (!s) return;
    if (s.structure !== 'grouped') renderSectionView();
  });

  document.getElementById('section-title').addEventListener('click', function () {
    var s = getActiveSection();
    if (!s) return;
    renameSection(s.id);
  });

  function createSectionFlow() {
    openSectionModal({
      title: 'Yeni Bölüm',
      initialName: '',
      initialStructure: 'flat',
      initialType: 'list',
      initialEmoji: '📚',
      onSave: function (data) {
        var maxOrder = sections.reduce(function (m, s) { return Math.max(m, s.sortOrder || 0); }, -1);
        var newSection = {
          id: uid('s'),
          name: data.name,
          structure: data.structure,
          type: data.type,
          icon: data.emoji,
          color: data.color || '#ff6126',
          sortOrder: maxOrder + 1,
          hidden: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        if (data.structure === 'grouped') newSection.groups = [];
        else newSection.items = [];
        sections.push(newSection);
        persistSections(); renderSidebar(); updateEmptyState();
        openSection(newSection.id);
      }
    });
  }
  document.getElementById('btn-new-section').addEventListener('click', function () { closeMobileSidebar(); createSectionFlow(); });
  document.getElementById('btn-first-section').addEventListener('click', createSectionFlow);

  document.getElementById('btn-new-item').addEventListener('click', function () {
    var s = getActiveSection();
    if (!s) return;

    if (s.structure === 'grouped') {
      openModal({
        title: 'Yeni Grup',
        placeholder: 'Grup adı',
        onSave: function (name) {
          if (!Array.isArray(s.groups)) s.groups = [];
          var maxOrder = s.groups.reduce(function (m, g) { return Math.max(m, g.sortOrder || 0); }, -1);
          s.groups.push({
            id: uid('g'),
            name: name,
            icon: '📁',
            items: [],
            sortOrder: maxOrder + 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          persistSections();
          renderSectionView();
        }
      });
      return;
    }

    openModal({
      title: 'Yeni Öğe',
      placeholder: 'Başlık',
      onSave: function (title) {
        if (!Array.isArray(s.items)) s.items = [];
        var item = {
          id: uid('i'), title: title, content: '', images: [],
          createdAt: Date.now(), updatedAt: Date.now()
        };
        s.items.push(item);
        persistSections(); renderSectionView();
        // Yazmaya hemen başlanabilsin diye yeni öğe doğrudan açılır.
        openItemEditor(item.id);
      }
    });
  });

  document.getElementById('btn-read-section').addEventListener('click', function () {
    var s = getActiveSection();
    if (!s) return;
    openReader(s, null);
  });

  // ============ GROUP VIEW ============
  function renderGroupView() {
    var s = getActiveSection();
    var g = getActiveGroup();
    if (!s || !g) { backToSection(); return; }

    document.getElementById('group-title').textContent = g.name;
    document.getElementById('group-parent').textContent = (s.icon || '📁') + ' ' + s.name;

    var searchInput = document.getElementById('group-search');
    searchInput.placeholder = g.name + ' içinde ara';

    var items = Array.isArray(g.items) ? g.items : [];
    var q = trLower(searchItemsQuery);
    var filtered = items.filter(function (it) {
      if (!q) return true;
      if (it.title && trLower(it.title).indexOf(q) !== -1) return true;
      if (it.content && trLower(stripContent(it.content)).indexOf(q) !== -1) return true;
      return false;
    });

    var container = document.getElementById('group-items-container');

    if (items.length === 0) {
      container.className = 'list-container';
      container.innerHTML = '<p class="empty-state">Bu grupta henüz öğe yok. Yukarıdaki &quot;+ Yeni Öğe&quot; butonuna tıklayarak başlayın.</p>';
      return;
    }
    if (filtered.length === 0) {
      container.className = 'list-container';
      container.innerHTML = '<p class="empty-state">Aramanızla eşleşen öğe bulunamadı.</p>';
      return;
    }

    if (s.type === 'grid') {
      container.className = 'grid-container';
      var gHtml = '';
      filtered.forEach(function (it) {
        var words = countWordsInHtml(it.content);
        gHtml += '<div class="book-card" data-id="' + it.id + '">';
        gHtml += '<div class="book-card-title">' + escapeHtml(it.title || 'Başlıksız') + '</div>';
        gHtml += '<div class="book-card-meta">' + words.toLocaleString(localeTag()) + ' kelime</div>';
        gHtml += '<button class="book-card-delete" data-id="' + it.id + '" title="Sil">×</button>';
        gHtml += '</div>';
      });
      container.innerHTML = gHtml;
      bindItemRows(container);
      container.querySelectorAll('.book-card-delete').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation(); deleteItem(el.getAttribute('data-id'));
        });
      });
    } else {
      container.className = 'list-container';
      var lHtml = '';
      filtered.forEach(function (it) {
        var preview = '';
        if (it.content) {
          var t = stripHtml(it.content).replace(/\s+/g, ' ');
          if (t) preview = ' <span class="item-preview">' + escapeHtml(t.slice(0, 60)) + (t.length > 60 ? '…' : '') + '</span>';
        }
        lHtml += '<div class="item" data-id="' + it.id + '">';
        lHtml += '<span class="item-title">' + escapeHtml(it.title || 'Başlıksız') + preview + '</span>';
        lHtml += '<button class="item-delete" data-id="' + it.id + '" title="Sil">×</button>';
        lHtml += '</div>';
      });
      container.innerHTML = lHtml;
      bindItemRows(container);
      container.querySelectorAll('.item-delete').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation(); deleteItem(el.getAttribute('data-id'));
        });
      });
    }
  }

  function stripContent(html) { return stripHtml(html); }

  document.getElementById('group-search').addEventListener('input', function (e) {
    searchItemsQuery = e.target.value;
    renderGroupView();
  });

  document.getElementById('group-title').addEventListener('click', function () {
    var g = getActiveGroup();
    if (!g) return;
    renameGroup(g.id);
  });

  document.getElementById('btn-back-to-section').addEventListener('click', backToSection);

  document.getElementById('btn-new-group-item').addEventListener('click', function () {
    var s = getActiveSection();
    var g = getActiveGroup();
    if (!s || !g) return;
    openModal({
      title: 'Yeni Öğe',
      placeholder: 'Başlık',
      onSave: function (title) {
        if (!Array.isArray(g.items)) g.items = [];
        var item = {
          id: uid('i'), title: title, content: '', images: [],
          createdAt: Date.now(), updatedAt: Date.now()
        };
        g.items.push(item);
        persistSections(); renderGroupView();
        openItemEditor(item.id);
      }
    });
  });

  document.getElementById('btn-read-group').addEventListener('click', function () {
    var s = getActiveSection();
    var g = getActiveGroup();
    if (!s || !g) return;
    openReader(s, g);
  });

  // ============ EDITOR ============
  var editorTitle = document.getElementById('editor-title');
  var editorContent = document.getElementById('editor-content');
  var editorWordCount = document.getElementById('editor-word-count');
  var editorReadTime = document.getElementById('editor-read-time');
  var editorSaveStatus = document.getElementById('editor-save-status');
  var editorDirty = false;

  // İçerik yalnızca kaydederken DOM'dan okunur; her tuş vuruşunda koca HTML'i
  // kopyalamak (özellikle görselli notlarda) mobilde takılmaya yol açıyordu.
  function snapshotEditor() {
    if (!editorDirty) return;
    var item = getActiveItem();
    if (item) {
      item.content = editorContent.innerHTML;
      item.updatedAt = Date.now();
    }
    editorDirty = false;
  }

  function openItemEditor(itemId) {
    var item = null;
    var items = getActiveItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId) { item = items[i]; break; }
    }
    if (!item) return;

    activeItemId = itemId;
    editorTitle.textContent = item.title || 'Başlıksız';
    // Dışarıdan gelen (paylaşım/yedek/yapıştırma) içerik de temizlenerek yüklenir.
    editorContent.innerHTML = sanitizeHtml(item.content || '');
    editorDirty = false;
    updateEditorStats();
    editorSaveStatus.textContent = 'Kaydedildi';
    editorSaveStatus.classList.remove('saving');

    sectionView.classList.add('hidden');
    groupView.classList.add('hidden');
    itemEditorView.classList.remove('hidden');
    document.body.classList.add('editing');
    document.body.classList.remove('editor-compact');
    editorContent.focus();
    var mc = document.getElementById('main-content');
    if (mc) mc.scrollTop = 0;
  }

  function closeItemEditor() {
    if (editorSaveTimer) {
      clearTimeout(editorSaveTimer); editorSaveTimer = null;
      persistSections();
    }
    activeItemId = null;
    itemEditorView.classList.add('hidden');
    document.body.classList.remove('editing');
    document.body.classList.remove('editor-compact');
    var s = getActiveSection();
    if (s && s.structure === 'grouped' && activeGroupId) {
      groupView.classList.remove('hidden');
      renderGroupView();
    } else if (s) {
      sectionView.classList.remove('hidden');
      renderSectionView();
    }
  }

  function updateEditorStats() {
    var words = countWordsInHtml(editorContent.innerHTML);
    editorWordCount.textContent = words.toLocaleString(localeTag()) + ' kelime';
    if (editorReadTime) {
      var minutes = Math.max(1, Math.round(words / 200));
      editorReadTime.textContent = '~' + minutes + ' dk okuma';
    }
  }
  var updateEditorStatsDebounced = debounce(updateEditorStats, 180);

  function flushEditorSave() {
    if (editorSaveTimer) { clearTimeout(editorSaveTimer); editorSaveTimer = null; }
    snapshotEditor();
    return persistSections().then(function () {
      editorSaveStatus.textContent = 'Kaydedildi';
      editorSaveStatus.classList.remove('saving');
    });
  }

  function scheduleEditorSave() {
    editorSaveStatus.textContent = 'Kaydediliyor...';
    editorSaveStatus.classList.add('saving');
    if (editorSaveTimer) clearTimeout(editorSaveTimer);
    editorSaveTimer = setTimeout(function () {
      editorSaveTimer = null;
      persistSections().then(function () {
        editorSaveStatus.textContent = 'Kaydedildi';
        editorSaveStatus.classList.remove('saving');
      });
    }, 700);
  }

  editorContent.addEventListener('input', function () {
    var item = getActiveItem();
    if (!item) return;
    editorDirty = true;
    updateEditorStatsDebounced();
    scheduleEditorSave();
  });

  editorTitle.addEventListener('click', function () {
    var item = getActiveItem();
    if (!item) return;
    openModal({
      title: 'Başlığı Yeniden Adlandır',
      initialValue: item.title, placeholder: 'Başlık',
      onSave: function (newTitle) {
        item.title = newTitle; item.updatedAt = Date.now();
        editorTitle.textContent = newTitle; persistSections();
      }
    });
  });

  document.getElementById('btn-back-from-editor').addEventListener('click', closeItemEditor);

  // Kaydırırken editör başlığını küçült: yazma alanı büyür.
  var mainContentEl = document.getElementById('main-content');
  mainContentEl.addEventListener('scroll', function () {
    var compact = mainContentEl.scrollTop > 48 && !itemEditorView.classList.contains('hidden');
    document.body.classList.toggle('editor-compact', compact);
  }, { passive: true });

  // Seçim, araç çubuğu/modal odağı değiştiğinde kaybolmasın diye hatırlanır.
  var savedRange = null;
  function rememberSelection() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    var r = sel.getRangeAt(0);
    if (editorContent.contains(r.commonAncestorContainer)) savedRange = r.cloneRange();
  }
  function restoreSelection() {
    if (!savedRange) return;
    var sel = window.getSelection();
    try { sel.removeAllRanges(); sel.addRange(savedRange); } catch (e) {}
  }
  document.addEventListener('selectionchange', rememberSelection);

  function currentBlockTag() {
    var sel = window.getSelection();
    if (!sel || !sel.anchorNode) return '';
    var node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    if (!node || !node.closest) return '';
    var el = node.closest('h1,h2,h3,blockquote,pre,p,div');
    return el ? el.tagName.toLowerCase() : '';
  }

  function toggleBlock(tag) {
    var cur = currentBlockTag();
    document.execCommand('formatBlock', false, cur === tag ? 'p' : tag);
  }

  function insertLink() {
    rememberSelection();
    var sel = window.getSelection();
    var selectedText = (sel && !sel.isCollapsed) ? sel.toString() : '';
    openModal({
      title: 'Bağlantı Ekle',
      initialValue: 'https://',
      placeholder: 'https://ornek.com',
      onSave: function (raw) {
        var u = String(raw || '').trim();
        if (!u) return;
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        editorContent.focus();
        restoreSelection();
        var label = selectedText || u;
        document.execCommand('insertHTML', false,
          '<a href="' + escapeHtml(u) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + '</a>');
        editorContent.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  function toggleMark() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    var text = sel.toString();
    if (!text) return;
    document.execCommand('insertHTML', false, '<mark>' + escapeHtml(text) + '</mark>');
  }

  // ============ SESTEN METNE ============
  function selectionInEditor() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    var r = sel.getRangeAt(0);
    return editorContent.contains(r.commonAncestorContainer);
  }

  function placeCaretAtEnd() {
    var range = document.createRange();
    range.selectNodeContents(editorContent);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Ses tanıma sonucunu düz metin olarak imlecin olduğu yere ekler.
  function insertSpeechText(text) {
    var clean = String(text || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!clean || !getActiveItem()) return;
    editorContent.focus();
    if (savedRange && editorContent.contains(savedRange.commonAncestorContainer)) restoreSelection();
    else if (!selectionInEditor()) placeCaretAtEnd();
    var html = escapeHtml(clean).replace(/\n/g, '<br>');
    var inserted = false;
    try { inserted = document.execCommand('insertHTML', false, html); } catch (e) { inserted = false; }
    if (!inserted) {
      var sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        var range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(clean));
        range.collapse(false);
      }
    }
    editorContent.dispatchEvent(new Event('input', { bubbles: true }));
    rememberSelection();
    showToast({ kind: 'success', title: 'Ses metne dönüştürüldü', detail: 'Metin hazır; gözden geçirip nota ekleyebilirsin.' });
  }

  async function openSpeechToText() {
    if (!window.YazNotSTT) { showToast('Sesten metne bu sürümde kullanılamıyor'); return; }
    if (!getActiveItem()) { showToast('Önce bir not aç'); return; }
    rememberSelection();
    var result;
    try {
      result = await window.YazNotSTT.open();
    } catch (err) {
      showToast('Sesten metne açılamadı: ' + ((err && err.message) || 'bilinmeyen hata'));
      return;
    }
    if (!result || !result.text) return;
    insertSpeechText(result.text);
  }

  function updateToolbarState() {
    var toolbar = document.getElementById('editor-toolbar');
    if (!toolbar) return;
    var map = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough' };
    toolbar.querySelectorAll('.toolbar-btn').forEach(function (btn) {
      var cmd = btn.getAttribute('data-cmd');
      var state = false;
      if (map[cmd]) { try { state = document.queryCommandState(map[cmd]); } catch (e) {} }
      else if (cmd === 'ul') { try { state = document.queryCommandState('insertUnorderedList'); } catch (e) {} }
      else if (cmd === 'ol') { try { state = document.queryCommandState('insertOrderedList'); } catch (e) {} }
      else if (cmd === 'h1' || cmd === 'h2' || cmd === 'h3' || cmd === 'quote') {
        state = currentBlockTag() === (cmd === 'quote' ? 'blockquote' : cmd);
      }
      btn.classList.toggle('active', !!state);
    });
  }
  var updateToolbarStateDebounced = debounce(updateToolbarState, 120);
  document.addEventListener('selectionchange', updateToolbarStateDebounced);

  (function setupToolbar() {
    var toolbar = document.getElementById('editor-toolbar');
    toolbar.querySelectorAll('.toolbar-btn').forEach(function (btn) {
      btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
      btn.addEventListener('click', async function () {
        var cmd = btn.getAttribute('data-cmd');
        editorContent.focus();
        restoreSelection();

        if (cmd === 'image') {
          var pick = await window.api.pickImage();
          if (pick && pick.ok && pick.dataUrl) await processImageDataUrl(editorContent, pick.dataUrl);
          else if (pick && pick.error) alert('Resim seçilemedi: ' + pick.error);
          return;
        }
        if (cmd === 'link') { insertLink(); return; }
        if (cmd === 'stt') { openSpeechToText(); return; }
        if (cmd === 'mark') { toggleMark(); }
        else if (cmd === 'h1' || cmd === 'h2' || cmd === 'h3') { toggleBlock(cmd); }
        else if (cmd === 'quote') { toggleBlock('blockquote'); }
        else if (cmd === 'ul') { document.execCommand('insertUnorderedList', false, null); }
        else if (cmd === 'ol') { document.execCommand('insertOrderedList', false, null); }
        else if (cmd === 'clear') {
          document.execCommand('removeFormat', false, null);
          document.execCommand('formatBlock', false, 'p');
        }
        else { document.execCommand(cmd, false, null); }

        editorContent.dispatchEvent(new Event('input', { bubbles: true }));
        rememberSelection();
        updateToolbarState();
      });
    });
    setupImagePaste(editorContent);
    setupImageDrop(editorContent);

    // Editördeki bağlantılar sistem tarayıcısında açılır.
    editorContent.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (a && a.getAttribute('href')) {
        e.preventDefault();
        window.api.openExternal(a.getAttribute('href'));
      }
    });
  })();


  // ============ READER ============
  var readerView = document.getElementById('book-reader-view');
  var readerBody = document.getElementById('reader-body');
  var readerContent = document.getElementById('reader-content');
  var readerBookTitle = document.getElementById('reader-book-title');
  var readerProgress = document.getElementById('reader-progress');
  var readerProgressBar = document.getElementById('reader-progress-bar');
  var lastReaderTop = 0;

  function openReader(s, g) {
    var title = g ? (g.name + ' — ' + s.name) : s.name;
    readerBookTitle.textContent = (s.icon || '📁') + ' ' + title;
    var items = g ? (g.items || []) : (s.items || []);
    if (items.length === 0) {
      readerContent.innerHTML = '<p class="reader-empty">Henüz öğe yok.</p>';
    } else {
      var html = '';
      items.forEach(function (item, i) {
        var content = sanitizeHtml(item.content || '');
        var contentHtml = (content && content.trim()) ? content : '<p class="reader-empty-chapter">(Bu öğe henüz yazılmamış.)</p>';
        html += '<article class="reader-chapter">';
        html += '<div class="reader-chapter-label">' + (s.type === 'grid' ? 'Bölüm ' : 'Öğe ') + (i + 1) + '</div>';
        html += '<h1 class="reader-chapter-title">' + escapeHtml(item.title || 'Başlıksız') + '</h1>';
        html += '<div class="reader-chapter-content">' + contentHtml + '</div>';
        html += '</article>';
      });
      readerContent.innerHTML = html;
    }
    readerView.classList.remove('hidden');
    readerView.classList.remove('reader-bar-hidden');
    readerBody.scrollTop = 0;
    lastReaderTop = 0;
    updateReaderProgress();
  }
  function closeReader() { readerView.classList.add('hidden'); }
  function updateReaderProgress() {
    var max = readerBody.scrollHeight - readerBody.clientHeight;
    var pct;
    if (max <= 0) pct = 100;
    else { pct = Math.round((readerBody.scrollTop / max) * 100); if (pct < 0) pct = 0; if (pct > 100) pct = 100; }
    readerProgress.textContent = pct + '%';
    if (readerProgressBar) readerProgressBar.style.width = pct + '%';
  }

  // Aşağı kaydırırken üst barı gizle → tam ekran okuma alanı.
  function handleReaderScroll() {
    updateReaderProgress();
    var top = readerBody.scrollTop;
    if (top > lastReaderTop + 8 && top > 72) readerView.classList.add('reader-bar-hidden');
    else if (top < lastReaderTop - 8) readerView.classList.remove('reader-bar-hidden');
    lastReaderTop = top;
  }

  // Kaydırma olayı her karede onlarca kez tetiklenebilir; tek karede bir kez işle.
  var readerScrollScheduled = false;
  readerBody.addEventListener('scroll', function () {
    if (readerScrollScheduled) return;
    readerScrollScheduled = true;
    window.requestAnimationFrame(function () {
      readerScrollScheduled = false;
      handleReaderScroll();
    });
  }, { passive: true });

  // Okuma sırasında içeriğe dokunmak üst barı geri getirir/gizler.
  readerBody.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a, .reader-topbar')) return;
    if (window.getSelection && String(window.getSelection()).length > 0) return;
    readerView.classList.toggle('reader-bar-hidden');
    lastReaderTop = readerBody.scrollTop;
  });
  document.getElementById('btn-exit-reader').addEventListener('click', closeReader);
  readerContent.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a && a.getAttribute('href')) {
      e.preventDefault();
      window.api.openExternal(a.getAttribute('href'));
    }
  });

  // ============ HIDDEN SECTIONS MODAL ============
  var hiddenModal = document.getElementById('hidden-modal');
  var hiddenModalList = document.getElementById('hidden-modal-list');
  function openHiddenSectionsModal() { renderHiddenSectionsList(); hiddenModal.classList.remove('hidden'); }
  function closeHiddenSectionsModal() { hiddenModal.classList.add('hidden'); }
  function renderHiddenSectionsList() {
    var hiddenIds = Object.keys(settings.hiddenSections).filter(function (k) { return settings.hiddenSections[k]; });
    hiddenIds = hiddenIds.filter(function (id) { return sections.some(function (s) { return s.id === id; }); });
    if (hiddenIds.length === 0) {
      hiddenModalList.innerHTML = '<p class="hidden-modal-empty">Şu an gizli bölüm yok.</p>';
      return;
    }
    hiddenModalList.innerHTML = '';
    hiddenIds.forEach(function (sid) {
      var s = sections.find(function (sec) { return sec.id === sid; });
      if (!s) return;
      var row = document.createElement('div');
      row.className = 'hidden-modal-row';
      var name = document.createElement('span');
      name.textContent = (s.icon || '📁') + '  ' + s.name;
      var btn = document.createElement('button');
      btn.className = 'btn-primary';
      btn.textContent = 'Göster';
      btn.style.padding = '6px 14px'; btn.style.fontSize = '13px';
      btn.addEventListener('click', function () {
        settings.hiddenSections[sid] = false;
        saveSettings(); renderSidebar();
        renderHiddenSectionsList(); updateEmptyState();
      });
      row.appendChild(name); row.appendChild(btn);
      hiddenModalList.appendChild(row);
    });
  }
  document.getElementById('hidden-modal-close').addEventListener('click', closeHiddenSectionsModal);
  hiddenModal.addEventListener('click', function (e) { if (e.target === hiddenModal) closeHiddenSectionsModal(); });

  // ============ KEYBOARD ============
  function anyModalOpen() {
    var ids = ['settings-modal', 'stats-modal', 'shares-modal', 'share-send-modal', 'import-modal', 'restore-modal', 'hidden-modal', 'trash-modal', 'move-modal'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && !el.classList.contains('hidden')) return el;
    }
    return null;
  }

  function anyMenuOpen() {
    var menus = document.querySelectorAll('.menu:not(.hidden)');
    return menus.length > 0;
  }

  document.addEventListener('keydown', function (e) {
    var mod = e.ctrlKey || e.metaKey;
    var key = e.key;

    if (key === 'Escape' && anyMenuOpen()) {
      e.preventDefault();
      closeMenus();
      return;
    }

    // Hesap menüsü açıkken Esc yalnızca onu kapatır (editör kapanmasın).
    if (key === 'Escape') {
      var accountMenuEl = document.getElementById('account-menu');
      if (accountMenuEl && !accountMenuEl.classList.contains('hidden')) {
        e.preventDefault();
        accountMenuEl.classList.add('hidden');
        var accountToggle = document.getElementById('btn-switch-account');
        if (accountToggle) accountToggle.setAttribute('aria-expanded', 'false');
        return;
      }
    }

    // Ctrl+K — tüm notlarda hızlı arama
    if (mod && !e.shiftKey && (key === 'k' || key === 'K')) {
      e.preventDefault(); openPalette(); return;
    }
    // Ctrl+S — hemen kaydet
    if (mod && !e.shiftKey && (key === 's' || key === 'S')) {
      e.preventDefault();
      if (!itemEditorView.classList.contains('hidden')) flushEditorSave();
      else persistSections();
      return;
    }
    // Ctrl+\ — kenar çubuğunu aç/kapat (Ctrl+B artık kalın yazı için serbest)
    if (mod && (key === '\\' || key === '|')) {
      e.preventDefault();
      settings.sidebarHidden = !settings.sidebarHidden;
      saveSettings(); applySettings(); return;
    }
    // Ctrl+Shift+H — gizli bölümler
    if (mod && e.shiftKey && (key === 'H' || key === 'h')) {
      e.preventDefault(); openHiddenSectionsModal(); return;
    }
    // Ctrl+Shift+F — odak modu
    if (mod && e.shiftKey && (key === 'F' || key === 'f')) {
      e.preventDefault(); setSetting('focusMode', !settings.focusMode); return;
    }
    // Ctrl+N — bulunduğun yerde yeni öğe
    if (mod && !e.shiftKey && (key === 'n' || key === 'N')) {
      e.preventDefault();
      if (!itemEditorView.classList.contains('hidden')) return;
      var btn = !groupView.classList.contains('hidden')
        ? document.getElementById('btn-new-group-item')
        : document.getElementById('btn-new-item');
      if (btn && !sectionView.classList.contains('hidden')) btn.click();
      else if (btn && !groupView.classList.contains('hidden')) btn.click();
      return;
    }
    // Ctrl+A — seçim modunda tümünü seç
    if (mod && !e.shiftKey && (key === 'a' || key === 'A') && selectionMode) {
      e.preventDefault(); selectAllVisible(); return;
    }
    // Ctrl+F — mevcut listede ara
    if (mod && !e.shiftKey && (key === 'f' || key === 'F')) {
      if (!itemEditorView.classList.contains('hidden')) return;
      var input = !groupView.classList.contains('hidden')
        ? document.getElementById('group-search')
        : document.getElementById('search-items');
      if (input && input.style.display !== 'none') { e.preventDefault(); input.focus(); input.select(); }
      return;
    }

    if (key === 'Escape') {
      if (!paletteOverlay.classList.contains('hidden')) { closePalette(); return; }
      if (!readerView.classList.contains('hidden')) { closeReader(); return; }
      if (restoreModal && !restoreModal.classList.contains('hidden')) { closeRestoreModal(); return; }
      var openMod = anyModalOpen();
      if (openMod) { openMod.classList.add('hidden'); return; }
      if (selectionMode) { toggleSelectionMode(false); return; }
      if (!itemEditorView.classList.contains('hidden')) { closeItemEditor(); return; }
      if (settings.focusMode) { setSetting('focusMode', false); return; }
      if (!contextMenu.classList.contains('hidden')) contextMenu.classList.add('hidden');
    }
  });
  // ============ MOBİL ÇEKMECE + KAYDIRMA JESTLERİ ============
  var sidebarEl = document.getElementById('sidebar');
  var sidebarBackdrop = document.getElementById('sidebar-backdrop');
  var SIDEBAR_SWIPE_EDGE = 26; // sol kenardan jest başlatma toleransı (px)
  var sidebarSwipe = null;

  function isMobileLayout() {
    return window.matchMedia('(max-width: 768px), (max-height: 520px) and (orientation: landscape)').matches;
  }

  function openMobileSidebar() {
    document.body.classList.add('sidebar-mobile-open');
  }
  function closeMobileSidebar() {
    document.body.classList.remove('sidebar-mobile-open');
  }

  document.getElementById('sidebar-reveal').addEventListener('click', function () {
    if (isMobileLayout()) {
      if (document.body.classList.contains('sidebar-mobile-open')) closeMobileSidebar();
      else openMobileSidebar();
      return;
    }
    // Masaüstünde düğme yalnızca çekmece kapalıyken görünür.
    if (settings.sidebarHidden) { settings.sidebarHidden = false; saveSettings(); applySettings(); }
  });
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  function applySidebarOffset(offset) {
    if (!sidebarSwipe) return;
    var width = sidebarSwipe.width || sidebarEl.offsetWidth || 280;
    var clamped = Math.max(-width, Math.min(0, offset));
    sidebarEl.style.transition = 'none';
    sidebarEl.style.transform = 'translateX(' + clamped + 'px)';
    if (sidebarBackdrop) sidebarBackdrop.style.opacity = String(1 + clamped / width);
    sidebarSwipe.next = clamped;
  }

  function endSidebarSwipe() {
    if (!sidebarSwipe) return;
    var swipe = sidebarSwipe;
    sidebarSwipe = null;
    document.body.classList.remove('sidebar-dragging');

    if (!swipe.active) {
      sidebarEl.style.transition = '';
      sidebarEl.style.transform = '';
      if (sidebarBackdrop) sidebarBackdrop.style.opacity = '';
      return;
    }

    var width = swipe.width || sidebarEl.offsetWidth || 280;
    // Açıkken %35, kapalıyken %40 eşiği aşılınca durum değişir.
    var shouldOpen = swipe.wasOpen ? (swipe.next > -width * 0.35) : (swipe.next > -width * 0.6);
    if (shouldOpen) openMobileSidebar(); else closeMobileSidebar();

    // Sınıf uygulandıktan sonra satır içi değerleri temizle; geçiş animasyonlu kalır.
    window.requestAnimationFrame(function () {
      sidebarEl.style.transition = '';
      sidebarEl.style.transform = '';
      if (sidebarBackdrop) sidebarBackdrop.style.opacity = '';
    });
  }

  document.addEventListener('touchstart', function (e) {
    if (!isMobileLayout() || e.touches.length !== 1) return;
    var target = e.target;
    if (target && target.closest && target.closest('input, textarea, select, [contenteditable="true"], .modal, .reader, .palette-overlay')) return;

    var t = e.touches[0];
    var wasOpen = document.body.classList.contains('sidebar-mobile-open');
    var width = sidebarEl.offsetWidth || 280;
    if (wasOpen) {
      if (t.clientX > width) return; // yalnızca çekmecenin üzerinden
    } else if (t.clientX > SIDEBAR_SWIPE_EDGE) {
      return; // yalnızca sol kenardan
    }
    sidebarSwipe = {
      startX: t.clientX, startY: t.clientY,
      wasOpen: wasOpen, active: false,
      width: width, next: wasOpen ? 0 : -width
    };
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!sidebarSwipe || e.touches.length !== 1) return;
    var t = e.touches[0];
    var dx = t.clientX - sidebarSwipe.startX;
    var dy = t.clientY - sidebarSwipe.startY;

    if (!sidebarSwipe.active) {
      if (Math.abs(dx) < 10) return;
      // Dikey kaydırma ise jesti bırak.
      if (Math.abs(dx) <= Math.abs(dy) * 1.2) { sidebarSwipe = null; return; }
      // Yanlış yöne çekildiyse bırak.
      if (!sidebarSwipe.wasOpen && dx <= 0) { sidebarSwipe = null; return; }
      if (sidebarSwipe.wasOpen && dx >= 0) { sidebarSwipe = null; return; }
      sidebarSwipe.active = true;
      sidebarSwipe.width = sidebarEl.offsetWidth || sidebarSwipe.width;
      document.body.classList.add('sidebar-dragging');
    }

    if (e.cancelable) e.preventDefault();
    var base = sidebarSwipe.wasOpen ? 0 : -sidebarSwipe.width;
    applySidebarOffset(base + dx);
  }, { passive: false });

  document.addEventListener('touchend', endSidebarSwipe);
  document.addEventListener('touchcancel', endSidebarSwipe);

  // ============ PERSIST ============
  async function persistSections() {
    snapshotEditor();
    await window.api.save('sections', { sections: sections });
    if (typeof updateSyncIndicator === 'function') updateSyncIndicator();
  }

  // ============ MIGRATION ============
  async function migrateLegacyIfNeeded() {
    var existing = await window.api.load('sections');
    if (existing && Array.isArray(existing.sections)) {
      sections = existing.sections;
      normalizeSectionsList();
      return;
    }

    console.log('[migration] v3o -> v4: sections yok, eski veriler donusturuluyor...');
    var newSections = [];

    var coursesData = await window.api.load('courses');
    if (coursesData && Array.isArray(coursesData.courses)) {
      coursesData.courses.forEach(function (course, idx) {
        var items = Array.isArray(course.topics) ? course.topics.map(function (t) {
          return {
            id: t.id || uid('i'), title: t.title || 'Konu',
            content: t.content || '',
            images: Array.isArray(t.images) ? t.images : [],
            createdAt: t.createdAt || Date.now(), updatedAt: t.updatedAt || Date.now()
          };
        }) : [];
        newSections.push({
          id: uid('s'), name: course.name || 'Ders',
          structure: 'flat', type: 'list', icon: '📚',
          sortOrder: idx, hidden: false, items: items,
          createdAt: course.createdAt || Date.now(), updatedAt: Date.now()
        });
      });
    }

    var booksData = await window.api.load('books');
    var bookOffset = newSections.length;
    if (booksData && Array.isArray(booksData.books)) {
      booksData.books.forEach(function (book, idx) {
        var items = Array.isArray(book.chapters) ? book.chapters.map(function (c) {
          return {
            id: c.id || uid('i'), title: c.title || 'Bölüm',
            content: c.content || '',
            images: Array.isArray(c.images) ? c.images : [],
            createdAt: c.createdAt || Date.now(), updatedAt: c.updatedAt || Date.now()
          };
        }) : [];
        newSections.push({
          id: uid('s'), name: book.title || 'Kitap',
          structure: 'flat', type: 'grid', icon: '✍️',
          sortOrder: bookOffset + idx, hidden: false, items: items,
          createdAt: book.createdAt || Date.now(), updatedAt: Date.now()
        });
      });
    }

    if (newSections.length > 0) {
      sections = newSections;
      await persistSections();
      console.log('[migration] ' + sections.length + ' bolum olusturuldu');
    } else {
      // Boş durumu buluta YAZMA — buluttaki gerçek veriyi ezebilir (veri kaybı).
      sections = [];
    }
  }

  // ============ BACKUP ============
  document.getElementById('btn-export-backup').addEventListener('click', async function () {
    var payload = {
      yaznot_version: '1.0.0',
      exported_at: new Date().toISOString(),
      sections: sections,
      settings: settings
    };
    var result = await window.api.exportBackup(payload);
    if (result && result.ok) showToast({ kind: 'success', title: 'Yedek oluşturuldu', detail: result.filePath || 'İndirilenler klasörüne kaydedildi.', timeout: 6500 });
    else if (result && result.error) alert('Yedek oluşturulamadı: ' + result.error);
  });

  // ============ YEDEKTEN İÇE AKTARMA ============
  // İki mod vardır:
  //   merge   → mevcut bölüm/notlar aynen kalır, yedektekiler ayrı bölüm olarak eklenir
  //   replace → mevcut bölüm/notlar ve geri dönüşüm kutusu silinir, yedektekiler yüklenir
  var restorePending = null;
  var restoreBusy = false;
  var restoreMode = 'merge';
  var restoreModal = document.getElementById('restore-modal');
  var restoreSummary = document.getElementById('restore-summary');
  var restoreModes = document.getElementById('restore-modes');
  var restoreEffect = document.getElementById('restore-effect');
  var restoreStatus = document.getElementById('restore-status');
  var restoreConfirmBtn = document.getElementById('restore-confirm');
  var restoreCancelBtn = document.getElementById('restore-cancel');

  function restoreText(value, fallback) {
    if (typeof value !== 'string') return fallback;
    var text = value.trim();
    return text || fallback;
  }

  function restoreNumber(value, fallback) {
    return (typeof value === 'number' && isFinite(value)) ? value : fallback;
  }

  function uniqueRestoreName(name, usedNames) {
    var base = String(name || '').trim() || 'İçe Aktarılan Bölüm';
    var candidate = base;
    var suffix = 2;
    while (usedNames[trLower(candidate)]) {
      candidate = base + ' (' + suffix + ')';
      suffix++;
    }
    usedNames[trLower(candidate)] = true;
    return candidate;
  }

  // Yedekteki bölümleri güvenli kimliklerle ve beklenen alanlarla hazırlar.
  // `freshIds` açıkken tüm kimlikler yeniden üretilir (üzerine ekleme modu);
  // kapalıyken geçerli kimlikler korunur (değiştirme modu).
  function prepareImportedSections(incoming, opts) {
    opts = opts || {};
    var usedIds = opts.usedIds || {};
    var usedNames = opts.usedNames || null;
    var freshIds = !!opts.freshIds;
    var preserveHidden = !!opts.preserveHidden;
    var prepared = [];

    function makeId(prefix, raw) {
      if (!freshIds) {
        var candidate = (typeof raw === 'string') ? raw : '';
        if (/^[A-Za-z0-9_-]{1,80}$/.test(candidate) && !usedIds[candidate]) {
          usedIds[candidate] = true;
          return candidate;
        }
      }
      var id;
      do { id = uid(prefix); } while (usedIds[id]);
      usedIds[id] = true;
      return id;
    }

    function prepareItem(raw, index) {
      if (!raw || typeof raw !== 'object') return null;
      var now = Date.now();
      return {
        id: makeId('i', raw.id),
        title: restoreText(raw.title, 'Başlıksız'),
        content: (typeof raw.content === 'string') ? raw.content : '',
        images: Array.isArray(raw.images) ? raw.images.slice() : [],
        createdAt: restoreNumber(raw.createdAt, now),
        updatedAt: restoreNumber(raw.updatedAt, now)
      };
    }

    function prepareGroup(raw, index) {
      if (!raw || typeof raw !== 'object') return null;
      var now = Date.now();
      var items = [];
      (Array.isArray(raw.items) ? raw.items : []).forEach(function (item, itemIndex) {
        var preparedItem = prepareItem(item, itemIndex);
        if (preparedItem) items.push(preparedItem);
      });
      return {
        id: makeId('g', raw.id),
        name: restoreText(raw.name, 'Grup'),
        icon: restoreText(raw.icon, '📁'),
        sortOrder: restoreNumber(raw.sortOrder, index),
        items: items,
        createdAt: restoreNumber(raw.createdAt, now),
        updatedAt: restoreNumber(raw.updatedAt, now)
      };
    }

    (Array.isArray(incoming) ? incoming : []).forEach(function (raw, index) {
      if (!raw || typeof raw !== 'object') return;
      var now = Date.now();
      var name = restoreText(raw.name, 'İçe Aktarılan Bölüm');
      if (usedNames) name = uniqueRestoreName(name, usedNames);
      var structure = (raw.structure === 'grouped') ? 'grouped' : 'flat';
      var section = {
        id: makeId('s', raw.id),
        name: name,
        structure: structure,
        type: (raw.type === 'grid') ? 'grid' : 'list',
        icon: restoreText(raw.icon, '📁'),
        color: /^#[0-9a-fA-F]{6}$/.test(raw.color || '') ? raw.color : '#ff6126',
        sortOrder: restoreNumber(raw.sortOrder, index),
        hidden: preserveHidden ? !!raw.hidden : false,
        createdAt: restoreNumber(raw.createdAt, now),
        updatedAt: restoreNumber(raw.updatedAt, now)
      };
      if (structure === 'grouped') {
        section.groups = [];
        (Array.isArray(raw.groups) ? raw.groups : []).forEach(function (group, groupIndex) {
          var preparedGroup = prepareGroup(group, groupIndex);
          if (preparedGroup) section.groups.push(preparedGroup);
        });
      } else {
        section.items = [];
        (Array.isArray(raw.items) ? raw.items : []).forEach(function (item, itemIndex) {
          var preparedItem = prepareItem(item, itemIndex);
          if (preparedItem) section.items.push(preparedItem);
        });
      }
      prepared.push(section);
    });

    return prepared;
  }

  function countRestoreStats(list) {
    var stats = { sections: 0, groups: 0, notes: 0 };
    (Array.isArray(list) ? list : []).forEach(function (section) {
      if (!section || typeof section !== 'object') return;
      stats.sections++;
      if (section.structure === 'grouped') {
        (Array.isArray(section.groups) ? section.groups : []).forEach(function (group) {
          if (!group || typeof group !== 'object') return;
          stats.groups++;
          stats.notes += (Array.isArray(group.items) ? group.items : []).filter(function (item) {
            return item && typeof item === 'object';
          }).length;
        });
      } else {
        stats.notes += (Array.isArray(section.items) ? section.items : []).filter(function (item) {
          return item && typeof item === 'object';
        }).length;
      }
    });
    return stats;
  }

  function formatRestoreStats(stats) {
    var text = stats.sections + ' bölüm · ' + stats.notes + ' not';
    if (stats.groups > 0) text += ' · ' + stats.groups + ' grup';
    return text;
  }

  function setRestoreStatus(message, kind) {
    if (!restoreStatus) return;
    restoreStatus.textContent = message || '';
    restoreStatus.className = 'auth-status' + (kind ? ' auth-status-' + kind : '');
  }

  function setRestoreBusy(busy) {
    restoreBusy = busy;
    if (restoreConfirmBtn) restoreConfirmBtn.disabled = busy;
    if (restoreCancelBtn) restoreCancelBtn.disabled = busy;
    if (busy) {
      if (restoreConfirmBtn) restoreConfirmBtn.textContent = 'İçe aktarılıyor…';
      return;
    }
    if (!restorePending) {
      if (restoreConfirmBtn) restoreConfirmBtn.textContent = 'İçe Aktar';
      return;
    }
    updateRestoreModeUI();
  }

  function updateRestoreModeUI() {
    if (!restorePending || !restoreModes) return;
    restoreModes.querySelectorAll('.restore-mode').forEach(function (row) {
      row.classList.toggle('selected', row.getAttribute('data-mode') === restoreMode);
    });
    var current = countRestoreStats(sections);
    var incoming = restorePending.stats;
    if (restoreMode === 'replace') {
      if (restoreEffect) {
        restoreEffect.classList.add('danger');
        restoreEffect.textContent = current.sections > 0
          ? 'Bu hesaptaki ' + formatRestoreStats(current) + ' silinecek ve geri dönüşüm kutusu boşaltılacak. Yerine yedekteki ' + formatRestoreStats(incoming) + ' yüklenecek. Bu işlem geri alınamaz.'
          : 'Bu hesapta mevcut bölüm yok. Yedekteki ' + formatRestoreStats(incoming) + ' yüklenecek.';
      }
      if (restoreConfirmBtn) restoreConfirmBtn.textContent = 'Mevcut Verileri Sil ve Yükle';
    } else {
      if (restoreEffect) {
        restoreEffect.classList.remove('danger');
        restoreEffect.textContent = (current.sections > 0 || current.notes > 0)
          ? 'Mevcut ' + formatRestoreStats(current) + ' olduğu gibi korunacak. Yedekteki ' + formatRestoreStats(incoming) + ' ayrı bölümler olarak eklenecek.'
          : 'Bu hesapta mevcut bölüm yok. Yedekteki ' + formatRestoreStats(incoming) + ' eklenecek.';
      }
      if (restoreConfirmBtn) restoreConfirmBtn.textContent = 'Üzerine Ekle';
    }
  }

  function selectRestoreMode(mode) {
    restoreMode = (mode === 'replace') ? 'replace' : 'merge';
    if (restoreModes) {
      var input = restoreModes.querySelector('input[name="restore-mode"][value="' + restoreMode + '"]');
      if (input) input.checked = true;
    }
    updateRestoreModeUI();
  }

  function openRestoreModal(incoming, data, fileName) {
    var prepared = prepareImportedSections(incoming, {});
    if (!prepared.length) {
      alert('Bu yedekte içe aktarılacak bölüm bulunamadı.');
      return;
    }
    restorePending = {
      incoming: incoming,
      data: data,
      fileName: fileName || '',
      stats: countRestoreStats(prepared)
    };
    if (restoreSummary) {
      var summary = 'Yedekte ' + formatRestoreStats(restorePending.stats);
      if (restorePending.fileName) summary += ' · ' + restorePending.fileName;
      if (data && typeof data.exported_at === 'string') {
        var exportedAt = new Date(data.exported_at);
        if (!isNaN(exportedAt.getTime())) summary += ' · ' + exportedAt.toLocaleString(localeTag());
      }
      restoreSummary.textContent = summary;
    }
    setRestoreStatus('');
    setRestoreBusy(false);
    selectRestoreMode('merge');
    restoreModal.classList.remove('hidden');
    setTimeout(function () {
      var active = restoreModes && restoreModes.querySelector('.restore-mode.selected input');
      if (active) active.focus();
    }, 0);
  }

  function closeRestoreModal() {
    if (restoreBusy) return;
    restoreModal.classList.add('hidden');
    restorePending = null;
    setRestoreStatus('');
  }

  function importedHiddenSections(importedSettings, prepared) {
    var hidden = {};
    var ids = {};
    prepared.forEach(function (section) {
      ids[section.id] = true;
      if (section.hidden) hidden[section.id] = true;
    });
    var source = importedSettings && importedSettings.hiddenSections;
    if (source && typeof source === 'object') {
      Object.keys(source).forEach(function (id) {
        if (ids[id] && source[id]) hidden[id] = true;
      });
    }
    return hidden;
  }

  async function applyRestore() {
    if (!restorePending || restoreBusy) return;
    var pending = restorePending;
    var mode = restoreMode;
    var previousSections = sections;
    var previousTrash = trash;
    var previousHiddenSections = settings.hiddenSections;
    var previousSidebarHidden = settings.sidebarHidden;
    var committed = false;
    setRestoreBusy(true);
    setRestoreStatus('');

    try {
      if (mode === 'replace') {
        var current = countRestoreStats(sections);
        if (current.sections > 0 || current.notes > 0 || trash.length > 0) {
          var confirmed = await window.api.confirm({
            title: 'Mevcut Notları Değiştir',
            message: 'Bu hesaptaki tüm bölüm ve notlar silinip yedekteki içerik yüklenecek. Devam edilsin mi?',
            detail: 'Silinecek: ' + formatRestoreStats(current) + (trash.length > 0 ? ' · ' + trash.length + ' geri dönüşüm kaydı' : '') +
              '\nYüklenecek: ' + formatRestoreStats(pending.stats) + '\n\nBu işlem geri alınamaz.',
            confirmLabel: 'Sil ve Yükle'
          });
          if (!confirmed) {
            setRestoreStatus('İşlem iptal edildi.');
            setRestoreBusy(false);
            return;
          }
        }
      }

      if (editorSaveTimer) {
        clearTimeout(editorSaveTimer);
        editorSaveTimer = null;
      }
      snapshotEditor();

      var prepared = [];
      var importedSettings = null;
      if (mode === 'replace') {
        prepared = prepareImportedSections(pending.incoming, { preserveHidden: true });
        if (!prepared.length) throw new Error('Yedekte geçerli bölüm bulunamadı.');
        sections = prepared;
        importedSettings = (pending.data && typeof pending.data.settings === 'object') ? pending.data.settings : null;
        settings.hiddenSections = importedHiddenSections(importedSettings, prepared);
        if (importedSettings && typeof importedSettings.sidebarHidden === 'boolean') {
          settings.sidebarHidden = importedSettings.sidebarHidden;
        }
        trash = [];
        saveTrash();
      } else {
        var usedIds = {};
        var usedNames = {};
        sections.forEach(function (section) {
          if (!section || typeof section !== 'object') return;
          if (section.id) usedIds[section.id] = true;
          usedNames[trLower(section.name || '')] = true;
          if (section.structure === 'grouped') {
            (Array.isArray(section.groups) ? section.groups : []).forEach(function (group) {
              if (group && group.id) usedIds[group.id] = true;
              (group && Array.isArray(group.items) ? group.items : []).forEach(function (item) {
                if (item && item.id) usedIds[item.id] = true;
              });
            });
          } else {
            (Array.isArray(section.items) ? section.items : []).forEach(function (item) {
              if (item && item.id) usedIds[item.id] = true;
            });
          }
        });
        prepared = prepareImportedSections(pending.incoming, {
          freshIds: true,
          usedIds: usedIds,
          usedNames: usedNames
        });
        if (!prepared.length) throw new Error('Yedekte geçerli bölüm bulunamadı.');
        prepared.sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
        var maxOrder = sections.reduce(function (max, section) {
          return Math.max(max, (typeof section.sortOrder === 'number') ? section.sortOrder : 0);
        }, -1);
        prepared.forEach(function (section, index) {
          section.sortOrder = maxOrder + 1 + index;
        });
        sections = sections.concat(prepared);
      }

      normalizeSectionsList();
      await persistSections();
      committed = true;
      if (mode === 'replace') {
        try { await saveSettings(); } catch (e) {}
        applySettings();
      }
      lastCloudSig = sectionsSignature(sections);

      var addedStats = countRestoreStats(prepared);
      var firstId = prepared[0] ? prepared[0].id : null;
      setRestoreBusy(false);
      closeRestoreModal();
      if (typeof closeReader === 'function') closeReader();
      if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
      if (firstId) openSection(firstId);
      else closeAll();
      showToast(mode === 'replace'
        ? 'Yedek geri yüklendi: ' + formatRestoreStats(addedStats) + '.'
        : 'Yedekten ' + formatRestoreStats(addedStats) + ' eklendi.', null, null, 5000);
    } catch (err) {
      // Yerel kayıt başarısız olduysa yarım kalan değişikliği geri al; eski
      // notlar bellekte de korunsun.
      if (!committed) {
        sections = previousSections;
        trash = previousTrash;
        settings.hiddenSections = previousHiddenSections;
        settings.sidebarHidden = previousSidebarHidden;
        try { saveTrash(); } catch (e) {}
        try {
          renderSidebar();
          updateEmptyState();
          refreshActiveView();
        } catch (e) {}
      }
      setRestoreStatus('İçe aktarılamadı: ' + (err && err.message ? err.message : err), 'error');
      setRestoreBusy(false);
    }
  }

  // İlk kurulumda eski sürümden kalan bir yedeği bulup tek tıkla aktarmayı önerir.
  async function maybeOfferMigration() {
    if (!window.yaznotNative || typeof window.yaznotNative.findBackups !== 'function') return;
    if (sections.length > 0) return;
    var uid = null;
    try { uid = window.api.getActiveUid ? window.api.getActiveUid() : null; } catch (e) {}
    if (!uid) return;
    var flag = 'yaznot_migration_offered:' + uid;
    try { if (localStorage.getItem(flag)) return; } catch (e) { return; }
    var found = null;
    try { found = await window.yaznotNative.findBackups(); } catch (e) { return; }
    if (!found || !found.ok || !found.backups || found.backups.length === 0) return;
    var candidate = found.backups[0];
    if (!candidate || !candidate.path) return;
    try { localStorage.setItem(flag, String(Date.now())); } catch (e) {}
    var answer = await window.api.confirm({
      title: 'Eski yedeğin bulundu',
      message: candidate.name + ' bu bilgisayarda duruyor.',
      detail: 'Notların yeni sürüme aktarılsın mı? Daha sonra Ayarlar → Yedekten geri yükle ile de aktarabilirsin.',
      confirmLabel: 'Geri yükle'
    });
    if (!answer) return;
    var pick = await window.api.importBackup(candidate.path);
    if (!pick || !pick.ok) {
      if (pick && pick.error) alert('Yedek okunamadı: ' + pick.error);
      return;
    }
    var incoming = Array.isArray(pick.data && pick.data.sections) ? pick.data.sections : null;
    if (!incoming) { alert('Yedekte sections bulunamadı.'); return; }
    openRestoreModal(incoming, pick.data, pick.fileName);
  }

  document.getElementById('btn-import-backup').addEventListener('click', async function () {
    if (restoreBusy) return;
    var loggedIn = true;
    try { loggedIn = await window.yaznotAuth.isLoggedIn(); } catch (e) {}
    if (!loggedIn) { alert('İçe aktarma için önce giriş yapmalısın.'); return; }
    var pick = await window.api.importBackup();
    if (!pick || !pick.ok) { if (pick && pick.error) alert(pick.error); return; }
    var d = pick.data;
    if (!d || typeof d !== 'object') { alert('Geçersiz yedek dosyası.'); return; }
    var incoming = Array.isArray(d.sections) ? d.sections : null;
    if (!incoming) { alert('Yedekte sections bulunamadı.'); return; }
    openRestoreModal(incoming, d, pick.fileName);
  });

  if (restoreModes) {
    restoreModes.addEventListener('change', function (e) {
      var target = e.target;
      if (target && target.name === 'restore-mode') selectRestoreMode(target.value);
    });
  }
  if (restoreConfirmBtn) restoreConfirmBtn.addEventListener('click', applyRestore);
  if (restoreCancelBtn) restoreCancelBtn.addEventListener('click', closeRestoreModal);
  if (restoreModal) {
    restoreModal.addEventListener('click', function (e) {
      if (e.target === restoreModal) closeRestoreModal();
    });
  }

  // Kılavuz penceresi kapanana kadar bekler (ilk açılışta iki pencere üst üste açılmasın).
  function whenGuideClosed(callback) {
    var modal = document.getElementById('guide-modal');
    if (!modal || modal.classList.contains('hidden')) { callback(); return; }
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      observer.disconnect();
      callback();
    }
    var observer = new MutationObserver(function () {
      if (modal.classList.contains('hidden')) finish();
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    setTimeout(finish, 120000);
  }

  // ============ NORMALİZASYON ============
  function normalizeSectionsList() {
    sections.forEach(function (s, i) {
      if (typeof s.sortOrder !== 'number') s.sortOrder = i;
      if (typeof s.type !== 'string') s.type = 'list';
      if (typeof s.icon !== 'string' || !s.icon) s.icon = '📁';
      if (!s.structure) s.structure = 'flat';
      if (s.structure === 'grouped') {
        if (!Array.isArray(s.groups)) s.groups = [];
        s.groups.forEach(function (g, gi) {
          if (typeof g.sortOrder !== 'number') g.sortOrder = gi;
          if (!Array.isArray(g.items)) g.items = [];
          g.items.forEach(function (it) {
            if (typeof it.title !== 'string') it.title = 'Başlıksız';
            if (typeof it.content !== 'string') it.content = '';
          });
        });
      } else {
        if (!Array.isArray(s.items)) s.items = [];
        s.items.forEach(function (it) {
          if (typeof it.title !== 'string') it.title = 'Başlıksız';
          if (typeof it.content !== 'string') it.content = '';
        });
      }
    });
  }

  // ============ HESAP (çoklu hesap / geçiş) ============
  function accountInitial(acc) {
    var source = (acc && (acc.name || acc.email)) || '?';
    var trimmed = String(source).trim();
    return (trimmed.charAt(0) || '?').toUpperCase();
  }

  function setupAccount() {
    var accountEl = document.getElementById('sidebar-account');
    var emailEl = document.getElementById('sidebar-account-email');
    var avatarEl = document.getElementById('sidebar-account-avatar');
    var toggleBtn = document.getElementById('btn-switch-account');
    var menu = document.getElementById('account-menu');
    var listEl = document.getElementById('account-menu-list');
    var addBtn = document.getElementById('btn-add-account');
    var logoutBtn = document.getElementById('btn-logout');
    if (!accountEl && !toggleBtn) return;

    var accountCount = 0;

    function closeMenu() {
      if (menu) menu.classList.add('hidden');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    }
    function openMenu() {
      if (!menu) return;
      menu.classList.remove('hidden');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function renderAccounts(accounts) {
      accounts = Array.isArray(accounts) ? accounts : [];
      accountCount = accounts.length;
      var active = null;
      for (var i = 0; i < accounts.length; i++) {
        if (accounts[i].active) { active = accounts[i]; break; }
      }
      if (!active && accounts.length) active = accounts[0];
      if (emailEl) emailEl.textContent = active ? (active.email || '') : '';
      if (avatarEl) avatarEl.textContent = active ? accountInitial(active) : '👤';

      if (!listEl) return;
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

      if (!accounts.length) {
        var empty = document.createElement('div');
        empty.className = 'account-menu-empty';
        empty.textContent = 'Bu cihazda kayıtlı hesap yok.';
        listEl.appendChild(empty);
        return;
      }

      accounts.forEach(function (acc) {
        var row = document.createElement('div');
        row.className = 'account-row' + (acc.active ? ' active' : '');
        row.setAttribute('role', 'menuitem');
        row.tabIndex = 0;
        row.title = acc.active ? 'Etkin hesap' : ((acc.email || '') + ' hesabına geç');

        var avatar = document.createElement('span');
        avatar.className = 'account-row-avatar';
        avatar.textContent = accountInitial(acc);
        row.appendChild(avatar);

        var info = document.createElement('span');
        info.className = 'account-row-info';
        var emailSpan = document.createElement('span');
        emailSpan.className = 'account-row-email';
        emailSpan.textContent = acc.email || 'Hesap';
        info.appendChild(emailSpan);
        if (acc.name && acc.name !== acc.email) {
          var nameSpan = document.createElement('span');
          nameSpan.className = 'account-row-name';
          nameSpan.textContent = acc.name;
          info.appendChild(nameSpan);
        }
        row.appendChild(info);

        if (acc.active) {
          var check = document.createElement('span');
          check.className = 'account-row-check';
          check.textContent = '✓';
          check.title = 'Etkin';
          row.appendChild(check);
        } else if (acc.uid) {
          var remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'account-row-remove';
          remove.title = 'Bu hesabı bu cihazdan kaldır';
          remove.setAttribute('aria-label', 'Hesabı kaldır');
          remove.textContent = '×';
          remove.addEventListener('click', function (e) {
            e.stopPropagation();
            confirmRemoveAccount(acc);
          });
          row.appendChild(remove);
        }

        row.addEventListener('click', function () {
          if (acc.active) { closeMenu(); return; }
          switchToAccount(acc);
        });
        row.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            row.click();
          }
        });
        listEl.appendChild(row);
      });
    }

    function refreshAccounts() {
      if (window.yaznotAuth && typeof window.yaznotAuth.listAccounts === 'function') {
        try {
          Promise.resolve(window.yaznotAuth.listAccounts()).then(renderAccounts).catch(function () {});
        } catch (e) {}
        return;
      }
      // Test / eski köprü uyumluluğu.
      if (window.yaznotAuth && typeof window.yaznotAuth.getEmail === 'function') {
        window.yaznotAuth.getEmail().then(function (email) {
          renderAccounts(email ? [{ uid: null, email: email, active: true }] : []);
        }).catch(function () {});
      }
    }

    async function persistBeforeAccountChange() {
      try {
        if (editorSaveTimer) {
          clearTimeout(editorSaveTimer);
          editorSaveTimer = null;
        }
        snapshotEditor();
        // Hesap değişimi bulut yanıtını beklemesin; yerel kopya anında yazılır,
        // bekleyen değişiklik hesaba dönüldüğünde senkronize edilir.
        if (window.api && typeof window.api.saveLocal === 'function') {
          await window.api.saveLocal('sections', { sections: sections });
          await window.api.saveLocal('settings', settings);
        } else {
          await persistSections();
          await saveSettings();
        }
      } catch (e) {}
    }

    async function switchToAccount(account) {
      var uid = typeof account === 'string' ? account : (account && account.uid);
      if (!uid || !window.yaznotAuth || typeof window.yaznotAuth.switchAccount !== 'function') return;
      closeMenu();
      var hide = showSwitchOverlay(typeof account === 'object' ? account : { uid: uid });
      try {
        await persistBeforeAccountChange();
        var result = await window.yaznotAuth.switchAccount(uid);
        if (result && result.ok === false) {
          hide();
          showToast({ kind: 'danger', title: 'Hesap değiştirilemedi', detail: result.error || 'Bağlantını kontrol et.' });
        } else {
          hide();
        }
      } catch (e) {
        hide();
        showToast({ kind: 'danger', title: 'Hesap değiştirilemedi', detail: 'Bağlantını kontrol et.' });
      }
    }

    function confirmRemoveAccount(acc) {
      if (!acc || !acc.uid || !window.yaznotAuth || typeof window.yaznotAuth.removeAccount !== 'function') return;
      closeMenu();
      window.api.confirm({
        title: 'Hesabı bu cihazdan kaldır',
        kicker: 'HESAP',
        tone: 'account',
        icon: 'account',
        message: (acc.email || 'Bu hesap') + ' bu cihazdan kaldırılsın mı?',
        detail: 'Notların bulutta güvende kalır. Tekrar giriş yapmak için e-posta kodu gerekir.',
        subject: acc.email || '',
        confirmLabel: 'Hesabı kaldır',
        cancelLabel: 'Vazgeç'
      }).then(async function (ok) {
        if (!ok) return;
        await persistBeforeAccountChange();
        try {
          var result = await window.yaznotAuth.removeAccount(acc.uid);
          if (result && result.ok === false) {
            showToast({ kind: 'danger', title: 'Hesap kaldırılamadı', detail: result.error || 'Tekrar dene.' });
          } else {
            refreshAccounts();
            showToast({ kind: 'account', title: 'Hesap bu cihazdan kaldırıldı', detail: (acc.email || '') + ' · notlar bulutta güvende.' });
          }
        } catch (e) {
          showToast({ kind: 'danger', title: 'Hesap kaldırılamadı', detail: 'Bağlantını kontrol et.' });
        }
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (menu && !menu.classList.contains('hidden')) {
          closeMenu();
        } else {
          refreshAccounts();
          openMenu();
        }
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', async function () {
        closeMenu();
        await persistBeforeAccountChange();
        if (window.yaznotAuthUI && typeof window.yaznotAuthUI.openAddAccount === 'function') {
          window.yaznotAuthUI.openAddAccount();
        } else {
          showToast('Hesap ekleme bu sürümde kullanılamıyor.', null, null, 4000);
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        closeMenu();
        window.api.confirm({
          title: 'Çıkış Yap',
          message: 'Bu hesaptan çıkış yapılsın mı?',
          detail: accountCount > 1
            ? 'Bu cihazdaki diğer hesaplar açık kalır. Notların güvende; aynı hesapla tekrar giriş yapınca geri gelir.'
            : 'Notların güvende; aynı hesapla tekrar giriş yapınca geri gelir.',
          confirmLabel: 'Çıkış Yap'
        }).then(async function (ok) {
          if (!ok) return;
          await persistBeforeAccountChange();
          if (window.yaznotAuth && typeof window.yaznotAuth.signOut === 'function') {
            window.yaznotAuth.signOut();
          }
        });
      });
    }

    document.addEventListener('click', function (e) {
      if (!menu || menu.classList.contains('hidden')) return;
      if (accountEl && accountEl.contains(e.target)) return;
      closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!menu || menu.classList.contains('hidden')) return;
      e.stopPropagation();
      closeMenu();
    });

    refreshAccounts();
  }

  // ============ KULLANICI KAPSAMI ============
  async function ensureUserScopedCache() {
    if (!window.yaznotAuth) return;
    var uid = null;
    try { uid = await window.yaznotAuth.getUid(); } catch (e) {}
    if (!uid) return;
    // Yerel önbellek artık hesap başına ayrı anahtar alanında tutuluyor; hesap
    // değişiminde eski veriyi silmeye gerek yok. Yalnızca son kullanıcıyı işaretle.
    try { localStorage.setItem('yaznot_last_uid', uid); } catch (e) {}
  }

  // ============ BULUT YOKLAMASI (cihazlar arası anlık senkron) ============
  function sectionsSignature(list) {
    return JSON.stringify((list || []).map(function (s) {
      var clone = {
        id: s.id, name: s.name, icon: s.icon, type: s.type,
        structure: s.structure, hidden: !!s.hidden, sortOrder: s.sortOrder,
        updatedAt: s.updatedAt
      };
      if (s.structure === 'grouped') {
        clone.groups = (s.groups || []).map(function (g) {
          return {
            id: g.id, name: g.name, icon: g.icon, sortOrder: g.sortOrder, updatedAt: g.updatedAt,
            items: (g.items || []).map(function (it) { return { id: it.id, title: it.title, updatedAt: it.updatedAt }; })
          };
        });
      } else {
        clone.items = (s.items || []).map(function (it) { return { id: it.id, title: it.title, updatedAt: it.updatedAt }; });
      }
      return clone;
    }));
  }
  var lastCloudSig = null;

  function refreshActiveView() {
    var s = getActiveSection();
    if (!s) {
      var visible = visibleSections();
      if (visible.length > 0) { openSection(visible[0].id); return; }
      closeAll(); return;
    }
    if (s.structure === 'grouped') {
      var g = getActiveGroup();
      if (g) { renderGroupView(); return; }
    }
    renderSectionView();
  }

  async function refreshFromCloud() {
    if (!navigator.onLine) return;
    if (restoreBusy) return; // içe aktarma sürerken bulut verisi araya girmesin
    if (editorSaveTimer) return; // yazma sırasında karışma
    if (!itemEditorView.classList.contains('hidden')) return; // editör açıkken karışma

    var pending = 0;
    try { pending = window.api.getPendingSyncCount(); } catch (e) {}
    if (pending > 0) {
      try { await window.api.syncNow(); } catch (e) {}
      return; // önce yerel değişiklikleri gönder, sonraki turda bulutu çek
    }

    try {
      var data = await window.api.load('sections');
      if (restoreBusy) return;
      if (!data || !Array.isArray(data.sections)) return;
      var sig = sectionsSignature(data.sections);
      if (sig === lastCloudSig) return;
      lastCloudSig = sig;
      sections = data.sections;
      normalizeSectionsList();
      renderSidebar();
      updateEmptyState();
      refreshActiveView();
      if (typeof updateSyncIndicator === 'function') updateSyncIndicator();
    } catch (e) { /* bulut erişilemedi */ }
  }

  function setupCloudPolling() {
    setInterval(refreshFromCloud, 15000);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        // Sekme gizlenirken/kapanırken bekleyen kaydı anında yaz (veri kaybını önler)
        if (editorSaveTimer) { clearTimeout(editorSaveTimer); editorSaveTimer = null; persistSections(); }
      } else {
        try { window.api.syncNow(); } catch (e) {}
        refreshFromCloud();
      }
    });
    window.addEventListener('pagehide', function () {
      if (editorSaveTimer) { clearTimeout(editorSaveTimer); editorSaveTimer = null; persistSections(); }
    });
    window.addEventListener('focus', function () {
      try { window.api.syncNow(); } catch (e) {}
      refreshFromCloud();
    });
    window.addEventListener('online', function () {
      try { window.api.syncNow(); } catch (e) {}
      refreshFromCloud();
    });
  }

  // ============ v5: PAYLAŞIM ============
  function cloneItemWithNewIds(it) {
    return {
      id: uid('i'), title: (it && it.title) || '', content: (it && it.content) || '',
      images: (it && Array.isArray(it.images)) ? it.images.slice() : [],
      createdAt: Date.now(), updatedAt: Date.now()
    };
  }
  function cloneGroupWithNewIds(g) {
    return {
      id: uid('g'), name: (g && g.name) || '', icon: (g && g.icon) || '📁',
      sortOrder: (g && typeof g.sortOrder === 'number') ? g.sortOrder : 0,
      items: ((g && Array.isArray(g.items)) ? g.items : []).map(cloneItemWithNewIds),
      createdAt: Date.now(), updatedAt: Date.now()
    };
  }
  function cloneSectionWithNewIds(s) {
    var ns = {
      id: uid('s'), name: (s && s.name) || 'Bölüm',
      structure: (s && s.structure === 'grouped') ? 'grouped' : 'flat',
      type: (s && s.type === 'grid') ? 'grid' : 'list',
      icon: (s && s.icon) || '📁',
      sortOrder: 0, hidden: false,
      createdAt: Date.now(), updatedAt: Date.now()
    };
    if (ns.structure === 'grouped') {
      ns.groups = ((s && Array.isArray(s.groups)) ? s.groups : []).map(cloneGroupWithNewIds);
    } else {
      ns.items = ((s && Array.isArray(s.items)) ? s.items : []).map(cloneItemWithNewIds);
    }
    return ns;
  }
  function shareContentLabel(type) {
    if (type === 'section') return 'Bölüm';
    if (type === 'group') return 'Grup';
    return 'Öğe';
  }
  function shareContentName(type, data) {
    if (!data) return '';
    if (type === 'section') return data.name || '';
    if (type === 'group') return data.name || '';
    return data.title || '';
  }
  function findGroupById(gid) {
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      if (s.structure === 'grouped' && Array.isArray(s.groups)) {
        var g = s.groups.find(function (x) { return x.id === gid; });
        if (g) return g;
      }
    }
    return null;
  }

  var pendingShare = null;
  function openShareSend(type, id) {
    var content = null;
    if (type === 'section') {
      var s = sections.find(function (x) { return x.id === id; });
      if (s) content = JSON.parse(JSON.stringify(s));
    } else if (type === 'group') {
      var g = findGroupById(id);
      if (g) content = JSON.parse(JSON.stringify(g));
    } else {
      var it = getActiveItem();
      if (it) content = JSON.parse(JSON.stringify(it));
    }
    if (!content) { alert('Paylaşılacak içerik bulunamadı.'); return; }
    pendingShare = { type: type, content: content };
    document.getElementById('share-summary').textContent = shareContentLabel(type) + ': ' + shareContentName(type, content);
    document.getElementById('share-receiver-email').value = '';
    document.getElementById('share-message').value = '';
    setShareSendStatus('');
    document.getElementById('share-send-modal').classList.remove('hidden');
    setTimeout(function () { document.getElementById('share-receiver-email').focus(); }, 100);
  }
  function setShareSendStatus(msg, kind) {
    var el = document.getElementById('share-send-status');
    el.textContent = msg || '';
    el.className = 'auth-status' + (kind ? ' auth-status-' + kind : '');
  }
  async function doSendShare() {
    if (!pendingShare) return;
    var email = (document.getElementById('share-receiver-email').value || '').trim();
    var message = (document.getElementById('share-message').value || '').trim();
    if (!email || email.indexOf('@') === -1) {
      setShareSendStatus('Geçerli bir e-posta adresi gir.', 'error');
      return;
    }
    var confirmBtn = document.getElementById('share-send-confirm');
    confirmBtn.disabled = true;
    setShareSendStatus('Gönderiliyor...');
    try {
      await window.api.sendShare({
        receiverEmail: email,
        contentType: pendingShare.type,
        content: pendingShare.content,
        message: message
      });
      setShareSendStatus('Paylaşım gönderildi ✔', 'ok');
      setTimeout(function () {
        document.getElementById('share-send-modal').classList.add('hidden');
        pendingShare = null;
      }, 900);
    } catch (err) {
      setShareSendStatus('Hata: ' + (err && err.message ? err.message : 'gönderilemedi'), 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  }

  var sharesTab = 'incoming';
  function openSharesModal() {
    document.getElementById('shares-modal').classList.remove('hidden');
    loadShares();
  }
  function setSharesTab(tab) {
    document.getElementById('shares-tab-incoming').classList.toggle('active', tab === 'incoming');
    document.getElementById('shares-tab-sent').classList.toggle('active', tab === 'sent');
  }
  function setSharesStatus(msg, kind) {
    var el = document.getElementById('shares-status');
    el.textContent = msg || '';
    el.className = 'auth-status' + (kind ? ' auth-status-' + kind : '');
  }
  async function loadShares() {
    var listEl = document.getElementById('shares-list');
    listEl.innerHTML = '<div class="shares-empty">Yükleniyor…</div>';
    setSharesStatus('');
    try {
      var shares = (sharesTab === 'sent') ? await window.api.listSentShares() : await window.api.listIncomingShares();
      renderShares(shares);
    } catch (err) {
      listEl.innerHTML = '<div class="shares-empty">Paylaşımlar yüklenemedi.</div>';
      setSharesStatus('Hata: ' + (err && err.message ? err.message : err), 'error');
    }
  }
  function renderShares(shares) {
    var listEl = document.getElementById('shares-list');
    if (!shares || shares.length === 0) {
      listEl.innerHTML = '<div class="shares-empty">Henüz paylaşım yok.</div>';
      return;
    }
    var statusMap = { pending: 'Bekliyor', accepted: 'Kabul edildi', rejected: 'Reddedildi' };
    var html = '';
    shares.forEach(function (sh) {
      var meta = (sh.content_data && sh.content_data._share_meta) ? sh.content_data._share_meta : {};
      var content = (sh.content_data && sh.content_data.content) ? sh.content_data.content : null;
      var name = shareContentName(sh.content_type, content);
      html += '<div class="share-card">';
      html += '<div class="share-card-head">';
      html += '<span class="share-card-type">' + escapeHtml(shareContentLabel(sh.content_type)) + '</span>';
      html += '<span class="share-card-name">' + escapeHtml(name) + '</span>';
      html += '<span class="share-card-status ' + escapeHtml(sh.status || 'pending') + '">' + escapeHtml(statusMap[sh.status] || sh.status) + '</span>';
      html += '</div>';
      if (sharesTab === 'incoming') {
        html += '<div class="share-card-meta">Gönderen: ' + escapeHtml(meta.senderEmail || 'bilinmiyor') + '</div>';
      } else {
        html += '<div class="share-card-meta">Alıcı: ' + escapeHtml(sh.receiver_email || '') + '</div>';
      }
      if (sh.message) {
        html += '<div class="share-card-message">' + escapeHtml(sh.message) + '</div>';
      }
      if (sharesTab === 'incoming' && sh.status === 'pending') {
        html += '<div class="share-card-actions">';
        html += '<button class="btn-primary" data-accept="' + escapeHtml(sh.id) + '">Kabul Et</button>';
        html += '<button class="btn-secondary" data-reject="' + escapeHtml(sh.id) + '">Reddet</button>';
        html += '</div>';
      }
      html += '</div>';
    });
    listEl.innerHTML = html;
    listEl.querySelectorAll('[data-accept]').forEach(function (btn) {
      btn.addEventListener('click', function () { acceptShare(btn.getAttribute('data-accept')); });
    });
    listEl.querySelectorAll('[data-reject]').forEach(function (btn) {
      btn.addEventListener('click', function () { rejectShare(btn.getAttribute('data-reject')); });
    });
  }
  function shareToSection(sh) {
    var content = (sh.content_data && sh.content_data.content) ? sh.content_data.content : null;
    if (!content) return null;
    if (sh.content_type === 'section') return cloneSectionWithNewIds(content);
    if (sh.content_type === 'group') {
      var g = cloneGroupWithNewIds(content);
      return { id: uid('s'), name: (content.name || 'Paylaşılan'), structure: 'grouped', type: 'list', icon: '📁', sortOrder: 0, hidden: false, groups: [g], createdAt: Date.now(), updatedAt: Date.now() };
    }
    if (sh.content_type === 'item') {
      var it = cloneItemWithNewIds(content);
      return { id: uid('s'), name: (content.title || 'Paylaşılan'), structure: 'flat', type: 'list', icon: '📁', sortOrder: 0, hidden: false, items: [it], createdAt: Date.now(), updatedAt: Date.now() };
    }
    return null;
  }
  async function acceptShare(shareId) {
    var shares = await window.api.listIncomingShares();
    var sh = shares.find(function (x) { return x.id === shareId; });
    if (!sh || sh.status !== 'pending') return;
    var section = shareToSection(sh);
    if (!section) { setSharesStatus('İçerik okunamadı.', 'error'); return; }
    // Önce durumu kabul et (çevrimiçi gerekir); başarısız olursa içerik ekleme
    // ki çevrimdışı tekrar denemede aynı içerik iki kez kopyalanmasın.
    try { await window.api.updateShareStatus(shareId, 'accepted'); }
    catch (e) { setSharesStatus('İnternet bağlantısı gerekli. Tekrar dene.', 'error'); return; }
    sections.push(section);
    normalizeSectionsList();
    await persistSections();
    renderSidebar();
    updateEmptyState();
    setSharesStatus('"' + section.name + '" bölümüne eklendi ✔', 'ok');
    loadShares();
    updateSharesBadge();
  }
  async function rejectShare(shareId) {
    try { await window.api.updateShareStatus(shareId, 'rejected'); } catch (e) {}
    setSharesStatus('Reddedildi.', 'ok');
    loadShares();
    updateSharesBadge();
  }
  function updateSharesBadge() {
    var badge = document.getElementById('shares-badge');
    if (!badge || !window.api || !window.api.listIncomingShares) return;
    window.api.listIncomingShares().then(function (shares) {
      var pending = (shares || []).filter(function (s) { return s.status === 'pending'; }).length;
      badge.textContent = pending;
      if (pending > 0) badge.classList.remove('hidden');
      else badge.classList.add('hidden');
    }).catch(function () {});
  }
  function setupShares() {
    var btnOpen = document.getElementById('btn-open-shares');
    if (btnOpen) btnOpen.addEventListener('click', function () { closeMobileSidebar(); openSharesModal(); });
    var sharesModalEl = document.getElementById('shares-modal');
    document.getElementById('shares-close').addEventListener('click', function () { sharesModalEl.classList.add('hidden'); });
    sharesModalEl.addEventListener('click', function (e) { if (e.target === sharesModalEl) sharesModalEl.classList.add('hidden'); });
    document.getElementById('shares-tab-incoming').addEventListener('click', function () { sharesTab = 'incoming'; setSharesTab('incoming'); loadShares(); });
    document.getElementById('shares-tab-sent').addEventListener('click', function () { sharesTab = 'sent'; setSharesTab('sent'); loadShares(); });

    var sendModal = document.getElementById('share-send-modal');
    document.getElementById('share-send-cancel').addEventListener('click', function () { sendModal.classList.add('hidden'); pendingShare = null; });
    sendModal.addEventListener('click', function (e) { if (e.target === sendModal) { sendModal.classList.add('hidden'); pendingShare = null; } });
    document.getElementById('share-send-confirm').addEventListener('click', doSendShare);
    document.getElementById('share-receiver-email').addEventListener('keydown', function (e) { if (e.key === 'Enter') doSendShare(); });

    if (window.api && window.api.listIncomingShares) {
      updateSharesBadge();
      setInterval(updateSharesBadge, 30000);
    }
  }

  // ============ v5: İÇE / DIŞA AKTARMA ============
  function textToHtml(text) {
    var paras = String(text || '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
    var html = '';
    paras.forEach(function (p) {
      var lines = p.split('\n').map(escapeHtml).join('<br>');
      if (lines) html += '<p>' + lines + '</p>';
    });
    return html;
  }

  // Markdown → güvenli HTML. İçe aktarmada başlık, liste, kalın/italik, bağlantı,
  // görsel, alıntı, kod ve tablo biçimi korunur. Ham HTML her zaman kaçırılır.
  function markdownToHtml(md) {
    var src = String(md || '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
    var codeBlocks = [];

    src = src.replace(/```[^\n]*\n([\s\S]*?)```/g, function (_, code) {
      codeBlocks.push('<pre><code>' + escapeHtml(String(code).replace(/\n$/, '')) + '</code></pre>');
      return '\n\u0000CODE' + (codeBlocks.length - 1) + '\u0000\n';
    });

    function inline(text) {
      var s = escapeHtml(text);
      var codes = [];
      s = s.replace(/`([^`]+)`/g, function (_, c) {
        codes.push('<code>' + c + '</code>');
        return '\u0001' + (codes.length - 1) + '\u0001';
      });
      // Görseller bağlantılardan önce işlenir (![...](...)).
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
      var html = '<table><thead><tr>';
      head.forEach(function (c) { html += '<th>' + inline(c) + '</th>'; });
      html += '</tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr>';
        head.forEach(function (_, idx) { html += '<td>' + inline(r[idx] || '') + '</td>'; });
        html += '</tr>';
      });
      return html + '</tbody></table>';
    }

    var lines = src.split('\n');
    var out = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i++; continue; }

      var codeMatch = /^\u0000CODE(\d+)\u0000$/.exec(line.trim());
      if (codeMatch) { out.push(codeBlocks[parseInt(codeMatch[1], 10)] || ''); i++; continue; }

      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        var lvl = Math.min(h[1].length, 3);
        out.push('<h' + lvl + '>' + inline(h[2].replace(/\s+#+\s*$/, '')) + '</h' + lvl + '>');
        i++; continue;
      }
      if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      if (/^\s*>/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote>' + quote.map(inline).join('<br>') + '</blockquote>');
        continue;
      }
      if (/^\s*[-*+]\s+/.test(line)) {
        var uls = [];
        while (i < lines.length) {
          var um = /^\s*[-*+]\s+(.*)$/.exec(lines[i]);
          if (um) { uls.push(um[1]); i++; continue; }
          // Liste maddesinin alt satıra taşan devamı (girintili satır).
          if (uls.length && /^\s{2,}\S/.test(lines[i]) &&
            !/^\s*(?:[-*+]\s+|\d+[.)]\s+|#{1,6}\s+|>|```)/.test(lines[i])) {
            uls[uls.length - 1] += ' ' + lines[i].trim(); i++; continue;
          }
          break;
        }
        out.push('<ul>' + uls.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ul>');
        continue;
      }
      if (/^\s*\d+[.)]\s+/.test(line)) {
        var ols = [];
        while (i < lines.length) {
          var om = /^\s*\d+[.)]\s+(.*)$/.exec(lines[i]);
          if (om) { ols.push(om[1]); i++; continue; }
          if (ols.length && /^\s{2,}\S/.test(lines[i]) &&
            !/^\s*(?:[-*+]\s+|\d+[.)]\s+|#{1,6}\s+|>|```)/.test(lines[i])) {
            ols[ols.length - 1] += ' ' + lines[i].trim(); i++; continue;
          }
          break;
        }
        out.push('<ol>' + ols.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ol>');
        continue;
      }
      if (line.indexOf('|') !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        var head = splitRow(line);
        var rows = [];
        i += 2;
        while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim()) {
          rows.push(splitRow(lines[i])); i++;
        }
        out.push(renderTable(head, rows));
        continue;
      }

      // Paragraf: boş satıra veya yeni bir bloğa kadar topla.
      var para = [line];
      i++;
      while (i < lines.length && lines[i].trim() &&
        !/^(#{1,6}\s|>|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[i]) &&
        !/^\u0000CODE\d+\u0000$/.test(lines[i].trim()) &&
        !/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(lines[i]) &&
        !(lines[i].indexOf('|') !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
        para.push(lines[i]); i++;
      }
      out.push('<p>' + para.map(inline).join('<br>') + '</p>');
    }
    return out.join('\n');
  }
  function htmlToPlainText(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    var blocks = ['P', 'DIV', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE'];
    var out = '';
    function walk(node) {
      var children = node.childNodes;
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c.nodeType === 3) { out += c.nodeValue; }
        else if (c.nodeType === 1) {
          var tag = c.tagName;
          if (tag === 'BR') { out += '\n'; continue; }
          if (tag === 'IMG') { continue; }
          walk(c);
          if (blocks.indexOf(tag) !== -1) out += '\n';
        }
      }
    }
    walk(div);
    return out.replace(/\n{3,}/g, '\n\n').trim();
  }

  var importPending = null;
  function setImportStatus(msg, kind) {
    var el = document.getElementById('import-status');
    el.textContent = msg || '';
    el.className = 'auth-status' + (kind ? ' auth-status-' + kind : '');
  }
  function openImportPicker() {
    if (!getActiveSection()) { alert('Önce bir bölüm aç.'); return; }
    window.api.pickImportFile().then(function (res) {
      if (!res || !res.ok) { if (res && res.error) alert(res.error); return; }
      if (res.kind === 'pdf') {
        setImportStatus('PDF okunuyor…');
        extractPdfText(res.arrayBuffer).then(function (text) {
          if (!text) { setImportStatus('Bu PDF\'de çıkarılabilir metin bulunamadı (taranmış görüntü olabilir).', 'error'); return; }
          showImportPreview(res.fileName, text, 'pdf');
        }).catch(function (err) {
          setImportStatus('PDF okunamadı: ' + (err && err.message ? err.message : err), 'error');
        });
      } else {
        showImportPreview(res.fileName, res.text || '', res.kind === 'md' ? 'md' : 'text');
      }
    });
  }
  function showImportPreview(fileName, text, kind) {
    var title = String(fileName || '').replace(/\.(txt|md|markdown|pdf)$/i, '');
    document.getElementById('import-title').value = title;
    var preview = document.getElementById('import-preview');
    var body = String(text || '');
    if (kind === 'md') {
      preview.className = 'import-preview rendered';
      preview.innerHTML = markdownToHtml(body);
      setImportStatus('Markdown biçimi korunarak aktarılacak.');
      importPending = { text: body, html: preview.innerHTML, kind: 'md' };
    } else {
      preview.className = 'import-preview';
      preview.textContent = body;
      setImportStatus(kind === 'pdf' ? 'PDF metni düz metin olarak aktarılacak.' : '');
      importPending = { text: body, kind: kind || 'text' };
    }
    document.getElementById('import-modal').classList.remove('hidden');
  }
  var pdfLoaderPromise = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfLoaderPromise) return pdfLoaderPromise;
    pdfLoaderPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'pdf.min.js';
      script.onload = function () {
        if (!window.pdfjsLib) { pdfLoaderPromise = null; reject(new Error('PDF kütüphanesi yüklenemedi')); return; }
        resolve(window.pdfjsLib);
      };
      script.onerror = function () {
        pdfLoaderPromise = null;
        reject(new Error('PDF kütüphanesi yüklenemedi'));
      };
      document.head.appendChild(script);
    });
    return pdfLoaderPromise;
  }
  async function extractPdfText(arrayBuffer) {
    var lib = await loadPdfJs();
    if (!lib) throw new Error('PDF kütüphanesi yüklenemedi');
    try { if (!lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js'; } catch (e) {}
    // CVE-2024-4367: PDF.js 3.11'in eval tabanlı font yolu, kötü niyetli
    // bir PDF'te JavaScript çalıştırabiliyor. Metin çıkarma için eval'e
    // ihtiyaç yok; kapatıyoruz.
    var doc = await lib.getDocument({ data: arrayBuffer, isEvalSupported: false }).promise;
    try {
      var pages = [];
      for (var i = 1; i <= doc.numPages; i++) {
        var page = await doc.getPage(i);
        var tc = await page.getTextContent();
        var line = '';
        var lines = [];
        tc.items.forEach(function (it) {
          if (typeof it.str === 'string') line += it.str;
          if (it.hasEOL) { lines.push(line.trim()); line = ''; }
        });
        if (line.trim()) lines.push(line.trim());
        pages.push(lines.join('\n'));
      }
      return pages.join('\n\n');
    } finally {
      // PDF belgesi ve worker'ı iş bitince serbest bırakılır.
      try { await doc.destroy(); } catch (e) {}
      try { if (typeof window.gc === 'function') window.gc(); } catch (e) {}
    }
  }
  function confirmImport() {
    if (!importPending) return;
    var title = (document.getElementById('import-title').value || '').trim() || 'İçe Aktarılan';
    var html = importPending.html || textToHtml(importPending.text);
    var s = getActiveSection();
    if (!s) { setImportStatus('Bölüm bulunamadı.', 'error'); return; }
    var item = { id: uid('i'), title: title, content: html, images: [], createdAt: Date.now(), updatedAt: Date.now() };
    if (s.structure === 'grouped') {
      var g = getActiveGroup();
      if (!g) { setImportStatus('Grup bulunamadı.', 'error'); return; }
      if (!Array.isArray(g.items)) g.items = [];
      g.items.push(item);
      persistSections();
      renderGroupView();
    } else {
      if (!Array.isArray(s.items)) s.items = [];
      s.items.push(item);
      persistSections();
      renderSectionView();
    }
    document.getElementById('import-modal').classList.add('hidden');
    importPending = null;
  }
  function doExportTxt() {
    var item = getActiveItem();
    if (!item) return;
    window.api.exportTxt(item.title, htmlToPlainText(sanitizeHtml(item.content)), 'txt').then(function (res) {
      if (res && res.error) alert('Dışa aktarılamadı: ' + res.error);
    });
  }
  function doExportPdf() {
    var item = getActiveItem();
    if (!item) return;
    window.api.exportPdf(item.title, sanitizeHtml(item.content)).then(function (res) {
      if (res && res.error) alert('Dışa aktarılamadı: ' + res.error);
    });
  }
  // ============ MARKDOWN DIŞA AKTARMA ============
  function htmlToMarkdown(html) {
    var div = document.createElement('div');
    div.innerHTML = sanitizeHtml(html || '');

    function inline(node) {
      var out = '';
      for (var i = 0; i < node.childNodes.length; i++) {
        var c = node.childNodes[i];
        if (c.nodeType === 3) { out += c.nodeValue.replace(/\s+/g, ' '); continue; }
        if (c.nodeType !== 1) continue;
        var t = c.tagName;
        var inner = inline(c);
        if (t === 'BR') out += '  \n';
        else if (t === 'B' || t === 'STRONG') out += '**' + inner.trim() + '**';
        else if (t === 'I' || t === 'EM') out += '*' + inner.trim() + '*';
        else if (t === 'S' || t === 'STRIKE') out += '~~' + inner.trim() + '~~';
        else if (t === 'MARK') out += '==' + inner.trim() + '==';
        else if (t === 'CODE') out += '`' + inner + '`';
        else if (t === 'A') out += '[' + inner.trim() + '](' + (c.getAttribute('href') || '') + ')';
        else if (t === 'IMG') out += '![](' + (c.getAttribute('src') || '') + ')';
        else out += inner;
      }
      return out;
    }

    function blocks(node) {
      var out = [];
      for (var i = 0; i < node.childNodes.length; i++) {
        var c = node.childNodes[i];
        if (c.nodeType === 3) {
          var txt = c.nodeValue.trim();
          if (txt) out.push(txt);
          continue;
        }
        if (c.nodeType !== 1) continue;
        var tag = c.tagName;
        if (tag === 'H1') out.push('# ' + inline(c).trim());
        else if (tag === 'H2') out.push('## ' + inline(c).trim());
        else if (tag === 'H3') out.push('### ' + inline(c).trim());
        else if (tag === 'BLOCKQUOTE') {
          out.push(inline(c).trim().split('\n').map(function (l) { return '> ' + l; }).join('\n'));
        } else if (tag === 'PRE') {
          out.push('```\n' + String(c.textContent || '').replace(/\n+$/, '') + '\n```');
        } else if (tag === 'UL' || tag === 'OL') {
          var items = [];
          for (var j = 0; j < c.children.length; j++) {
            var li = c.children[j];
            if (li.tagName !== 'LI') continue;
            items.push((tag === 'OL' ? (j + 1) + '. ' : '- ') + inline(li).trim());
          }
          if (items.length) out.push(items.join('\n'));
        } else if (tag === 'HR') out.push('---');
        else if (tag === 'IMG') out.push('![](' + (c.getAttribute('src') || '') + ')');
        else if (tag === 'P' || tag === 'DIV') {
          var text = inline(c).trim();
          if (text) out.push(text);
          else { var sub = blocks(c); if (sub) out.push(sub); }
        } else {
          var sub2 = blocks(c);
          if (sub2) out.push(sub2);
        }
      }
      return out.join('\n\n');
    }

    return blocks(div).replace(/\n{3,}/g, '\n\n').trim();
  }

  function exportItemMarkdown() {
    var item = getActiveItem();
    if (!item) return;
    var md = '# ' + (item.title || 'Başlıksız') + '\n\n' + htmlToMarkdown(item.content);
    window.api.exportTxt(item.title || 'belge', md, 'md').then(function (res) {
      if (res && res.error) alert('Dışa aktarılamadı: ' + res.error);
    });
  }

  function exportSectionMarkdown(sid) {
    var s = sections.find(function (x) { return x.id === sid; });
    if (!s) return;
    var parts = ['# ' + (s.icon ? s.icon + ' ' : '') + s.name, ''];
    function addItem(it) {
      parts.push('## ' + (it.title || 'Başlıksız'));
      parts.push('');
      var body = htmlToMarkdown(it.content);
      if (body) parts.push(body);
      parts.push('');
    }
    if (s.structure === 'grouped') {
      (Array.isArray(s.groups) ? s.groups : []).forEach(function (g) {
        parts.push('## ' + (g.name || 'Grup'));
        parts.push('');
        (Array.isArray(g.items) ? g.items : []).forEach(function (it) {
          parts.push('### ' + (it.title || 'Başlıksız'));
          parts.push('');
          var body = htmlToMarkdown(it.content);
          if (body) parts.push(body);
          parts.push('');
        });
      });
    } else {
      (Array.isArray(s.items) ? s.items : []).forEach(addItem);
    }
    window.api.exportTxt(s.name || 'bolum', parts.join('\n'), 'md').then(function (res) {
      if (res && res.error) alert('Dışa aktarılamadı: ' + res.error);
    });
  }

  function exportGroupMarkdown(gid) {
    var s = getActiveSection();
    if (!s || !Array.isArray(s.groups)) return;
    var g = s.groups.find(function (x) { return x.id === gid; });
    if (!g) return;
    var parts = [
      '# ' + (s.icon ? s.icon + ' ' : '') + s.name,
      '',
      '## ' + (g.name || 'Grup'),
      ''
    ];
    (Array.isArray(g.items) ? g.items : []).forEach(function (it) {
      parts.push('### ' + (it.title || 'Başlıksız'));
      parts.push('');
      var body = htmlToMarkdown(it.content);
      if (body) parts.push(body);
      parts.push('');
    });
    window.api.exportTxt((s.name || 'bolum') + ' - ' + (g.name || 'grup'), parts.join('\n'), 'md').then(function (res) {
      if (res && res.error) alert('Dışa aktarılamadı: ' + res.error);
    });
  }

  // Bölüm/grup menülerindeki ikincil işlemler ve kabuk düğmeleri.
  function setupShellActions() {
    function on(id, handler) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        handler();
      });
    }
    on('btn-collapse-sidebar', function () {
      settings.sidebarHidden = true;
      saveSettings();
      applySettings();
    });
    on('btn-hidden-sections', function () { openHiddenSectionsModal(); });
    on('btn-export-section-md', function () {
      if (activeSectionId) exportSectionMarkdown(activeSectionId);
    });
    on('btn-edit-section', function () {
      if (activeSectionId) editSectionModal(activeSectionId);
    });
    on('btn-hide-section', function () {
      if (activeSectionId) hideSection(activeSectionId);
    });
    on('btn-delete-section', function () {
      if (activeSectionId) deleteSection(activeSectionId);
    });
    on('btn-export-group-md', function () {
      if (activeGroupId) exportGroupMarkdown(activeGroupId);
    });
    on('btn-share-group', function () {
      if (activeGroupId) openShareSend('group', activeGroupId);
    });
    on('btn-delete-group', function () {
      if (activeGroupId) deleteGroup(activeGroupId);
    });
  }

  function setupImportExport() {
    var importSectionBtn = document.getElementById('btn-import-section');
    var importGroupBtn = document.getElementById('btn-import-group');
    if (importSectionBtn) importSectionBtn.addEventListener('click', openImportPicker);
    if (importGroupBtn) importGroupBtn.addEventListener('click', openImportPicker);
    var shareItemBtn = document.getElementById('btn-share-item');
    if (shareItemBtn) shareItemBtn.addEventListener('click', function () { openShareSend('item', activeItemId); });
    var exportPdfBtn = document.getElementById('btn-export-pdf');
    var exportTxtBtn = document.getElementById('btn-export-txt');
    var exportMdBtn = document.getElementById('btn-export-md');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', doExportPdf);
    if (exportTxtBtn) exportTxtBtn.addEventListener('click', doExportTxt);
    if (exportMdBtn) exportMdBtn.addEventListener('click', exportItemMarkdown);
    var impModal = document.getElementById('import-modal');
    document.getElementById('import-cancel').addEventListener('click', function () { impModal.classList.add('hidden'); importPending = null; });
    impModal.addEventListener('click', function (e) { if (e.target === impModal) { impModal.classList.add('hidden'); importPending = null; } });
    document.getElementById('import-confirm').addEventListener('click', confirmImport);
  }

  // ============ AYARLAR ============
  var settingsModal = document.getElementById('settings-modal');
  var settingsFontSize = document.getElementById('settings-font-size');
  var settingsFontLabel = document.getElementById('settings-font-label');
  var settingsLineHeight = document.getElementById('settings-line-height');
  var settingsLineLabel = document.getElementById('settings-line-label');
  var settingsSpellcheck = document.getElementById('settings-spellcheck');

  function syncSettingsUI() {
    document.querySelectorAll('#settings-theme .type-option').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme') === settings.theme);
    });
    document.querySelectorAll('#settings-width .type-option').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-width') === settings.editorWidth);
    });
    if (settingsFontSize) settingsFontSize.value = settings.fontSize;
    if (settingsFontLabel) settingsFontLabel.textContent = settings.fontSize + 'px';
    if (settingsLineHeight) settingsLineHeight.value = settings.lineHeight;
    if (settingsLineLabel) settingsLineLabel.textContent = (settings.lineHeight / 100).toFixed(2);
    if (settingsSpellcheck) settingsSpellcheck.checked = !!settings.spellcheck;

    var note = document.getElementById('settings-backup-note');
    if (note) {
      var last = 0;
      try { last = parseInt(localStorage.getItem(autoBackupStorageKey()) || '0', 10); } catch (e) {}
      var supported = window.api && window.api.autoBackup && window.api.platform === 'desktop';
      if (!supported) note.textContent = 'Otomatik yedekleme yalnızca masaüstü uygulamasında çalışır.';
      else if (last) note.textContent = 'Otomatik yedek: son alınma ' + new Date(last).toLocaleString(localeTag()) + ' · günlük, son 7 kopya tutulur.';
      else note.textContent = 'Otomatik yedek: ilk kopya birazdan alınacak · günlük, son 7 kopya tutulur.';
    }
  }

  function openSettings() {
    syncSettingsUI();
    settingsModal.classList.remove('hidden');
  }

  if (settingsModal) {
    document.getElementById('btn-settings').addEventListener('click', function () {
      closeMobileSidebar();
      openSettings();
    });
    document.getElementById('settings-close').addEventListener('click', function () {
      settingsModal.classList.add('hidden');
    });
    settingsModal.addEventListener('click', function (e) {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });
    document.querySelectorAll('#settings-theme .type-option').forEach(function (b) {
      b.addEventListener('click', function () {
        setSetting('theme', b.getAttribute('data-theme'));
        syncSettingsUI();
      });
    });
    document.querySelectorAll('#settings-width .type-option').forEach(function (b) {
      b.addEventListener('click', function () {
        setSetting('editorWidth', b.getAttribute('data-width'));
        syncSettingsUI();
      });
    });
    if (settingsFontSize) {
      settingsFontSize.addEventListener('input', function () {
        settings.fontSize = parseInt(settingsFontSize.value, 10) || 17;
        settingsFontLabel.textContent = settings.fontSize + 'px';
        applySettings();
      });
      settingsFontSize.addEventListener('change', saveSettings);
    }
    if (settingsLineHeight) {
      settingsLineHeight.addEventListener('input', function () {
        settings.lineHeight = parseInt(settingsLineHeight.value, 10) || 185;
        settingsLineLabel.textContent = (settings.lineHeight / 100).toFixed(2);
        applySettings();
      });
      settingsLineHeight.addEventListener('change', saveSettings);
    }
    if (settingsSpellcheck) {
      settingsSpellcheck.addEventListener('change', function () {
        setSetting('spellcheck', !!settingsSpellcheck.checked);
      });
    }
    document.getElementById('settings-open-backups').addEventListener('click', function () {
      if (window.api.openBackupsFolder) {
        window.api.openBackupsFolder().then(function (res) {
          if (!res || !res.ok) alert('Yedek klasörü açılamadı. Bu özellik yalnızca masaüstü uygulamasında kullanılabilir.');
        });
      }
    });
  }

  // ============ İSTATİSTİK ============
  var statsModal = document.getElementById('stats-modal');
  function computeStats() {
    var stat = { sections: 0, hidden: 0, groups: 0, notes: 0, words: 0, chars: 0, images: 0, lastEdited: 0 };
    sections.forEach(function (s) {
      stat.sections++;
      if (settings.hiddenSections[s.id]) stat.hidden++;
      function addItem(it) {
        stat.notes++;
        var text = htmlToText(it.content);
        stat.words += text ? text.split(' ').filter(Boolean).length : 0;
        stat.chars += text.length;
        stat.images += (String(it.content || '').match(/<img\b/gi) || []).length;
        if (it.updatedAt && it.updatedAt > stat.lastEdited) stat.lastEdited = it.updatedAt;
      }
      if (s.structure === 'grouped') {
        (Array.isArray(s.groups) ? s.groups : []).forEach(function (g) {
          stat.groups++;
          (Array.isArray(g.items) ? g.items : []).forEach(addItem);
        });
      } else {
        (Array.isArray(s.items) ? s.items : []).forEach(addItem);
      }
    });
    return stat;
  }

  function openStats() {
    var st = computeStats();
    var cards = [
      { v: st.sections.toLocaleString(localeTag()), l: 'Bölüm', accent: true },
      { v: st.notes.toLocaleString(localeTag()), l: 'Not', accent: true },
      { v: st.groups.toLocaleString(localeTag()), l: 'Grup' },
      { v: st.words.toLocaleString(localeTag()), l: 'Kelime' },
      { v: st.chars.toLocaleString(localeTag()), l: 'Karakter' },
      { v: st.images.toLocaleString(localeTag()), l: 'Görsel' },
      { v: '~' + Math.max(1, Math.round(st.words / 200)).toLocaleString(localeTag()) + ' dk', l: 'Toplam okuma' },
      { v: st.hidden.toLocaleString(localeTag()), l: 'Gizli bölüm' }
    ];
    var html = '';
    cards.forEach(function (c) {
      html += '<div class="stat-card' + (c.accent ? ' stat-card-accent' : '') + '">';
      html += '<div class="stat-value">' + escapeHtml(c.v) + '</div>';
      html += '<div class="stat-label">' + escapeHtml(c.l) + '</div></div>';
    });
    document.getElementById('stats-grid').innerHTML = html;
    document.getElementById('stats-note').textContent = st.lastEdited
      ? 'Son düzenleme: ' + new Date(st.lastEdited).toLocaleString(localeTag())
      : 'Henüz düzenlenmiş bir not yok.';
    statsModal.classList.remove('hidden');
  }

  if (statsModal) {
    document.getElementById('btn-stats').addEventListener('click', function () {
      closeMobileSidebar();
      openStats();
    });
    document.getElementById('stats-close').addEventListener('click', function () {
      statsModal.classList.add('hidden');
    });
    statsModal.addEventListener('click', function (e) {
      if (e.target === statsModal) statsModal.classList.add('hidden');
    });
  }

  // ============ OTOMATİK YEDEK ============
  var AUTO_BACKUP_KEY = 'yaznot_last_auto_backup';
  var AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000;

  // Yedekler hesap başına ayrı tutulur; bir hesabın yedeği diğerinin üzerine yazmaz.
  function autoBackupStorageKey() {
    var uid = (window.api && typeof window.api.getActiveUid === 'function') ? window.api.getActiveUid() : null;
    return AUTO_BACKUP_KEY + (uid ? ':' + uid : '');
  }

  async function maybeAutoBackup(force) {
    if (!window.api || !window.api.autoBackup) return null;
    var last = 0;
    try { last = parseInt(localStorage.getItem(autoBackupStorageKey()) || '0', 10) || 0; } catch (e) {}
    if (!force && Date.now() - last < AUTO_BACKUP_INTERVAL) return null;
    if (!sections || sections.length === 0) return null;
    try {
      var activeUid = (typeof window.api.getActiveUid === 'function') ? window.api.getActiveUid() : null;
      var res = await window.api.autoBackup({
        yaznot_version: '1.0.0',
        exported_at: new Date().toISOString(),
        account_uid: activeUid,
        sections: sections,
        settings: settings
      });
      if (res && res.ok) {
        try { localStorage.setItem(autoBackupStorageKey(), String(Date.now())); } catch (e) {}
        syncSettingsUI();
      }
      return res;
    } catch (e) { return null; }
  }

  // Test ortamı için iç yardımcılar (yalnızca bayrak açıkken erişilebilir).
  if (window.__YAZNOT_TEST__) {
    window.__yaznotTest = {
      sanitizeHtml: sanitizeHtml,
      htmlToMarkdown: htmlToMarkdown,
      markdownToHtml: markdownToHtml,
      htmlToText: htmlToText,
      countWords: countWordsInHtml
    };
  }

  // ============ INIT ============
  // Pencere arka plandayken veya 60 sn işlem yapılmadığında WebView2'nin
  // kullanılmayan önbellekleri bırakmasını ister; girdi gelince tam moda döner.
  function setupMemorySaver() {
    if (!window.yaznotNative || typeof window.yaznotNative.setMemoryLevel !== 'function') return;
    var idleTimer = null;
    var isLow = false;
    function sttBusy() {
      try {
        return !!(window.YazNotSTT && window.YazNotSTT._state &&
          (window.YazNotSTT._state.busy || window.YazNotSTT._state.recording));
      } catch (e) { return false; }
    }
    function apply(low) {
      if (low && sttBusy()) return;
      if (isLow === low) return;
      isLow = low;
      try { window.yaznotNative.setMemoryLevel(low); } catch (e) {}
    }
    function active() {
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      apply(false);
      idleTimer = setTimeout(function () { apply(true); }, 60000);
    }
    ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(function (name) {
      window.addEventListener(name, active, { passive: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
        apply(true);
      } else {
        active();
      }
    });
    window.addEventListener('blur', function () {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { apply(true); }, 30000);
    });
    idleTimer = setTimeout(function () { idleTimer = null; apply(true); }, 3000);
  }

  (async function init() {
    // Oturum yokken veri işlemleri yapma. Aksi halde açılışta boş "sections"
    // kaydedilip buluttaki gerçek notlar ezilebilir (veri kaybı).
    var loggedIn = false;
    try { loggedIn = await window.yaznotAuth.isLoggedIn(); } catch (e) {}
    setupMemorySaver();
    if (!loggedIn) return;

    await ensureUserScopedCache();
    await loadSettings();
    applySettings();
    await migrateLegacyIfNeeded();
    lastCloudSig = sectionsSignature(sections);
    renderSidebar();
    updateEmptyState();
    if (sections.length > 0) {
      var visible = visibleSections();
      if (visible.length > 0) openSection(visible[0].id);
    }
    setupSyncIndicator();
    setupAccount();
    setupCloudPolling();
    setupShares();
    setupImportExport();
    setupShellActions();
    setupMenus();
    setupGuideButtons();
    setupTrash();
    setupBulk();
    syncSelectButtons();
    await loadTrash();

    // Hızlı arama / odak modu düğmeleri
    var paletteBtn = document.getElementById('btn-palette');
    if (paletteBtn) paletteBtn.addEventListener('click', function () { closeMobileSidebar(); openPalette(); });
    var focusBtn = document.getElementById('btn-focus-mode');
    if (focusBtn) {
      focusBtn.addEventListener('click', function () { setSetting('focusMode', !settings.focusMode); });
      focusBtn.classList.toggle('active', !!settings.focusMode);
    }
    // Editör başlığındaki hızlı "Sesten metne" düğmesi (araç çubuğundakinin yanı sıra)
    var sttBtn = document.getElementById('btn-stt');
    if (sttBtn) {
      // mousedown'ı engelle: editördeki imleç konumu kaybolmasın.
      sttBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
      sttBtn.addEventListener('click', openSpeechToText);
    }

    // Günlük otomatik yedek (masaüstünde)
    maybeAutoBackup(false);

    // Kılavuz: ilk girişte bir kez açılır; sağ alttaki ? düğmesi her zaman durur.
    var guideFab = document.getElementById('guide-fab');
    if (guideFab) guideFab.classList.remove('hidden');
    maybeShowGuideFirstRun();
    setTimeout(function () { whenGuideClosed(function () { maybeOfferMigration(); }); }, 900);

    // Sekme kapanırken bekleyen düzenlemeyi kaydet + yedeği tazele.
    window.addEventListener('beforeunload', function () {
      if (editorSaveTimer) { clearTimeout(editorSaveTimer); editorSaveTimer = null; persistSections(); }
    });
  })();
});
