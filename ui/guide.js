/**
 * YazNot — Kullanım kılavuzu görüntüleyicisi
 *
 * İçerik `guide-content.js` dosyasında üretilir (kaynak: docs/KULLANIM-KILAVUZU.md).
 * Kılavuz uygulama içinde okunur; aynı içeriğin PDF'i paketin içinde gelir.
 * İlk girişte bir kez kendiliğinden açılır, sonra sağ alttaki ? düğmesiyle açılır.
 */
(function () {
  'use strict';

  var data = window.YAZNOT_GUIDE || { sections: [] };
  var modal = null;
  var sheet = null;
  var bodyEl = null;
  var tocEl = null;
  var welcomeEl = null;
  var downloadBtn = null;
  var doneBtn = null;
  var closeBtn = null;
  var lastFocus = null;
  var rendered = false;
  var activeId = '';
  var scrollScheduled = false;
  var downloadLabel = '';

  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render() {
    if (rendered) return;
    rendered = true;
    if (!bodyEl || !tocEl) return;
    bodyEl.innerHTML = '';
    tocEl.innerHTML = '';

    var sections = Array.isArray(data.sections) ? data.sections : [];
    if (!sections.length) {
      bodyEl.innerHTML = '<section class="guide-section"><h2>Kılavuz hazırlanıyor</h2>' +
        '<p>Bu sürümde kılavuz içeriği bulunamadı. PDF dosyasını indirerek okuyabilirsin.</p></section>';
      return;
    }

    sections.forEach(function (section, index) {
      var id = 'guide-sec-' + (section.id || index);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'guide-toc-btn' + (index === 0 ? ' active' : '');
      btn.textContent = section.title || ('Bölüm ' + (index + 1));
      btn.setAttribute('data-target', id);
      btn.addEventListener('click', function () {
        var target = document.getElementById(id);
        if (!target || !bodyEl) return;
        bodyEl.scrollTop = Math.max(0, target.offsetTop - 6);
        setActive(id);
      });
      tocEl.appendChild(btn);

      var sec = document.createElement('section');
      sec.className = 'guide-section';
      sec.id = id;
      sec.innerHTML = '<h2>' + escapeHtml(section.title || '') + '</h2>' + (section.html || '');
      bodyEl.appendChild(sec);
    });

    if (sections[0]) setActive('guide-sec-' + (sections[0].id || 0));
  }

  function setActive(id) {
    activeId = id;
    if (!tocEl) return;
    Array.prototype.forEach.call(tocEl.querySelectorAll('.guide-toc-btn'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-target') === id);
      if (btn.getAttribute('data-target') === id && tocEl.scrollWidth > tocEl.clientWidth) {
        try { btn.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {}
      }
    });
  }

  function onScroll() {
    if (scrollScheduled || !bodyEl) return;
    scrollScheduled = true;
    window.requestAnimationFrame(function () {
      scrollScheduled = false;
      var sections = bodyEl.querySelectorAll('.guide-section');
      var pos = bodyEl.scrollTop + 48;
      var current = sections.length ? sections[0].id : '';
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= pos) current = sections[i].id;
      }
      if (current && current !== activeId) setActive(current);
    });
  }

  function open(opts) {
    opts = opts || {};
    if (!modal) return;
    render();
    lastFocus = document.activeElement;
    if (welcomeEl) welcomeEl.classList.toggle('hidden', !opts.welcome);
    modal.classList.remove('hidden');
    document.body.classList.add('guide-open');
    if (bodyEl) bodyEl.scrollTop = 0;
    var first = tocEl && tocEl.querySelector('.guide-toc-btn');
    if (first) first.classList.add('active');
    setTimeout(function () {
      if (closeBtn) closeBtn.focus({ preventScroll: true });
      if (bodyEl) bodyEl.focus({ preventScroll: true });
    }, 40);
  }

  function close() {
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    document.body.classList.remove('guide-open');
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  function isOpen() {
    return !!(modal && !modal.classList.contains('hidden'));
  }

  function download() {
    if (!window.api || typeof window.api.saveGuidePdf !== 'function') {
      if (bodyEl) bodyEl.insertAdjacentHTML('afterbegin',
        '<p class="guide-download-note">PDF kaydetme bu ortamda kullanılamıyor.</p>');
      return;
    }
    var original = downloadLabel || (downloadBtn ? downloadBtn.innerHTML : '');
    if (downloadBtn) { downloadBtn.disabled = true; downloadBtn.textContent = 'Hazırlanıyor…'; }
    Promise.resolve(window.api.saveGuidePdf()).then(function (res) {
      if (downloadBtn) {
        if (res && res.ok) {
          downloadBtn.textContent = 'Kaydedildi ✓';
          setTimeout(function () {
            downloadBtn.innerHTML = original;
            downloadBtn.disabled = false;
          }, 2200);
        } else if (res && res.canceled) {
          downloadBtn.innerHTML = original;
          downloadBtn.disabled = false;
        } else {
          downloadBtn.textContent = 'Kaydedilemedi';
          setTimeout(function () {
            downloadBtn.innerHTML = original;
            downloadBtn.disabled = false;
          }, 2400);
        }
      }
    }).catch(function () {
      if (downloadBtn) { downloadBtn.disabled = false; downloadBtn.innerHTML = original; }
    });
  }

  function init() {
    modal = $('guide-modal');
    if (!modal || !window.YAZNOT_GUIDE) return;
    sheet = modal.querySelector('.guide-sheet');
    bodyEl = $('guide-body');
    tocEl = $('guide-toc');
    welcomeEl = $('guide-welcome');
    downloadBtn = $('guide-download');
    doneBtn = $('guide-done');
    closeBtn = $('guide-close');
    if (downloadBtn) downloadLabel = downloadBtn.innerHTML;

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (doneBtn) doneBtn.addEventListener('click', close);
    if (downloadBtn) downloadBtn.addEventListener('click', download);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });
    if (bodyEl) bodyEl.addEventListener('scroll', onScroll, { passive: true });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
        return;
      }
      // Kılavuz açıkken odak tuzağı: Tab, kılavuz içinde dolaşır.
      if (e.key === 'Tab' && sheet) {
        var focusables = sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }, true);
  }

  window.YazNotGuide = {
    open: open,
    close: close,
    isOpen: isOpen,
    data: data,
    render: render
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
