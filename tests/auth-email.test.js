/**
 * YazNot — e-posta kodu girişi testi (jsdom)
 *
 * auth.js'in hata mesajlarını Türkçeleştirdiğini, Supabase'in 60 saniyelik
 * yeniden gönderme sınırını arayüzde uyguladığını ve ağ hatalarında düğmeyi
 * kilitli bırakmadığını denetler.
 *
 * Çalıştırma: npm test
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
const authSrc = fs.readFileSync(path.join(ROOT, 'ui', 'auth.js'), 'utf8');

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

function createApp(sendOtp, verifyOtp) {
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  });
  const { window } = dom;
  const calls = { send: [], verify: [] };
  window.yaznotAuth = {
    isLoggedIn: async function () { return false; },
    sendOtp: async function (email) {
      calls.send.push(email);
      return sendOtp(email, calls.send.length);
    },
    verifyOtp: async function (email, code) {
      calls.verify.push([email, code]);
      return verifyOtp ? verifyOtp(email, code) : { ok: true };
    },
    signInWithGoogle: async function () { return { ok: false, error: 'test' }; }
  };
  window.eval(authSrc);
  return { dom, window, document: window.document, calls };
}

function statusText(document) {
  return (document.getElementById('auth-status') || {}).textContent || '';
}

(async function () {
  console.log('YazNot — e-posta kodu girişi testi');

  // 1) Başarılı gönderim: kod adımı açılır, 60 sn geri sayım başlar.
  {
    const app = createApp(function () { return { ok: true }; });
    await wait(150);
    const d = app.document;
    check('giriş katmanı açıldı', !d.getElementById('auth-overlay').classList.contains('hidden'));
    d.getElementById('auth-email').value = '  STUDENT@Example.COM\u200B ';
    d.getElementById('auth-send').click();
    await wait(120);
    const sendBtn = d.getElementById('auth-send');
    check('e-posta normalize edildi (boşluk/görünmez karakter)', app.calls.send[0] === 'student@example.com', app.calls.send[0]);
    check('kod adımı açıldı', !d.getElementById('auth-step-code').classList.contains('hidden'));
    check('başarı mesajı gösterildi', statusText(d).indexOf('giriş kodu gönderildi') !== -1);
    check('başarı mesajı hedef adresi içeriyor', statusText(d).indexOf('student@example.com') !== -1, statusText(d));
    check('60 sn geri sayım başladı', sendBtn.disabled && /Tekrar gönder \(\d+ sn\)/.test(sendBtn.textContent), sendBtn.textContent);

    d.getElementById('auth-back').click();
    await wait(40);
    check('farklı e-posta adımında sayaç korunuyor', sendBtn.disabled);
    sendBtn.click();
    await wait(40);
    check('sayaç sırasında ikinci istek gönderilmiyor', app.calls.send.length === 1);
    app.dom.window.close();
  }

  // 2) Supabase 429 hatası: ham İngilizce metin yerine Türkçe ve sayaç.
  {
    const app = createApp(function () {
      return { ok: false, error: 'For security purposes, you can only request this after 47 seconds.' };
    });
    await wait(150);
    const d = app.document;
    d.getElementById('auth-email').value = 'student@example.com';
    d.getElementById('auth-send').click();
    await wait(120);
    const text = statusText(d);
    const sendBtn = d.getElementById('auth-send');
    check('429 mesajı Türkçeleştirildi', text.indexOf('Çok sık kod istedin') !== -1 && text.indexOf('47 saniye') !== -1, text);
    check('ham İngilizce metin gösterilmiyor', text.indexOf('For security') === -1, text);
    check('429 sonrası geri sayım başladı', sendBtn.disabled && /49|48/.test(sendBtn.textContent), sendBtn.textContent);
    app.dom.window.close();
  }

  // 3) Ağ hatası: düğme kilitli kalmaz, anlaşılır mesaj gösterilir.
  {
    const app = createApp(function () { throw new Error('Failed to fetch'); });
    await wait(150);
    const d = app.document;
    d.getElementById('auth-email').value = 'student@example.com';
    d.getElementById('auth-send').click();
    await wait(120);
    check('ağ hatası Türkçeleştirildi', statusText(d).indexOf('Sunucuya ulaşılamadı') !== -1, statusText(d));
    check('ağ hatasında gönder düğmesi yeniden etkin', !d.getElementById('auth-send').disabled);
    app.dom.window.close();
  }

  // 4) Geçersiz kod: doğrula düğmesi yeniden etkinleşir.
  {
    const app = createApp(
      function () { return { ok: true }; },
      function () { return { ok: false, error: 'Token has expired or is invalid' }; }
    );
    await wait(150);
    const d = app.document;
    d.getElementById('auth-email').value = 'student@example.com';
    d.getElementById('auth-send').click();
    await wait(120);
    d.getElementById('auth-code').value = '12345678';
    d.getElementById('auth-verify').click();
    await wait(120);
    check('geçersiz kod mesajı Türkçeleştirildi', statusText(d).indexOf('Kod geçersiz veya süresi dolmuş') !== -1, statusText(d));
    check('geçersiz koddan sonra doğrula düğmesi etkin', !d.getElementById('auth-verify').disabled);
    app.dom.window.close();
  }

  // 5) Boş e-posta: istek gönderilmez.
  {
    const app = createApp(function () { return { ok: true }; });
    await wait(150);
    const d = app.document;
    d.getElementById('auth-send').click();
    await wait(60);
    check('boş e-posta için uyarı gösterildi', statusText(d).indexOf('Geçerli bir e-posta') !== -1, statusText(d));
    check('boş e-posta için istek gönderilmedi', app.calls.send.length === 0);
    app.dom.window.close();
  }

  console.log('');
  if (failures > 0) {
    console.error(failures + ' kontrol başarısız, ' + checks + ' kontrol çalıştırıldı.');
    process.exit(1);
  }
  console.log(checks + ' kontrol geçti.');
})();
