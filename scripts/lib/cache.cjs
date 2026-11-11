const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/** Service worker onbellek surumu: icerigin tamamindan turetilir. */
const CACHE_SOURCES = [
  'index.html',
  'style.css',
  'app.js',
  'cloud-api.js',
  'auth.js',
  'config.js',
  'platform.js',
  'guide.js',
  'guide-content.js',
  'manifest.json',
  'yaznot-kullanim-kilavuzu.pdf',
  'stt/stt-app.js',
  'stt/ds-core.js',
  'stt/ds-worker.js'
];

function computeCacheName(directory) {
  const hash = crypto.createHash('sha1');
  CACHE_SOURCES.forEach(function (relative) {
    const file = path.join(directory, relative);
    hash.update(fs.existsSync(file) ? fs.readFileSync(file) : '');
  });
  return 'yaznot-' + hash.digest('hex').slice(0, 8);
}

module.exports = { CACHE_SOURCES, computeCacheName };
