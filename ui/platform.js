/**
 * YazNot — masaüstü köprüsü.
 *
 * Arayüz hiçbir zaman doğrudan kabuk API'si çağırmaz; yalnızca bu köprüyü
 * kullanır. Köprü yoksa (tarayıcı / PWA) `null` kalır ve cloud-api.js kendi
 * web karşılıklarını devreye alır. Böylece masaüstü ve web aynı kodu çalıştırır.
 */
(function () {
  'use strict';

  var runtime = window.__TAURI__;
  var core = runtime && runtime.core;
  if (!core || typeof core.invoke !== 'function') {
    window.yaznotNative = null;
    return;
  }

  function invoke(command, args) {
    return core.invoke(command, args || {});
  }

  window.yaznotNative = {
    pickImage: function () { return invoke('pick_image'); },
    exportBackup: function (payload) { return invoke('export_backup', { payload: payload }); },
    importBackup: function (path) { return invoke('import_backup', { path: path || null }); },
    findBackups: function () { return invoke('find_backups'); },
    autoBackup: function (payload) { return invoke('auto_backup', { payload: payload }); },
    openBackupsFolder: function () { return invoke('open_backups_folder'); },
    confirm: function (opts) { return invoke('confirm', { opts: opts || {} }); },
    loadLegacy: function (key) { return invoke('load_legacy', { key: key }); },
    googleSignIn: function (url) { return invoke('google_sign_in', { url: url }); },
    saveTextFile: function (title, text, ext) {
      return invoke('save_text_file', { title: title, text: text, ext: ext });
    },
    exportPdf: function (title, html) { return invoke('export_pdf', { title: title, html: html }); },
    saveGuidePdf: function () { return invoke('save_guide_pdf'); },
    openExternal: function (url) { return invoke('open_external', { url: url }); },
    setMemoryLevel: function (low) { return invoke('set_memory_level', { low: !!low }); }
  };
})();
