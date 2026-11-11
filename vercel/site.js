(function () {
  'use strict';

  var dict = {
    'meta.title': {
      tr: 'YazNot — yaz, konuş, gerisi kalsın',
      en: 'YazNot — write, speak, let the rest wait'
    },
    'meta.description': {
      tr: "YazNot, aklındaki cümleyi kaybetmemek için tasarlanmış bir not defteri. Windows'ta çevrimdışı, telefonda uygulama gibi; aynı hesapla her cihazda aynı.",
      en: 'YazNot is a notebook built so the sentence in your head does not get lost. Offline on Windows, an app on your phone, the same notebook everywhere.'
    },
    'meta.ogTitle': { tr: 'YazNot', en: 'YazNot' },
    'meta.ogDescription': {
      tr: 'Yaz. Konuş. Gerisi kalsın. Windows ve web için sakin bir not defteri.',
      en: 'Write. Speak. Let the rest wait. A calm notebook for Windows and the web.'
    },

    skip: { tr: 'İçeriğe geç', en: 'Skip to content' },

    'nav.film': { tr: 'Tanıtım', en: 'Film' },
    'nav.difference': { tr: 'Neden', en: 'Why' },
    'nav.devices': { tr: 'Cihazlar', en: 'Devices' },
    'nav.guide': { tr: 'Kılavuz', en: 'Guide' },
    'nav.open': { tr: "YazNot'u aç", en: 'Open YazNot' },
    'nav.aria': { tr: 'Sayfa', en: 'Page' },

    'hero.kicker': { tr: 'YazNot 1.0 · Windows + web', en: 'YazNot 1.0 · Windows + web' },
    'hero.title': {
      tr: 'Yaz. Konuş.<br><em>Gerisi kalsın.</em>',
      en: 'Write. Speak.<br><em>Let the rest wait.</em>'
    },
    'hero.lead': {
      tr: "Aklındaki cümleyi kaybetmemek için tasarlandı. Windows'ta çevrimdışı çalışır, telefonda ana ekranına eklenir; aynı hesapla her cihazda aynı defter.",
      en: 'Built so the sentence in your head does not get lost. It runs offline on Windows, installs from the browser on your phone, and keeps the same notebook everywhere you sign in.'
    },
    'hero.open': { tr: "YazNot'u aç", en: 'Open YazNot' },
    'hero.openSub': { tr: 'Telefonda uygulama · tarayıcıda', en: 'An app on your phone · in your browser' },
    'hero.download': { tr: 'Windows için indir', en: 'Download for Windows' },
    'hero.downloadSub': { tr: '4,4 MB · ücretsiz', en: '4.4 MB · free' },
    'hero.meta': {
      tr: 'Windows 10/11 · WebView2 · çevrimdışı',
      en: 'Windows 10/11 · WebView2 · offline'
    },
    'hero.alt': {
      tr: 'YazNot uygulamasının bölüm ekranı',
      en: 'The section view in the YazNot app'
    },
    'hero.caption': {
      tr: 'Masaüstü · aynı defter, iki ekran',
      en: 'Desktop · one notebook, two screens'
    },

    'proof.aria': { tr: 'Özellikler', en: 'Features' },
    'proof.local': { tr: 'Cihazda saklanır', en: 'Saved on your device' },
    'proof.speech': { tr: 'Ses cihazdan çıkmaz', en: 'Speech never leaves it' },
    'proof.backup': { tr: 'Her gün yedek', en: 'A backup every day' },
    'proof.export': { tr: 'PDF · TXT · Markdown', en: 'PDF · TXT · Markdown' },

    'film.kicker': { tr: '37 saniye', en: '37 seconds' },
    'film.title': { tr: 'Kısa bir bakış.', en: 'A short look.' },
    'film.lead': {
      tr: 'Ne yaptığını gösteren sessiz bir tur. Süs değil, ürün.',
      en: 'A quiet tour of what it does. Not decoration — the product.'
    },
    'film.aria': { tr: 'YazNot tanıtım videosu', en: 'YazNot introduction video' },
    'film.fallback': {
      tr: 'Tarayıcın videoyu oynatamıyor. <a href="tanitim.mp4">MP4 olarak indir</a>.',
      en: 'Your browser cannot play the video. <a href="tanitim-en.mp4">Download the MP4</a>.'
    },
    'film.meta': { tr: '37 sn · sessiz · 1080p', en: '37 sec · silent · 1080p' },

    'difference.kicker': { tr: 'Neden farklı', en: 'Why it is different' },
    'difference.title': {
      tr: 'Düşünmeyi bölmeyen bir defter.',
      en: 'A notebook that does not interrupt the thought.'
    },
    'difference.lead': {
      tr: "YazNot'u daha çok özellik için değil, daha az şeyi kaçırmak için yaptık.",
      en: 'We built YazNot to lose fewer things, not to add more features.'
    },
    'difference.oneTitle': { tr: 'Önce cihaz', en: 'Device first' },
    'difference.oneBody': {
      tr: 'Yazdığın an bu cihazda kaydedilir. İnternet yokken de devam edersin; bağlantı gelince değişiklikler sessizce eşitlenir.',
      en: 'A note is saved on this device the moment you write it. Keep going without a connection; changes settle quietly when it returns.'
    },
    'difference.twoTitle': { tr: 'Ses dışarı çıkmaz', en: 'Speech stays here' },
    'difference.twoBody': {
      tr: 'Türkçe ve İngilizce konuşma, cihazındaki modelle yazıya dönüşür. Kayıt bir sunucuya gönderilmez; model bir kez indirilir, sonra çevrimdışı çalışır.',
      en: 'Turkish and English speech become text with a model on your device. Audio is never sent to a server; the model downloads once, then works offline.'
    },
    'difference.threeTitle': { tr: 'Sade, ama eksik değil', en: 'Calm, not stripped' },
    'difference.threeBody': {
      tr: 'Odak modu, kitap gibi okuma, toplu taşıma, geri dönüşüm ve günlük yedek. Ayrıntılar menülerde; yazarken önünde değil.',
      en: 'Focus mode, a reader view, bulk move, trash and daily backups. The details live in menus, not in the way of your writing.'
    },

    'devices.kicker': { tr: 'Her yerde', en: 'Everywhere' },
    'devices.title': { tr: 'Aynı defter, iki hayat.', en: 'One notebook, two kinds of days.' },
    'devices.lead': {
      tr: 'Masaüstünde uzun yazılar, telefonda hızlı notlar. İkisi aynı hesapta buluşur.',
      en: 'Long writing on the desktop, quick notes on the phone. Both meet in the same account.'
    },
    'devices.desktopLabel': { tr: 'Windows', en: 'Windows' },
    'devices.desktopTitle': { tr: 'Masaüstünde.', en: 'On your desktop.' },
    'devices.desktopBody': {
      tr: "4,4 MB'lık tek kurulum. İnternet olmadan yaz; bağlantı gelince eşitle.",
      en: 'One 4.4 MB install. Write offline; sync when the connection returns.'
    },
    'devices.desktopOne': { tr: 'Odak modu ve geniş editör', en: 'Focus mode and a wide editor' },
    'devices.desktopTwo': { tr: 'Yerel PDF dışa aktarma', en: 'Native PDF export' },
    'devices.desktopThree': { tr: 'Günlük otomatik yedek', en: 'A daily automatic backup' },
    'devices.desktopCta': { tr: 'Windows için indir', en: 'Download for Windows' },
    'devices.desktopCtaSub': { tr: '4,4 MB · Windows 10/11', en: '4.4 MB · Windows 10/11' },
    'devices.desktopNote': {
      tr: 'İlk açılışta Windows uyarırsa: Daha fazla bilgi → Yine de çalıştır.',
      en: 'If Windows warns on first launch: More info → Run anyway.'
    },
    'devices.phoneLabel': { tr: 'Telefon', en: 'Phone' },
    'devices.phoneTitle': { tr: 'Cebinde.', en: 'In your pocket.' },
    'devices.phoneBody': {
      tr: 'Tarayıcıda aç, ana ekranına ekle. Ayrı mağaza indirmesi yok; aynı hesap, aynı notlar.',
      en: 'Open it in the browser, add it to your home screen. No store download; the same account, the same notes.'
    },
    'devices.phoneOne': { tr: "YazNot'u aç.", en: 'Open YazNot.' },
    'devices.phoneTwo': { tr: 'Ana ekrana ekle.', en: 'Add it to your home screen.' },
    'devices.phoneNote': {
      tr: 'Android: Uygulamayı yükle · iPhone: Paylaş → Ana Ekrana Ekle',
      en: 'Android: Install app · iPhone: Share → Add to Home Screen'
    },
    'devices.phoneCta': { tr: 'Telefonda aç →', en: 'Open on your phone →' },

    'guide.kicker': { tr: 'Kılavuz', en: 'Guide' },
    'guide.title': { tr: 'İlk günden itibaren yanında.', en: 'A hand from the first day.' },
    'guide.lead': {
      tr: 'Kılavuz uygulamanın içinde; çevrimdışı. PDF sürümü de aynı dili konuşur.',
      en: 'The guide lives inside the app, offline. The PDF speaks the same language.'
    },
    'guide.cover': { tr: 'Kullanım kılavuzu', en: 'User guide' },
    'guide.topic1': { tr: 'İlk not ve bölümler', en: 'The first note and sections' },
    'guide.topic2': { tr: 'Sesten metne', en: 'Speech to text' },
    'guide.topic3': { tr: 'Yedek, paylaşım, kısayollar', en: 'Backup, sharing, shortcuts' },
    'guide.pdf': { tr: 'Kılavuzu aç', en: 'Open the guide' },
    'guide.open': { tr: 'Uygulamada aç →', en: 'Open in the app →' },
    'guide.pdfNote': { tr: 'PDF · 7 sayfa · Türkçe', en: 'PDF · 7 pages · English' },

    'footer.tagline': {
      tr: 'Notların senin. İstediğin cihazdan, istediğin zaman.',
      en: 'Your notes are yours. From any device, at any time.'
    },
    'footer.app': { tr: 'Uygulama', en: 'App' },
    'footer.download': { tr: 'Windows', en: 'Windows' },
    'footer.guide': { tr: 'Kılavuz', en: 'Guide' },
    'footer.ack': { tr: 'Teşekkürler', en: 'Acknowledgements' },
    'footer.colophon': { tr: 'Açık kaynak · MIT lisansı', en: 'Open source · MIT licence' },
    'footer.navAria': { tr: 'Alt bağlantılar', en: 'Footer links' }
  };

  var STORAGE_KEY = 'yaznot_site_lang';

  function currentLang() {
    var lang = document.documentElement.lang;
    return lang === 'en' ? 'en' : 'tr';
  }

  function apply(lang) {
    if (lang !== 'en' && lang !== 'tr') lang = 'tr';
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var item = dict[el.getAttribute('data-i18n')];
      if (item) el.textContent = item[lang];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var item = dict[el.getAttribute('data-i18n-html')];
      if (item) el.innerHTML = item[lang];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var item = dict[el.getAttribute('data-i18n-aria')];
      if (item) el.setAttribute('aria-label', item[lang]);
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      var item = dict[el.getAttribute('data-i18n-alt')];
      if (item) el.setAttribute('alt', item[lang]);
    });

    document.title = dict['meta.title'][lang];
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', dict['meta.description'][lang]);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', dict['meta.ogTitle'][lang]);
    var ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', dict['meta.ogDescription'][lang]);

    document.querySelectorAll('[data-set-lang]').forEach(function (button) {
      var active = button.getAttribute('data-set-lang') === lang;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.classList.toggle('active', active);
    });

    document.querySelectorAll('[data-guide-pdf]').forEach(function (link) {
      link.setAttribute('href', lang === 'en' ? 'kilavuz-en.pdf' : 'kilavuz.pdf');
    });

    var shot = document.querySelector('.browser img');
    if (shot) {
      var nextShot = shot.getAttribute('data-shot-' + lang);
      if (nextShot && shot.getAttribute('src') !== nextShot) shot.setAttribute('src', nextShot);
    }

    var video = document.getElementById('promo-video');
    if (video) {
      var source = video.querySelector('source');
      var nextSource = source && source.getAttribute('data-src-' + lang);
      var nextPoster = video.getAttribute('data-poster-' + lang);
      var changed = false;
      if (nextSource && source.getAttribute('src') !== nextSource) {
        source.setAttribute('src', nextSource);
        changed = true;
      }
      if (nextPoster && video.getAttribute('poster') !== nextPoster) {
        video.setAttribute('poster', nextPoster);
        changed = true;
      }
      if (changed) {
        try { video.load(); } catch (e) {}
      }
    }

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    try {
      var url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  document.querySelectorAll('[data-set-lang]').forEach(function (button) {
    button.addEventListener('click', function () {
      apply(button.getAttribute('data-set-lang'));
    });
  });

  apply(currentLang());
})();
