(function () {
  'use strict';

  var cfg = window.YAZNOT_CONFIG;
  if (!cfg) { console.error('[cloud-api] config bulunamadi'); return; }
  if (!window.supabase) { console.error('[cloud-api] supabase SDK yuklenmedi'); return; }

  // Masaüstü köprüsü varsa yerel yetenekler açılır; yoksa web karşılıkları kullanılır.
  var nativeBridge = window.yaznotNative || null;
  var isDesktop = !!(nativeBridge && nativeBridge.googleSignIn);

  // ===== Çoklu hesap: oturum kasası =====
  // Supabase normalde tek bir oturum anahtarı tutar; yeni giriş eskisini ezer.
  // Her hesabın oturumunu ayrı saklayıp etkin hesabı tek anahtarda tutuyoruz.
  // Hesap değişince yalnızca etkin anahtar değişir ve sayfa yenilenir; böylece
  // Supabase oturumu kaldığı yerden sürer ve tekrar e-posta kodu istenmez.
  var AUTH_STORAGE_KEY = 'yaznot-auth';
  var ACTIVE_TOKEN_KEY = 'yaznot_auth_active_token';
  var AUTH_AUX_PREFIX = 'yaznot_auth_aux:';
  var ACCOUNTS_KEY = 'yaznot_accounts_v1';
  var ACCOUNT_TOKEN_PREFIX = 'yaznot_account_token_';
  var SESSION_KEY = 'yaznot_session';
  var LAST_UID_KEY = 'yaznot_last_uid';
  var LEGACY_OWNER_KEY = 'yaznot_legacy_owner';

  // Yerel önbellek anahtarları (hesap başına ayrı tutulur).
  var META_PREFIX = 'yaznot_meta_';
  var DIRTY_KEY = 'yaznot_dirty_keys';
  var CONFLICT_LOG_KEY = 'yaznot_conflicts';

  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function lsRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  function lsKeys() {
    try { return Object.keys(localStorage); } catch (e) { return []; }
  }
  function withTimeout(promise, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        resolve(null);
      }, ms);
      Promise.resolve(promise).then(function (value) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      }, function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(null);
      });
    });
  }

  function parseSession(raw) {
    if (!raw) return null;
    try {
      var s = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (s && s.access_token && s.user && s.user.id) return s;
    } catch (e) {}
    return null;
  }
  function sessionMeta(raw) {
    var s = parseSession(raw);
    if (!s) return null;
    var u = s.user || {};
    var meta = u.user_metadata || {};
    return {
      uid: u.id,
      email: u.email || '',
      name: meta.full_name || meta.name || (u.email ? String(u.email).split('@')[0] : ''),
      avatarUrl: meta.avatar_url || meta.picture || null,
      provider: (u.app_metadata && u.app_metadata.provider) || null
    };
  }

  function loadAccounts() {
    try {
      var reg = JSON.parse(lsGet(ACCOUNTS_KEY) || 'null');
      if (reg && Array.isArray(reg.accounts)) {
        reg.accounts = reg.accounts.filter(function (a) { return a && a.uid; });
        return reg;
      }
    } catch (e) {}
    return { version: 1, activeUid: null, accounts: [] };
  }
  function saveAccounts(reg) {
    lsSet(ACCOUNTS_KEY, JSON.stringify(reg));
  }
  function findAccount(reg, uid) {
    if (!reg || !uid) return null;
    for (var i = 0; i < reg.accounts.length; i++) {
      if (reg.accounts[i].uid === uid) return reg.accounts[i];
    }
    return null;
  }
  function upsertAccount(reg, rec) {
    var acc = findAccount(reg, rec.uid);
    if (!acc) {
      acc = { uid: rec.uid, addedAt: Date.now(), lastUsedAt: 0 };
      reg.accounts.push(acc);
    }
    if (rec.email) acc.email = rec.email;
    if (rec.name) acc.name = rec.name;
    if (rec.avatarUrl) acc.avatarUrl = rec.avatarUrl;
    if (rec.provider) acc.provider = rec.provider;
    return acc;
  }

  function saveSessionRecord(session) {
    var rec = sessionMeta(session);
    if (!rec) return null;
    lsSet(SESSION_KEY, JSON.stringify({ email: rec.email || null, uid: rec.uid, savedAt: Date.now() }));
    lsSet(LAST_UID_KEY, rec.uid);
    var reg = loadAccounts();
    var acc = upsertAccount(reg, rec);
    acc.lastUsedAt = Date.now();
    reg.activeUid = rec.uid;
    saveAccounts(reg);
    activeUid = rec.uid;
    return rec;
  }
  function getSessionRecord() {
    try {
      var raw = lsGet(SESSION_KEY);
      if (!raw) return null;
      var rec = JSON.parse(raw);
      return (rec && rec.uid) ? rec : null;
    } catch (e) { return null; }
  }
  function clearSessionRecord() {
    lsRemove(SESSION_KEY);
  }

  function archiveSession(session) {
    var raw = typeof session === 'string' ? session : JSON.stringify(session);
    var rec = sessionMeta(raw);
    if (!rec) return null;
    lsSet(ACCOUNT_TOKEN_PREFIX + rec.uid, raw);
    return saveSessionRecord(raw);
  }

  // Supabase'in auth storage'ı buradan geçer: etkin anahtarı yazar, her yazımda
  // oturumu hesabın kendi kasasına da kopyalar (token yenilenince arşiv tazelenir).
  var authStorage = {
    getItem: function (key) {
      if (key === AUTH_STORAGE_KEY) return lsGet(ACTIVE_TOKEN_KEY);
      return lsGet(AUTH_AUX_PREFIX + key);
    },
    setItem: function (key, value) {
      if (key === AUTH_STORAGE_KEY) {
        lsSet(ACTIVE_TOKEN_KEY, value);
        try { archiveSession(value); } catch (e) {}
      } else {
        lsSet(AUTH_AUX_PREFIX + key, value);
      }
    },
    removeItem: function (key) {
      if (key === AUTH_STORAGE_KEY) lsRemove(ACTIVE_TOKEN_KEY);
      else lsRemove(AUTH_AUX_PREFIX + key);
    }
  };

  // Başka bir sekme/pencerede hesap değişirse bu sekme eski hesabın verisiyle
  // çalışmaya devam etmesin: yeni etkin hesaba geçmek için sayfayı yenile.
  window.addEventListener('storage', function (e) {
    if (!e || e.key !== ACTIVE_TOKEN_KEY) return;
    if (!e.newValue) { window.location.reload(); return; }
    var changed = parseSession(e.newValue);
    if (changed && changed.user && changed.user.id !== activeUid) window.location.reload();
  });

  // Eski tek-oturum anahtarını (sb-...-auth-token) ilk açılışta yeni kasaya taşı.
  // Böylece güncellemeden sonra kullanıcı yeniden giriş yapmak zorunda kalmaz.
  function migrateLegacyAuthToken() {
    if (lsGet(ACTIVE_TOKEN_KEY)) return;
    var preferred = null;
    try { preferred = 'sb-' + new URL(cfg.supabaseUrl).hostname.split('.')[0] + '-auth-token'; } catch (e) {}
    var keys = lsKeys();
    if (preferred && keys.indexOf(preferred) === -1) keys.unshift(preferred);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!key || key === ACTIVE_TOKEN_KEY || key.indexOf(AUTH_AUX_PREFIX) === 0) continue;
      if (key.indexOf('auth-token') === -1 && key !== 'supabase.auth.token') continue;
      var raw = lsGet(key);
      if (!parseSession(raw)) continue;
      lsSet(ACTIVE_TOKEN_KEY, raw);
      try { archiveSession(raw); } catch (e) {}
      lsRemove(key);
      console.log('[auth] eski oturum yeni hesap kasasına taşındı');
      return;
    }
  }

  function activateAccount(reg, acc) {
    var raw = lsGet(ACCOUNT_TOKEN_PREFIX + acc.uid);
    var session = parseSession(raw);
    if (!session) return false;
    lsSet(ACTIVE_TOKEN_KEY, raw);
    reg.activeUid = acc.uid;
    acc.lastUsedAt = Date.now();
    saveAccounts(reg);
    saveSessionRecord(session);
    lsSet(LAST_UID_KEY, acc.uid);
    return true;
  }

  function pickNextAccount(reg) {
    var best = null;
    (reg.accounts || []).forEach(function (acc) {
      if (!parseSession(lsGet(ACCOUNT_TOKEN_PREFIX + acc.uid))) return;
      if (!best || (acc.lastUsedAt || 0) > (best.lastUsedAt || 0)) best = acc;
    });
    return best;
  }

  function resolveInitialActiveUid() {
    migrateLegacyAuthToken();
    var raw = lsGet(ACTIVE_TOKEN_KEY);
    var session = parseSession(raw);
    var reg = loadAccounts();
    if (session) {
      // Etkin oturumu her açılışta kasaya tazele (token yenilenmiş olabilir).
      archiveSession(session);
      return session.user.id;
    }
    // Etkin anahtar yok ama kasada hesap varsa en son kullanılanı geri yükle.
    var next = pickNextAccount(reg);
    if (next && activateAccount(reg, next)) return next.uid;
    if (reg.activeUid) { reg.activeUid = null; saveAccounts(reg); }
    return null;
  }

  var activeUid = resolveInitialActiveUid();

  var supa = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      flowType: isDesktop ? 'implicit' : 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isDesktop,
      storage: authStorage
    }
  });
  window.supa = supa;

  function currentSession() {
    return withTimeout(supa.auth.getSession().then(function (r) {
      return (r && r.data) ? r.data.session : null;
    }).catch(function () { return null; }), 2500);
  }
  async function currentUid() {
    var s = await currentSession();
    return (s && s.user && s.user.id) ? s.user.id : activeUid;
  }
  async function currentEmail() {
    var s = await currentSession();
    if (s && s.user && s.user.email) return s.user.email;
    var acc = findAccount(loadAccounts(), activeUid);
    return acc ? (acc.email || null) : null;
  }

  var suppressAuthEvents = false;
  var switchingInProgress = false;
  function handleUnexpectedSignOut() {
    if (suppressAuthEvents || switchingInProgress) return;
    if (!navigator.onLine) return;
    var reg = loadAccounts();
    var uid = reg.activeUid;
    if (uid) {
      lsRemove(ACCOUNT_TOKEN_PREFIX + uid);
      reg.accounts = reg.accounts.filter(function (a) { return a.uid !== uid; });
    }
    reg.activeUid = null;
    clearSessionRecord();
    lsRemove(ACTIVE_TOKEN_KEY);
    var next = pickNextAccount(reg);
    if (next) {
      activateAccount(reg, next);
    } else {
      saveAccounts(reg);
    }
    window.location.reload();
  }

  // Supabase oturum durumu değişince kasa kaydımızı güncel tut.
  try {
    supa.auth.onAuthStateChange(function (event, session) {
      if (suppressAuthEvents) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        if (session && session.user) {
          try { archiveSession(session); } catch (e) {}
        }
      } else if (event === 'SIGNED_OUT') {
        handleUnexpectedSignOut();
      }
    });
  } catch (e) {}

  var DB_NAME = 'yaznot';
  var DB_VERSION = 1;
  var LOCAL_STORE = 'kv';

  function openLocalDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(LOCAL_STORE)) db.createObjectStore(LOCAL_STORE);
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  function rawLocalGet(storageKey) {
    return openLocalDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(LOCAL_STORE, 'readonly');
        var req = tx.objectStore(LOCAL_STORE).get(storageKey);
        req.onsuccess = function () { resolve(req.result == null ? null : req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return null; });
  }

  function rawLocalSet(storageKey, val) {
    return openLocalDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(LOCAL_STORE, 'readwrite');
        var req = tx.objectStore(LOCAL_STORE).put(val, storageKey);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function rawLocalDelete(storageKey) {
    return openLocalDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(LOCAL_STORE, 'readwrite');
        var req = tx.objectStore(LOCAL_STORE).delete(storageKey);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () {});
  }

  function rawLocalKeys() {
    return openLocalDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(LOCAL_STORE, 'readonly');
        var store = tx.objectStore(LOCAL_STORE);
        if (store.getAllKeys) {
          var req = store.getAllKeys();
          req.onsuccess = function () { resolve(req.result || []); };
          req.onerror = function () { reject(req.error); };
        } else {
          var keys = [];
          var cursorReq = store.openCursor();
          cursorReq.onsuccess = function (e) {
            var cursor = e.target.result;
            if (cursor) { keys.push(cursor.key); cursor.continue(); }
            else resolve(keys);
          };
          cursorReq.onerror = function () { reject(cursorReq.error); };
        }
      });
    }).catch(function () { return []; });
  }

  // Yerel önbellek hesap başına ayrı anahtar alanında tutulur. Böylece hesaplar
  // arasında geçiş yaparken notlar karışmaz ve çevrimdışı önbellek korunur.
  function namespacePrefix() { return 'u/' + (activeUid || 'anon') + '/'; }
  function nsKey(key) { return namespacePrefix() + key; }

  // Eski tek hesap döneminden kalan (öneksiz) yerel veriyi, sahibi olan hesabın
  // alanına bir kez taşır. Eski veri başka hesaba aitse taşınmaz.
  async function migrateLegacyLocalData() {
    if (!activeUid) return;
    var marker = 'yaznot_legacy_migrated:' + activeUid;
    if (lsGet(marker)) return;
    // last_uid'yi asenkron IndexedDB işleminden önce yakala; app.js açılışta
    // bunu güncelleyebilir.
    var lastUidAtStart = lsGet(LAST_UID_KEY);

    var allKeys = [];
    try { allKeys = await rawLocalKeys(); } catch (e) {}
    var legacy = (allKeys || []).filter(function (k) {
      return typeof k === 'string' && k.indexOf('u/') !== 0;
    });
    if (legacy.length === 0) { lsSet(marker, '1'); return; }

    var owner = lsGet(LEGACY_OWNER_KEY);
    if (!owner) {
      owner = lastUidAtStart || activeUid;
      lsSet(LEGACY_OWNER_KEY, owner);
    }
    if (owner !== activeUid) { lsSet(marker, '1'); return; }

    for (var i = 0; i < legacy.length; i++) {
      var key = legacy[i];
      var target = 'u/' + activeUid + '/' + key;
      try {
        var existing = await rawLocalGet(target);
        if (existing == null) {
          var value = await rawLocalGet(key);
          if (value != null) await rawLocalSet(target, value);
        }
      } catch (e) {}
    }

    // Meta, bekleyen senkron ve çakışma kayıtlarını da hesaba taşı.
    var keys = lsKeys();
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      if (k.indexOf(META_PREFIX) === 0 && k.indexOf(META_PREFIX + 'u/') !== 0) {
        var targetMeta = META_PREFIX + 'u/' + activeUid + '/' + k.slice(META_PREFIX.length);
        if (!lsGet(targetMeta)) {
          var metaValue = lsGet(k);
          if (metaValue) lsSet(targetMeta, metaValue);
        }
      }
    }
    var oldDirty = lsGet(DIRTY_KEY);
    if (oldDirty && !lsGet(DIRTY_KEY + ':' + activeUid)) lsSet(DIRTY_KEY + ':' + activeUid, oldDirty);
    var oldConflicts = lsGet(CONFLICT_LOG_KEY);
    if (oldConflicts && !lsGet(CONFLICT_LOG_KEY + ':' + activeUid)) {
      lsSet(CONFLICT_LOG_KEY + ':' + activeUid, oldConflicts);
    }

    lsSet(marker, '1');
    console.log('[migrate] eski yerel önbellek hesap kapsamına taşındı');
  }

  var legacyReady = Promise.resolve().then(migrateLegacyLocalData).catch(function () {});

  function localGet(key) {
    return legacyReady.then(function () { return rawLocalGet(nsKey(key)); });
  }

  function localSet(key, val) {
    return legacyReady.then(function () { return rawLocalSet(nsKey(key), val); });
  }

  async function cloudGetWithMeta(key) {
    var uid = await currentUid();
    if (!uid) throw new Error('no-user');
    var r = await supa.from('kv_store').select('value, updated_at').eq('user_id', uid).eq('key', key).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) return null;
    return { value: r.data.value, updated_at: r.data.updated_at };
  }

  async function cloudSet(key, value) {
    var uid = await currentUid();
    if (!uid) throw new Error('no-user');
    var nowIso = new Date().toISOString();
    var r = await supa.from('kv_store').upsert({
      user_id: uid, key: key, value: value, updated_at: nowIso
    }, { onConflict: 'user_id,key' });
    if (r.error) throw r.error;
    return { ok: true, updated_at: nowIso };
  }

  function metaStorageKey(key) { return META_PREFIX + nsKey(key); }
  function getMeta(key) {
    try {
      var raw = lsGet(metaStorageKey(key));
      if (!raw) return { localUpdatedAt: 0, cloudUpdatedAt: 0 };
      var m = JSON.parse(raw);
      if (typeof m.localUpdatedAt !== 'number') m.localUpdatedAt = 0;
      if (typeof m.cloudUpdatedAt !== 'number') m.cloudUpdatedAt = 0;
      return m;
    } catch (e) {
      return { localUpdatedAt: 0, cloudUpdatedAt: 0 };
    }
  }
  function setMeta(key, meta) {
    lsSet(metaStorageKey(key), JSON.stringify(meta));
  }

  function dirtyStorageKey() { return DIRTY_KEY + ':' + (activeUid || 'anon'); }
  function getDirtyKeys() {
    try { return JSON.parse(lsGet(dirtyStorageKey()) || '[]'); }
    catch (e) { return []; }
  }
  function setDirtyKeys(keys) {
    lsSet(dirtyStorageKey(), JSON.stringify(keys));
  }
  function markDirty(key) {
    var keys = getDirtyKeys();
    if (keys.indexOf(key) === -1) { keys.push(key); setDirtyKeys(keys); }
  }
  function markClean(key) {
    var keys = getDirtyKeys();
    var i = keys.indexOf(key);
    if (i !== -1) { keys.splice(i, 1); setDirtyKeys(keys); }
  }
  function isDirty(key) { return getDirtyKeys().indexOf(key) !== -1; }

  function conflictStorageKey() { return CONFLICT_LOG_KEY + ':' + (activeUid || 'anon'); }
  function getConflictLog() {
    try { return JSON.parse(lsGet(conflictStorageKey()) || '[]'); }
    catch (e) { return []; }
  }
  function logConflict(key, direction, detail) {
    try {
      var log = getConflictLog();
      log.push({ key: key, direction: direction, detail: detail || '', at: Date.now() });
      if (log.length > 50) log = log.slice(-50);
      lsSet(conflictStorageKey(), JSON.stringify(log));
    } catch (e) {}
  }

  var syncPromise = null;
  function syncDirtyKeys() {
    // Aynı anda tek senkron çalışsın; bekleyenler aynı promise'i beklesin.
    if (syncPromise) return syncPromise;
    var run = (async function () {
      var keys = getDirtyKeys();
      if (keys.length === 0) return;
      console.log('[sync] ' + keys.length + ' bekleyen kayit senkronize ediliyor...');
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key === 'settings') { markClean(key); continue; }
        var localVal = await localGet(key);
        if (localVal == null) { markClean(key); continue; }

        try {
          var cloudRow = await cloudGetWithMeta(key);
          var meta = getMeta(key);
          if (cloudRow && cloudRow.value != null) {
            var cloudTime = new Date(cloudRow.updated_at).getTime();
            if (cloudTime > meta.cloudUpdatedAt && meta.cloudUpdatedAt > 0) {
              console.warn('[conflict] ' + key + ': baska cihazda degisiklik yapilmis. Yerel surum tercih ediliyor.');
              logConflict(key, 'local-wins', 'baska cihazdan gelen surum ezildi');
            }
          }
        } catch (e) {}

        try {
          var result = await cloudSet(key, localVal);
          markClean(key);
          try { lastPushed[key] = quickHash(JSON.stringify(localVal)); } catch (e) {}
          var m = getMeta(key);
          m.cloudUpdatedAt = new Date(result.updated_at).getTime();
          setMeta(key, m);
          console.log('[sync] ' + key + ' buluta gonderildi');
        } catch (err) {
          console.warn('[sync] ' + key + ' basarisiz: ' + (err && err.message));
          break;
        }
      }
    })();
    syncPromise = run;
    var reset = function () { if (syncPromise === run) syncPromise = null; };
    run.then(reset, reset);
    return run;
  }

  window.addEventListener('online', function () {
    console.log('[sync] internet geri geldi, senkronize ediliyor');
    setTimeout(syncDirtyKeys, 500);
  });
  setInterval(function () {
    if (navigator.onLine) syncDirtyKeys();
  }, 20000);

  function pickImage() {
    if (nativeBridge && nativeBridge.pickImage) {
      return nativeBridge.pickImage();
    }
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        document.body.removeChild(input);
        if (!file) { resolve({ ok: false, canceled: true }); return; }
        var reader = new FileReader();
        reader.onload = function (e) { resolve({ ok: true, dataUrl: e.target.result }); };
        reader.onerror = function () { resolve({ ok: false, error: 'Okuma hatasi' }); };
        reader.readAsDataURL(file);
      });
      input.click();
    });
  }

  function exportBackup(payload) {
    if (nativeBridge && nativeBridge.exportBackup) {
      return nativeBridge.exportBackup(payload);
    }
    try {
      var json = JSON.stringify(payload, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'yaznot-yedek-' + new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-') + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      return Promise.resolve({ ok: true, filePath: a.download });
    } catch (err) { return Promise.resolve({ ok: false, error: String(err) }); }
  }

  function importBackup(path) {
    if (nativeBridge && nativeBridge.importBackup) {
      return nativeBridge.importBackup(path);
    }
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,application/json'; input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        document.body.removeChild(input);
        if (!file) { resolve({ ok: false, canceled: true }); return; }
        var reader = new FileReader();
        reader.onload = function (e) {
          try {
            var raw = String(e.target.result || '').replace(/^\uFEFF/, '');
            resolve({ ok: true, data: JSON.parse(raw), fileName: file.name || '' });
          } catch (err) { resolve({ ok: false, error: 'Gecersiz yedek: ' + err.message }); }
        };
        reader.onerror = function () { resolve({ ok: false, error: 'Okuma hatasi' }); };
        reader.readAsText(file);
      });
      input.click();
    });
  }

  function confirmDialog(opts) {
    if (typeof window.YazNotConfirm === 'function') {
      return Promise.resolve(window.YazNotConfirm(opts));
    }
    if (nativeBridge && nativeBridge.confirm) {
      return nativeBridge.confirm(opts);
    }
    var msg = (opts.message || '') + (opts.detail ? '\n\n' + opts.detail : '');
    return Promise.resolve(window.confirm(msg));
  }

  // ===== Dosya içe/dışa aktarma (v5) =====
  function sanitizeFileName(name) {
    var s = String(name || 'belge').trim();
    s = s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ');
    if (!s) s = 'belge';
    return s;
  }
  function escapeHtmlSimple(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function buildPdfHtml(title, html) {
    var safeHtml = String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '');
    return '<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">' +
      '<title>' + escapeHtmlSimple(title || 'Belge') + '</title>' +
      '<style>' +
      'html,body{margin:0;padding:0;background:#fff;color:#111;}' +
      'body{font-family:"Segoe UI",Roboto,Arial,Helvetica,sans-serif;font-size:13pt;line-height:1.6;padding:40px;}' +
      'h1,h2,h3{font-weight:700;color:#111;margin:0.6em 0 0.3em;page-break-after:avoid;}' +
      'p,div{margin:0.4em 0;}' +
      'img{max-width:100%;height:auto;}' +
      'b,strong{font-weight:700;}' +
      'i,em{font-style:italic;}' +
      'u{text-decoration:underline;}' +
      '</style></head><body>' + safeHtml + '</body></html>';
  }

  function pickImportFile() {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.markdown,.mdown,.pdf,text/plain,text/markdown,application/pdf';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        document.body.removeChild(input);
        if (!file) { resolve({ ok: false, canceled: true }); return; }
        var name = file.name || '';
        var ext = (name.split('.').pop() || '').toLowerCase();
        if (ext === 'pdf') {
          var r = new FileReader();
          r.onload = function (e) { resolve({ ok: true, fileName: name, kind: 'pdf', arrayBuffer: e.target.result }); };
          r.onerror = function () { resolve({ ok: false, error: 'Dosya okunamadi' }); };
          r.readAsArrayBuffer(file);
        } else {
          var kind = (ext === 'md' || ext === 'markdown' || ext === 'mdown') ? 'md' : 'text';
          var r2 = new FileReader();
          r2.onload = function (e) { resolve({ ok: true, fileName: name, kind: kind, text: e.target.result }); };
          r2.onerror = function () { resolve({ ok: false, error: 'Dosya okunamadi' }); };
          r2.readAsText(file, 'utf-8');
        }
      });
      input.click();
    });
  }

  function downloadBlob(text, fileName, mime) {
    try {
      // BOM ekliyoruz: Windows Not Defteri Türkçe karakterleri doğru göstersin.
      var blob = new Blob(['\uFEFF' + text], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      return Promise.resolve({ ok: true, filePath: a.download });
    } catch (err) { return Promise.resolve({ ok: false, error: String(err) }); }
  }

  function exportTxt(title, text, ext) {
    var e = (ext === 'md' || ext === 'html') ? ext : 'txt';
    if (nativeBridge && nativeBridge.saveTextFile) {
      return nativeBridge.saveTextFile(title, text, e);
    }
    var mime = e === 'md' ? 'text/markdown;charset=utf-8'
      : e === 'html' ? 'text/html;charset=utf-8'
      : 'text/plain;charset=utf-8';
    return downloadBlob(text, sanitizeFileName(title) + '.' + e, mime);
  }

  // Masaüstü köprüsü yoksa (mobil/PWA) otomatik yedek alınamaz; sessizce atlanır.
  function autoBackup(payload) {
    if (nativeBridge && nativeBridge.autoBackup) {
      return nativeBridge.autoBackup(payload);
    }
    return Promise.resolve({ ok: false, unsupported: true });
  }

  function openExternal(url) {
    if (nativeBridge && nativeBridge.openExternal) {
      return nativeBridge.openExternal(url);
    }
    try {
      var u = String(url || '');
      if (!/^https?:\/\//i.test(u)) return Promise.resolve({ ok: false, error: 'Gecersiz baglanti' });
      window.open(u, '_blank', 'noopener,noreferrer');
      return Promise.resolve({ ok: true });
    } catch (err) { return Promise.resolve({ ok: false, error: String(err) }); }
  }

  // Kullanım kılavuzu PDF'i: masaüstünde kaydetme penceresi, PWA'da indirme.
  function downloadGuidePdf() {
    try {
      var a = document.createElement('a');
      a.href = 'yaznot-kullanim-kilavuzu.pdf';
      a.download = 'YazNot-Kullanim-Kilavuzu.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return Promise.resolve({ ok: true, filePath: a.download });
    } catch (err) {
      return Promise.resolve({ ok: false, error: String(err) });
    }
  }

  function printViaBrowser(title, html) {
    // Mobil: gizli iframe üzerinden tarayıcının yazdırma motoruyla PDF olarak kaydet.
    return new Promise(function (resolve) {
      try {
        var iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
        document.body.appendChild(iframe);
        var doc = iframe.contentWindow.document;
        doc.open();
        doc.write(buildPdfHtml(title, html));
        doc.close();
        setTimeout(function () {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            resolve({ ok: true, printed: true });
          } catch (e) { resolve({ ok: false, error: 'Yazdirma baslatilamadi' }); }
          setTimeout(function () { try { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); } catch (e) {} }, 60000);
        }, 400);
      } catch (err) { resolve({ ok: false, error: String(err) }); }
    });
  }

  function saveGuidePdf() {
    if (nativeBridge && nativeBridge.saveGuidePdf) {
      return Promise.resolve(nativeBridge.saveGuidePdf()).then(function (res) {
        if (res && res.ok) return res;
        if (res && !res.unsupported) return res;
        return downloadGuidePdf();
      });
    }
    return downloadGuidePdf();
  }

  // Yerel yazdırma motoru yoksa (web veya desteklenmeyen platform): gizli iframe
  // üzerinden tarayıcının yazdırma penceresi açılır; kullanıcı "PDF olarak kaydet" seçebilir.
  function exportPdf(title, html) {
    if (nativeBridge && nativeBridge.exportPdf) {
      return Promise.resolve(nativeBridge.exportPdf(title, html)).then(function (res) {
        if (res && res.ok) return res;
        // İptal veya gerçek hata: sonucu olduğu gibi bildir.
        if (res && !res.unsupported) return res;
        return printViaBrowser(title, html);
      });
    }
    return printViaBrowser(title, html);
  }

  var lastPushed = {};
  function quickHash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36) + ':' + str.length;
  }

  window.api = {
    load: async function (key) {
      if (key === 'settings') return localGet('settings');

      var localVal = await localGet(key);
      var meta = getMeta(key);
      var localDirty = isDirty(key);

      try {
        var cloudRow = await cloudGetWithMeta(key);
        if (cloudRow && cloudRow.value != null) {
          var cloudTime = new Date(cloudRow.updated_at).getTime();

          // Yerelde henüz buluta gönderilmemiş değişiklik varsa onu asla ezme.
          // (Aksi halde kaydedilmiş ama senkronize edilememiş notlar kaybolabilir.)
          if (localVal != null && localDirty) {
            if (meta.localUpdatedAt > cloudTime) {
              console.log('[conflict] ' + key + ': yerel surum daha yeni, buluta gonderilecek');
              logConflict(key, 'local-newer', 'yerel surum buluta gonderiliyor');
            } else {
              logConflict(key, 'local-dirty', 'yerel bekleyen degisiklik korundu');
            }
            return localVal;
          }

          var changed = (meta.cloudUpdatedAt !== cloudTime);
          if (changed || localVal == null) {
            await localSet(key, cloudRow.value);
            // Bulut sürümü benimsendi: "son gönderilen" önbelleği geçersiz.
            delete lastPushed[key];
          }
          meta.cloudUpdatedAt = cloudTime;
          if (meta.localUpdatedAt < cloudTime) meta.localUpdatedAt = cloudTime;
          setMeta(key, meta);

          if (changed && localVal != null) {
            console.log('[conflict] ' + key + ': bulut surumu daha yeni, yerel guncellendi');
            logConflict(key, 'cloud-newer', 'bulut surumu yerele yazildi');
          }

          return cloudRow.value;
        }
      } catch (err) {
        console.log('[load] bulut erisilemedi, yerel kullaniliyor: ' + key);
      }

      if (localVal != null) return localVal;

      if (nativeBridge && nativeBridge.loadLegacy) {
        try {
          var legacyVal = await nativeBridge.loadLegacy(key);
          if (legacyVal != null) {
            console.log('[migrate] ' + key + ' yerel dosya -> IndexedDB');
            await localSet(key, legacyVal);
            var m = getMeta(key);
            m.localUpdatedAt = Date.now();
            setMeta(key, m);
            markDirty(key);
            syncDirtyKeys();
            return legacyVal;
          }
        } catch (e) {}
      }

      return null;
    },

    // Yalnızca cihaza yaz; bulut denemesini beklemeden hesap değiştirmek için.
    // Bekleyen kayıt "kirli" işaretlenir, hesaba dönünce senkronize edilir.
    saveLocal: async function (key, data) {
      await localSet(key, data);
      var meta = getMeta(key);
      meta.localUpdatedAt = Date.now();
      setMeta(key, meta);
      if (key !== 'settings' && activeUid) markDirty(key);
      return { ok: true, local: true };
    },

    save: async function (key, data) {
      await localSet(key, data);

      var meta = getMeta(key);
      meta.localUpdatedAt = Date.now();
      setMeta(key, meta);

      if (key === 'settings') return { ok: true };

      // Oturum yoksa dirty işaretleme — aksi halde giriş yapıldığında bu (belki boş)
      // veri buluta itilip gerçek notları ezebilir (veri kaybı).
      var uid = await currentUid();
      if (!uid) return { ok: true, synced: false, noUser: true };

      // İçerik değişmediyse gereksiz ağ trafiği oluşturma (her tuş vuruşunda
      // tüm veriyi buluta göndermeyi önler).
      var hash = null;
      try { hash = quickHash(JSON.stringify(data)); } catch (e) {}
      if (hash && lastPushed[key] === hash) return { ok: true, synced: true, skipped: true };

      markDirty(key);

      try {
        var result = await cloudSet(key, data);
        markClean(key);
        if (hash) lastPushed[key] = hash;
        meta.cloudUpdatedAt = new Date(result.updated_at).getTime();
        setMeta(key, meta);
        return { ok: true, synced: true };
      } catch (err) {
        console.log('[save] ' + key + ' yerele yazildi, bulut bekliyor');
        setTimeout(syncDirtyKeys, 3000);
        return { ok: true, synced: false, pending: true };
      }
    },

    saveImage: async function (dataUrl) {
      return { ok: true, dataUrl: dataUrl };
    },

    pickImage: pickImage,
    exportBackup: exportBackup,
    importBackup: importBackup,
    findBackups: function () {
      if (nativeBridge && nativeBridge.findBackups) return nativeBridge.findBackups();
      return Promise.resolve({ ok: true, backups: [] });
    },
    confirm: confirmDialog,
    pickImportFile: pickImportFile,
    exportTxt: exportTxt,
    exportPdf: exportPdf,
    saveGuidePdf: saveGuidePdf,
    autoBackup: autoBackup,
    openExternal: openExternal,
    openBackupsFolder: function () {
      if (nativeBridge && nativeBridge.openBackupsFolder) {
        return nativeBridge.openBackupsFolder();
      }
      return Promise.resolve({ ok: false, unsupported: true });
    },
    platform: isDesktop ? 'desktop' : 'web',

    getPendingSyncCount: function () { return getDirtyKeys().length; },
    syncNow: syncDirtyKeys,
    getConflicts: getConflictLog,
    clearConflicts: function () {
      lsRemove(conflictStorageKey());
    },

    // ===== Paylaşım (shares) =====
    sendShare: async function (payload) {
      var uid = await currentUid();
      if (!uid) throw new Error('no-user');
      var email = await currentEmail();
      var contentData = {
        _share_meta: { senderEmail: email || null, sentAt: Date.now() },
        content: payload.content
      };
      var r = await supa.from('shares').insert({
        sender_id: uid,
        receiver_email: String(payload.receiverEmail || '').trim().toLowerCase(),
        content_type: payload.contentType,
        content_data: contentData,
        message: payload.message ? String(payload.message) : null,
        status: 'pending'
      });
      if (r.error) throw r.error;
      return { ok: true };
    },
    listIncomingShares: async function () {
      var email = await currentEmail();
      if (!email) return [];
      var r = await supa.from('shares').select('*').eq('receiver_email', String(email).trim().toLowerCase()).order('created_at', { ascending: false }).limit(100);
      if (r.error) throw r.error;
      return r.data || [];
    },
    listSentShares: async function () {
      var uid = await currentUid();
      if (!uid) return [];
      var r = await supa.from('shares').select('*').eq('sender_id', uid).order('created_at', { ascending: false }).limit(100);
      if (r.error) throw r.error;
      return r.data || [];
    },
    updateShareStatus: async function (shareId, status) {
      var r = await supa.from('shares').update({ status: status }).eq('id', shareId);
      if (r.error) throw r.error;
      return { ok: true };
    },

    clearLocalCache: function () {
      // Yalnızca etkin hesabın yerel önbelleğini temizle. Diğer hesapların
      // çevrimdışı kopyaları korunur.
      var prefix = namespacePrefix();
      return rawLocalKeys().then(function (keys) {
        var jobs = [];
        (keys || []).forEach(function (key) {
          if (typeof key === 'string' && key.indexOf(prefix) === 0) jobs.push(rawLocalDelete(key));
        });
        return Promise.all(jobs);
      }).then(function () {
        var metaPrefix = META_PREFIX + prefix;
        var keys = lsKeys();
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf(metaPrefix) === 0) lsRemove(keys[i]);
        }
        lsRemove(dirtyStorageKey());
        lsRemove(conflictStorageKey());
        lastPushed = {};
        return { ok: true };
      }).catch(function () { return { ok: false }; });
    },

    getActiveUid: function () { return activeUid; },
    getActiveEmail: function () {
      var acc = findAccount(loadAccounts(), activeUid);
      return acc ? (acc.email || null) : null;
    }
  };

  // ===== Hesap yönetimi (çoklu oturum) =====
  function publicAccounts() {
    var reg = loadAccounts();
    var activeId = activeUid || reg.activeUid;
    var out = [];
    (reg.accounts || []).forEach(function (acc) {
      if (!parseSession(lsGet(ACCOUNT_TOKEN_PREFIX + acc.uid))) return;
      out.push({
        uid: acc.uid,
        email: acc.email || '',
        name: acc.name || '',
        avatarUrl: acc.avatarUrl || null,
        provider: acc.provider || null,
        active: acc.uid === activeId,
        lastUsedAt: acc.lastUsedAt || 0
      });
    });
    out.sort(function (a, b) {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
    });
    return out;
  }

  async function switchAccount(uid) {
    uid = String(uid || '');
    var reg = loadAccounts();
    var acc = findAccount(reg, uid);
    if (!acc) return { ok: false, error: 'Hesap bulunamadı.' };
    var targetRaw = lsGet(ACCOUNT_TOKEN_PREFIX + uid);
    var targetSession = parseSession(targetRaw);
    if (!targetSession) {
      return { ok: false, error: 'Bu hesabın oturumu bulunamadı. Yeniden giriş yapman gerekiyor.' };
    }
    if (reg.activeUid === uid && parseSession(lsGet(ACTIVE_TOKEN_KEY))) {
      return { ok: true, same: true };
    }

    // Etkin oturumun en güncel hâlini (yenilenmiş token olabilir) kasaya yaz.
    switchingInProgress = true;
    try {
      var current = await currentSession();
      if (current && current.user) archiveSession(current);
    } catch (e) {
    } finally {
      switchingInProgress = false;
    }

    reg = loadAccounts();
    acc = findAccount(reg, uid) || acc;
    targetRaw = lsGet(ACCOUNT_TOKEN_PREFIX + uid);
    targetSession = parseSession(targetRaw);
    if (!targetSession) {
      return { ok: false, error: 'Bu hesabın oturumu bulunamadı. Yeniden giriş yapman gerekiyor.' };
    }

    // Etkin anahtarı değiştir; sayfa yenilenince Supabase bu oturumla açılır.
    lsSet(ACTIVE_TOKEN_KEY, targetRaw);
    reg.activeUid = uid;
    if (acc) acc.lastUsedAt = Date.now();
    saveAccounts(reg);
    activeUid = uid;
    saveSessionRecord(targetSession);
    lsSet(LAST_UID_KEY, uid);
    window.location.reload();
    return { ok: true };
  }

  async function signOutCurrent() {
    var reg = loadAccounts();
    var uid = reg.activeUid || activeUid;
    suppressAuthEvents = true;

    // Bekleyen değişiklikleri göndermeyi dene; başarısız olsa da yerel kopya
    // hesabın kendi alanında kalır ve tekrar girişte senkronize edilir.
    if (navigator.onLine) {
      try { await withTimeout(syncDirtyKeys(), 4000); } catch (e) {}
    }
    try { await withTimeout(supa.auth.signOut({ scope: 'local' }), 3000); } catch (e) {}

    // Token yenileme sırasında kasa güncellenmiş olabilir; son hâlini oku.
    reg = loadAccounts();
    lsRemove(ACTIVE_TOKEN_KEY);
    if (uid) {
      lsRemove(ACCOUNT_TOKEN_PREFIX + uid);
      reg.accounts = reg.accounts.filter(function (a) { return a.uid !== uid; });
    }
    reg.activeUid = null;
    clearSessionRecord();

    // Başka açık hesap varsa ona geç; yoksa giriş ekranına dön.
    var next = pickNextAccount(reg);
    if (next && activateAccount(reg, next)) {
      // activateAccount kaydı ve etkin anahtarı yazdı.
    } else {
      reg.activeUid = null;
      activeUid = null;
      saveAccounts(reg);
      lsRemove(LAST_UID_KEY);
    }
    window.location.reload();
    return { ok: true };
  }

  async function removeAccount(uid) {
    uid = String(uid || '');
    var reg = loadAccounts();
    var acc = findAccount(reg, uid);
    if (!acc) return { ok: false, error: 'Hesap bulunamadı.' };
    if (uid === reg.activeUid) return signOutCurrent();

    lsRemove(ACCOUNT_TOKEN_PREFIX + uid);
    reg.accounts = reg.accounts.filter(function (a) { return a.uid !== uid; });
    saveAccounts(reg);
    return { ok: true };
  }

  async function signOutAll() {
    suppressAuthEvents = true;
    if (navigator.onLine) {
      try { await withTimeout(syncDirtyKeys(), 3000); } catch (e) {}
    }
    try { await withTimeout(supa.auth.signOut({ scope: 'local' }), 3000); } catch (e) {}
    lsRemove(ACTIVE_TOKEN_KEY);
    var reg = loadAccounts();
    (reg.accounts || []).forEach(function (acc) {
      lsRemove(ACCOUNT_TOKEN_PREFIX + acc.uid);
    });
    reg.accounts = [];
    reg.activeUid = null;
    saveAccounts(reg);
    clearSessionRecord();
    lsRemove(LAST_UID_KEY);
    window.location.reload();
    return { ok: true };
  }

  window.yaznotAuth = {
    client: supa,
    getSession: currentSession,
    isLoggedIn: async function () {
      var reg = loadAccounts();
      var activeToken = parseSession(lsGet(ACTIVE_TOKEN_KEY));
      var activeAccount = findAccount(reg, activeUid || reg.activeUid);
      var hasStoredSession = !!(activeAccount && parseSession(lsGet(ACCOUNT_TOKEN_PREFIX + activeAccount.uid)));

      // Çevrimdışıyken cihazdaki oturumu kullan (giriş ekranı gösterme).
      if (!navigator.onLine && (activeToken || hasStoredSession)) return true;

      try {
        var s = await currentSession();
        if (s && s.user) { archiveSession(s); return true; }
      } catch (e) {}

      // Ağ hatasında geçerli kayıtlı oturumu kaybetme.
      if (activeToken || hasStoredSession) return true;
      return false;
    },
    getEmail: currentEmail,
    getUid: currentUid,
    getActiveUid: function () { return activeUid; },
    listAccounts: publicAccounts,
    switchAccount: switchAccount,
    removeAccount: removeAccount,
    signOut: signOutCurrent,
    signOutAll: signOutAll,
    hasMultipleAccounts: function () { return publicAccounts().length > 1; },
    sendOtp: async function (email) {
      var r = await supa.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
      if (r.error) return { ok: false, error: r.error.message };
      return { ok: true };
    },
    verifyOtp: async function (email, token) {
      var r = await supa.auth.verifyOtp({ email: email, token: token, type: 'email' });
      if (r.error) return { ok: false, error: r.error.message };
      return { ok: true, session: r.data.session };
    },
    signInWithGoogle: async function () {
      var redirectTo;
      if (isDesktop) {
        redirectTo = (cfg.oauthRedirect || 'https://yaznot.vercel.app/app/');
      } else {
        redirectTo = window.location.origin + window.location.pathname;
      }
      var r = await supa.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          skipBrowserRedirect: isDesktop,
          // Birden çok hesap kullanılabilsin: Google her seferinde hesap seçtirsin.
          queryParams: { prompt: 'select_account' }
        }
      });
      if (r.error) return { ok: false, error: r.error.message };
      if (!isDesktop) {
        return { ok: true, redirecting: true };
      }
      var popupResult = await nativeBridge.googleSignIn(r.data.url);
      if (!popupResult || !popupResult.ok) {
        return {
          ok: false,
          error: (popupResult && popupResult.error) || 'Giriş iptal edildi'
        };
      }
      var params = new URLSearchParams(popupResult.hash || popupResult.query || '');
      var access_token = params.get('access_token');
      var refresh_token = params.get('refresh_token');
      if (!access_token) {
        return { ok: false, error: 'Oturum anahtarı alınamadı' };
      }
      var setRes = await supa.auth.setSession({
        access_token: access_token,
        refresh_token: refresh_token || ''
      });
      if (setRes.error) return { ok: false, error: setRes.error.message };
      return { ok: true };
    }
  };

  if (navigator.onLine) {
    setTimeout(syncDirtyKeys, 1500);
  } else {
    console.log('[sync] offline baslatildi, internet geldiginde senkronize edilecek');
  }
})();