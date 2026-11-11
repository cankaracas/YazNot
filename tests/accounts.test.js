/**
 * YazNot — çoklu hesap / oturum kasası testi (jsdom)
 *
 * Supabase SDK'sını sahteleyerek hesap kutusunun temel davranışlarını denetler:
 * eski tek oturumun taşınması, birden çok hesabın saklanması, hesap değiştirme,
 * hesap kaldırma ve çıkışta diğer hesapların korunması.
 *
 * Çalıştırma: npm test
 */
const fs = require('fs');
const path = require('path');

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (e) {
  console.error('jsdom bulunamadı. Kurmak için: npm install --save-dev jsdom');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const CLOUD_SRC = fs.readFileSync(path.join(ROOT, 'ui', 'cloud-api.js'), 'utf8');

let failures = 0;
let checks = 0;
function check(name, cond, extra) {
  checks++;
  if (cond) console.log('  ✔ ' + name);
  else {
    failures++;
    console.log('  ✘ ' + name + (extra ? '  → ' + extra : ''));
  }
}
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms || 20); }); }

const UID_A = '11111111-1111-1111-1111-111111111111';
const UID_B = '22222222-2222-2222-2222-222222222222';
const UID_C = '33333333-3333-3333-3333-333333333333';

function session(uid, email) {
  return JSON.stringify({
    access_token: 'access-' + uid,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'refresh-' + uid,
    user: {
      id: uid,
      email: email,
      user_metadata: { full_name: 'Kullanıcı ' + email.split('@')[0] },
      app_metadata: { provider: 'email' }
    }
  });
}

function parse(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

// Test için minik, bellek içi IndexedDB taklidi (yalnızca kullanılan API'ler).
function createFakeIndexedDB() {
  const dbs = {};
  function makeRequest(exec) {
    const req = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
    setTimeout(function () {
      try {
        req.result = exec();
        if (req.onsuccess) req.onsuccess({ target: req });
      } catch (e) {
        req.error = e;
        if (req.onerror) req.onerror({ target: req });
      }
    }, 0);
    return req;
  }
  function makeStore(map) {
    return {
      get: function (key) { return makeRequest(function () { return map.has(key) ? map.get(key) : undefined; }); },
      put: function (value, key) { return makeRequest(function () { map.set(key, value); return key; }); },
      delete: function (key) { return makeRequest(function () { map.delete(key); return undefined; }); },
      getAllKeys: function () { return makeRequest(function () { return Array.from(map.keys()); }); },
      openCursor: function () {
        const keys = Array.from(map.keys());
        let i = 0;
        const req = { result: null, error: null, onsuccess: null, onerror: null };
        function next() {
          setTimeout(function () {
            if (i >= keys.length) {
              req.result = null;
              if (req.onsuccess) req.onsuccess({ target: req });
              return;
            }
            const key = keys[i++];
            req.result = {
              key: key,
              value: map.get(key),
              continue: next
            };
            if (req.onsuccess) req.onsuccess({ target: req });
          }, 0);
        }
        next();
        return req;
      }
    };
  }
  function makeDB() {
    const stores = {};
    return {
      _stores: stores,
      objectStoreNames: { contains: function (name) { return !!stores[name]; } },
      createObjectStore: function (name) { stores[name] = new Map(); return {}; },
      transaction: function (name) {
        const map = stores[name];
        return { objectStore: function () { return makeStore(map); } };
      }
    };
  }
  return {
    indexedDB: {
      open: function (name) {
        const existing = dbs[name];
        const db = existing || makeDB();
        const req = { result: db, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
        setTimeout(function () {
          if (!existing) {
            dbs[name] = db;
            if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
          }
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 0);
        return req;
      }
    },
    db: function (name) { return dbs[name]; }
  };
}

function boot(seed, opts) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', function (e) {
    // jsdom location.reload() uygulamaz; bu hatayı yut.
    if (e && /Not implemented/.test(String(e.message))) return;
    console.error('[jsdom hata] ' + (e && e.message));
  });
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: virtualConsole
  });
  const w = dom.window;
  const fakeIDB = createFakeIndexedDB();
  w.indexedDB = fakeIDB.indexedDB;

  w.YAZNOT_CONFIG = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key'
  };

  let authCb = null;
  function activeSession() { return parse(w.localStorage.getItem('yaznot_auth_active_token')); }

  w.supabase = {
    createClient: function () {
      return {
        auth: {
          getSession: async function () { return { data: { session: activeSession() } }; },
          onAuthStateChange: function (cb) {
            authCb = cb;
            return { data: { subscription: { unsubscribe: function () {} } } };
          },
          signOut: async function () { return { error: null }; },
          signInWithOtp: async function () { return { error: null }; },
          verifyOtp: async function () { return { data: { session: activeSession() }, error: null }; },
          signInWithOAuth: async function () { return { data: { url: 'https://example.test' }, error: null }; },
          setSession: async function () { return { data: { session: activeSession() }, error: null }; }
        },
        from: function () {
          const chain = {
            select: function () { return chain; },
            eq: function () { return chain; },
            order: function () { return chain; },
            limit: function () { return chain; },
            maybeSingle: async function () { return { data: null, error: null }; },
            upsert: async function () { return { error: null }; },
            insert: async function () { return { error: null }; },
            update: function () { return chain; }
          };
          return chain;
        }
      };
    }
  };

  if (seed) seed(w.localStorage);
  w.eval(CLOUD_SRC);
  return {
    dom: dom,
    w: w,
    idb: fakeIDB,
    trigger: function (event, sess) { if (authCb) authCb(event, sess); },
    close: function () { dom.window.close(); }
  };
}

function seedTwoAccounts(storage) {
  const a = session(UID_A, 'a@example.com');
  const b = session(UID_B, 'b@example.com');
  storage.setItem('yaznot_auth_active_token', a);
  storage.setItem('yaznot_account_token_' + UID_A, a);
  storage.setItem('yaznot_account_token_' + UID_B, b);
  storage.setItem('yaznot_accounts_v1', JSON.stringify({
    version: 1,
    activeUid: UID_A,
    accounts: [
      { uid: UID_A, email: 'a@example.com', lastUsedAt: Date.now() - 1000 },
      { uid: UID_B, email: 'b@example.com', lastUsedAt: Date.now() - 2000 }
    ]
  }));
  storage.setItem('yaznot_session', JSON.stringify({ uid: UID_A, email: 'a@example.com', savedAt: Date.now() }));
}

(async function run() {
  console.log('\nEski tek oturumun taşınması');
  {
    const oldKey = 'sb-test-auth-token';
    const raw = session(UID_A, 'eski@example.com');
    const ctx = boot(function (storage) { storage.setItem(oldKey, raw); });
    await wait(30);
    const accounts = await ctx.w.yaznotAuth.listAccounts();
    check('eski oturum hesap kasasına alınır', accounts.length === 1 && accounts[0].uid === UID_A);
    check('eski anahtar temizlenir', ctx.w.localStorage.getItem(oldKey) === null);
    check('etkin token yeni anahtarda', !!ctx.w.localStorage.getItem('yaznot_auth_active_token'));
    ctx.close();
  }

  console.log('\nBirden çok hesap');
  {
    const ctx = boot(seedTwoAccounts);
    await wait(30);
    const accounts = await ctx.w.yaznotAuth.listAccounts();
    check('iki hesap listelenir', accounts.length === 2, String(accounts.length));
    check('etkin hesap önce gelir', accounts[0].uid === UID_A && accounts[0].active === true);
    check('diğer hesap etkin değil', accounts[1].uid === UID_B && accounts[1].active === false);
    check('etkin e-posta doğru', (await ctx.w.yaznotAuth.getEmail()) === 'a@example.com');
    check('giriş durumu açık', (await ctx.w.yaznotAuth.isLoggedIn()) === true);

    console.log('\nYeni hesap ekleme');
    const c = session(UID_C, 'c@example.com');
    ctx.trigger('SIGNED_IN', parse(c));
    await wait(20);
    const afterAdd = await ctx.w.yaznotAuth.listAccounts();
    check('yeni hesap kasaya eklenir', afterAdd.length === 3 && afterAdd.some(function (x) { return x.uid === UID_C; }));
    check('yeni hesap etkin olur', afterAdd[0].uid === UID_C && afterAdd[0].active === true);
    check('yeni hesabın tokenı saklanır', !!ctx.w.localStorage.getItem('yaznot_account_token_' + UID_C));

    console.log('\nHesap değiştirme');
    const result = await ctx.w.yaznotAuth.switchAccount(UID_B);
    await wait(20);
    const active = parse(ctx.w.localStorage.getItem('yaznot_auth_active_token'));
    const reg = parse(ctx.w.localStorage.getItem('yaznot_accounts_v1'));
    check('geçiş başarılı', result && result.ok === true);
    check('etkin token hedef hesabın', active && active.user && active.user.id === UID_B);
    check('kasa etkin hesabı günceller', reg && reg.activeUid === UID_B);
    check('hedef hesabın tokenı korunur', !!ctx.w.localStorage.getItem('yaznot_account_token_' + UID_B));

    console.log('\nHesap kaldırma');
    const removed = await ctx.w.yaznotAuth.removeAccount(UID_A);
    await wait(20);
    const afterRemove = await ctx.w.yaznotAuth.listAccounts();
    check('etkin olmayan hesap kaldırılır', removed && removed.ok === true);
    check('kaldırılan hesabın tokenı silinir', ctx.w.localStorage.getItem('yaznot_account_token_' + UID_A) === null);
    check('diğer hesaplar kalır', afterRemove.length === 2);
    ctx.close();
  }

  console.log('\nHesap başına yerel önbellek');
  {
    const ctx = boot(seedTwoAccounts);
    await wait(30);
    await ctx.w.api.save('sections', { sections: [{ id: 'a-notu' }] });
    let db = ctx.idb.db('yaznot');
    let keys = Array.from(db._stores.kv.keys());
    check('A hesabının verisi kendi alanına yazılır', keys.indexOf('u/' + UID_A + '/sections') !== -1, keys.join(', '));

    await ctx.w.yaznotAuth.switchAccount(UID_B);
    await wait(20);
    await ctx.w.api.save('sections', { sections: [{ id: 'b-notu' }] });
    db = ctx.idb.db('yaznot');
    keys = Array.from(db._stores.kv.keys());
    check('B hesabının verisi kendi alanına yazılır', keys.indexOf('u/' + UID_B + '/sections') !== -1, keys.join(', '));

    let loaded = await ctx.w.api.load('sections');
    check('B hesabında B notu okunur', loaded && loaded.sections && loaded.sections[0].id === 'b-notu');

    await ctx.w.yaznotAuth.switchAccount(UID_A);
    await wait(20);
    loaded = await ctx.w.api.load('sections');
    check('A hesabına dönünce A notu okunur', loaded && loaded.sections && loaded.sections[0].id === 'a-notu');
    ctx.close();
  }

  console.log('\nÇıkış');
  {
    const ctx = boot(function (storage) {
      const a = session(UID_A, 'tek@example.com');
      storage.setItem('yaznot_auth_active_token', a);
      storage.setItem('yaznot_account_token_' + UID_A, a);
      storage.setItem('yaznot_accounts_v1', JSON.stringify({
        version: 1, activeUid: UID_A,
        accounts: [{ uid: UID_A, email: 'tek@example.com', lastUsedAt: Date.now() }]
      }));
    });
    await wait(30);
    await ctx.w.yaznotAuth.signOut();
    await wait(20);
    const accounts = await ctx.w.yaznotAuth.listAccounts();
    check('çıkışta hesap kasadan silinir', accounts.length === 0);
    check('etkin token temizlenir', ctx.w.localStorage.getItem('yaznot_auth_active_token') === null);
    check('oturum kaydı temizlenir', ctx.w.localStorage.getItem('yaznot_session') === null);
    ctx.close();
  }

  console.log('\nSonuç: ' + (checks - failures) + '/' + checks + ' kontrol geçti');
  process.exit(failures === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('\nTest çöktü:', err);
  process.exit(1);
});
