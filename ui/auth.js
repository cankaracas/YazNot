(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  var overlay = null;
  var stepEmail = null;
  var stepCode = null;
  var emailInput = null;
  var codeInput = null;
  var sendBtn = null;
  var verifyBtn = null;
  var backBtn = null;
  var cancelBtn = null;
  var subtitleEl = null;
  var statusEl = null;
  var currentEmail = '';
  var addMode = false;
  var bound = false;

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.className = 'auth-status' + (kind ? ' auth-status-' + kind : '');
  }

  var SEND_LABEL = 'Giriş kodu gönder';
  var cooldownTimer = null;
  var cooldownLeft = 0;

  // Kopyala-yapıştırla gelen görünmez karakterleri (zero-width space, BOM) ve
  // boşlukları temizle; aksi halde kod yanlış adrese gidebilir.
  function normalizeEmail(value) {
    return String(value || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '').toLowerCase();
  }

  // Supabase'in İngilizce hata metinlerini anlaşılır Türkçeye çevirir. Yeniden
  // gönderme sınırında kalan süreyi de döndürür; böylece kullanıcı ham 429
  // metniyle baş başa kalmaz.
  function describeAuthError(raw) {
    var text = String(raw || '').trim();
    var lower = text.toLowerCase();
    var match = /after\s+(\d+)\s+second/i.exec(text);
    if (lower.indexOf('over_email_send_rate_limit') !== -1 || lower.indexOf('only request this after') !== -1 || match) {
      return {
        text: 'Çok sık kod istedin. Güvenlik için ' + (match ? match[1] : '60') + ' saniye sonra tekrar dene.',
        cooldown: match ? parseInt(match[1], 10) : 60
      };
    }
    if (lower.indexOf('email_address_not_authorized') !== -1) {
      return { text: 'Bu adrese e-posta gönderim izni yok. Yöneticinin Supabase panelinde özel SMTP yapılandırması gerekiyor.' };
    }
    if (lower.indexOf('email_address_invalid') !== -1 || lower.indexOf('invalid email') !== -1) {
      return { text: 'E-posta adresi geçersiz görünüyor. Adresi kontrol et.' };
    }
    if (lower.indexOf('email_provider_disabled') !== -1) {
      return { text: 'E-posta ile giriş şu anda kapalı. Google ile giriş yapmayı dene.' };
    }
    if (lower.indexOf('token has expired') !== -1 || lower.indexOf('otp_expired') !== -1 || lower.indexOf('invalid token') !== -1 || lower.indexOf('invalid otp') !== -1) {
      return { text: 'Kod geçersiz veya süresi dolmuş. Yeni kod isteyip tekrar dene.' };
    }
    if (lower.indexOf('failed to fetch') !== -1 || lower.indexOf('networkerror') !== -1 || lower.indexOf('network request failed') !== -1) {
      return { text: 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.' };
    }
    return { text: text || 'İşlem tamamlanamadı. Lütfen tekrar dene.' };
  }

  function updateSendButton() {
    if (!sendBtn) return;
    if (cooldownLeft > 0) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Tekrar gönder (' + cooldownLeft + ' sn)';
      return;
    }
    sendBtn.disabled = false;
    sendBtn.textContent = SEND_LABEL;
  }

  // Aynı adrese 60 saniyede bir kod gönderilebilir (Supabase kuralı). Bu süreyi
  // arayüzde de uygulayıp gereksiz 429 isteklerini ve karışıklığı önler.
  function startSendCooldown(seconds) {
    var total = parseInt(seconds, 10);
    if (!total || total < 1) return;
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownLeft = Math.min(total, 300);
    updateSendButton();
    cooldownTimer = setInterval(function () {
      cooldownLeft -= 1;
      if (cooldownLeft <= 0) {
        cooldownLeft = 0;
        clearInterval(cooldownTimer);
        cooldownTimer = null;
      }
      updateSendButton();
    }, 1000);
  }

  function showEmailStep() {
    if (!stepEmail || !stepCode) return;
    stepCode.classList.add('hidden');
    stepEmail.classList.remove('hidden');
    if (codeInput) codeInput.value = '';
    updateSendButton();
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.add('hidden');
    document.body.classList.remove('auth-locked');
    setStatus('');
  }

  function openOverlay(mode) {
    if (!overlay) return;
    addMode = mode === 'add';
    overlay.classList.remove('hidden');
    document.body.classList.add('auth-locked');
    if (cancelBtn) cancelBtn.classList.toggle('hidden', !addMode);
    if (subtitleEl) {
      subtitleEl.textContent = addMode
        ? 'Mevcut oturumun açık kalacak. Eklemek istediğin hesabın e-postasını gir.'
        : 'Notlarına her cihazdan erişmek için giriş yap';
    }
    if (emailInput) emailInput.value = '';
    showEmailStep();
    setStatus(addMode ? 'Yeni hesap ekleniyor; diğer hesapların açık kalır.' : '');
    setTimeout(function () {
      if (emailInput) emailInput.focus();
    }, 120);
  }

  function finishLogin(message) {
    setStatus(message || (addMode ? 'Hesap eklendi, yükleniyor...' : 'Giriş başarılı, yükleniyor...'), 'ok');
    setTimeout(function () { window.location.reload(); }, 450);
  }

  function bind() {
    if (bound) return;
    bound = true;

    var googleBtn = document.getElementById('auth-google');
    if (googleBtn) {
      googleBtn.addEventListener('click', async function () {
        googleBtn.disabled = true;
        setStatus('Google açılıyor...');
        var gr = await window.yaznotAuth.signInWithGoogle();
        if (!gr.ok) {
          googleBtn.disabled = false;
          setStatus('Hata: ' + gr.error, 'error');
          return;
        }
        if (gr.redirecting) {
          setStatus('Google ile giriş yapılıyor...', 'ok');
          return;
        }
        finishLogin();
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', async function () {
        if (sendBtn.disabled) return;
        var email = normalizeEmail(emailInput.value);
        if (!email || email.indexOf('@') === -1) {
          setStatus('Geçerli bir e-posta gir.', 'error');
          return;
        }
        if (emailInput) emailInput.value = email;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Gönderiliyor...';
        setStatus(email + ' adresine gönderiliyor...');
        var r;
        try {
          r = await window.yaznotAuth.sendOtp(email);
        } catch (e) {
          r = { ok: false, error: (e && e.message) || String(e) };
        }
        if (!r || !r.ok) {
          var info = describeAuthError(r && r.error);
          setStatus('Hata: ' + info.text, 'error');
          if (info.cooldown) startSendCooldown(info.cooldown + 2);
          else updateSendButton();
          return;
        }
        currentEmail = email;
        stepEmail.classList.add('hidden');
        stepCode.classList.remove('hidden');
        setStatus(email + ' adresine giriş kodu gönderildi. Gelmezse Gereksiz/Spam ve karantina klasörlerini kontrol et.', 'ok');
        startSendCooldown(60);
        setTimeout(function () { if (codeInput) codeInput.focus(); }, 100);
      });
    }

    if (emailInput) {
      emailInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && sendBtn) sendBtn.click();
      });
    }
    if (codeInput) {
      codeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && verifyBtn) verifyBtn.click();
      });
    }

    if (verifyBtn) {
      verifyBtn.addEventListener('click', async function () {
        var code = (codeInput.value || '').trim();
        if (!code || verifyBtn.disabled) return;
        verifyBtn.disabled = true;
        setStatus('Doğrulanıyor...');
        var r;
        try {
          r = await window.yaznotAuth.verifyOtp(currentEmail, code);
        } catch (e) {
          r = { ok: false, error: (e && e.message) || String(e) };
        }
        if (!r || !r.ok) {
          verifyBtn.disabled = false;
          setStatus('Hata: ' + describeAuthError(r && r.error).text, 'error');
          return;
        }
        finishLogin();
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', function () {
        showEmailStep();
        setStatus('');
        setTimeout(function () { if (emailInput) emailInput.focus(); }, 80);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        if (addMode) closeOverlay();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && addMode && overlay && !overlay.classList.contains('hidden')) {
        closeOverlay();
      }
    });
  }

  // "Hesap Ekle": oturum açıkken giriş ekranını mevcut hesabı kapatmadan açar.
  window.yaznotAuthUI = {
    openAddAccount: function () {
      overlay = overlay || document.getElementById('auth-overlay');
      bind();
      openOverlay('add');
    },
    close: closeOverlay
  };

  ready(async function () {
    overlay = document.getElementById('auth-overlay');
    if (!overlay || !window.yaznotAuth) return;

    stepEmail = document.getElementById('auth-step-email');
    stepCode = document.getElementById('auth-step-code');
    emailInput = document.getElementById('auth-email');
    codeInput = document.getElementById('auth-code');
    sendBtn = document.getElementById('auth-send');
    verifyBtn = document.getElementById('auth-verify');
    backBtn = document.getElementById('auth-back');
    cancelBtn = document.getElementById('auth-cancel');
    subtitleEl = document.getElementById('auth-subtitle');
    statusEl = document.getElementById('auth-status');

    bind();

    var loggedIn = false;
    try { loggedIn = await window.yaznotAuth.isLoggedIn(); } catch (e) {}
    if (loggedIn) { closeOverlay(); return; }
    openOverlay('login');
  });
})();
