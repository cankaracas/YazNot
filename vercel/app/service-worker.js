var CACHE_NAME = 'yaznot-9a8ee690';
var ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './i18n.js',
  './cloud-api.js',
  './platform.js',
  './auth.js',
  './config.js',
  './guide.js',
  './guide-content.js',
  './guide-content.en.js',
  './yaznot-kullanim-kilavuzu.pdf',
  './supabase.min.js',
  './pdf.min.js',
  './pdf.worker.min.js',
  './stt/stt-app.js',
  './stt/ds-core.js',
  './stt/ds-worker.js',
  './manifest.json',
  './logo-mark.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Tek bir dosya eksik olsa bile kurulum tamamlanır (çevrimdışı desteği kısmen sürer).
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(url).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) {
          // Uygulama kabuğu dışındaki her şeyi sil, ama indirilen ses modelini
          // (yaznot-stt-*) koru: model her sürümde yeniden indirilmesin.
          return k !== CACHE_NAME && k.indexOf('yaznot-stt-') !== 0;
        }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  // Supabase ve diğer dış origin isteklerine karışma (yalnızca kendi varlıklarımızı yönetiyoruz).
  if (url.origin !== self.location.origin) return;

  // Ağ öncelikli strateji: internet varken her zaman en güncel kodu çek (güncellemeler anında yayılsın),
  // yoksa önbellekten sun (çevrimdışı çalışsın).
  event.respondWith(
    fetch(event.request).then(function (networkRes) {
      if (networkRes && networkRes.ok) {
        var copy = networkRes.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      }
      return networkRes;
    }).catch(function () {
      return caches.match(event.request).then(function (res) {
        if (res) return res;
        // Yalnızca sayfa gezinmelerinde HTML'e düş; JS/CSS isteğine HTML dönme.
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
