(function () {
  'use strict';

  var dict = {
    'meta.title': {
      tr: 'YazNot — yaz, konuş, her yerde devam et',
      en: 'YazNot — write, speak, keep going'
    },
    'meta.description': {
      tr: "Sade bir not defteri. Windows'ta çevrimdışı çalışır, telefonda uygulama gibi açılır; aynı hesapla notların her yerde aynı kalır.",
      en: 'A quiet notebook. It works offline on Windows, opens like an app on your phone, and keeps the same notes everywhere.'
    },
    'meta.ogTitle': {
      tr: 'YazNot',
      en: 'YazNot'
    },
    'meta.ogDescription': {
      tr: "Sade bir not defteri. Windows'ta çevrimdışı, telefonda uygulama gibi.",
      en: 'A quiet notebook. Offline on Windows, an app on your phone.'
    },

    skip: { tr: 'İçeriğe geç', en: 'Skip to content' },

    'nav.film': { tr: 'Tanıtım', en: 'Film' },
    'nav.how': { tr: 'Nasıl', en: 'How it works' },
    'nav.desktop': { tr: 'Windows', en: 'Windows' },
    'nav.guide': { tr: 'Kılavuz', en: 'Guide' },
    'nav.open': { tr: 'Uygulamayı aç', en: 'Open the app' },
    'nav.aria': { tr: 'Sayfa', en: 'Page' },

    'hero.kicker': { tr: 'YazNot 1.0 · Windows + web', en: 'YazNot 1.0 · Windows + web' },
    'hero.title': {
      tr: 'Yaz. Konuş.<br><em>Gerisi kalsın.</em>',
      en: 'Write. Speak.<br><em>Let the rest wait.</em>'
    },
    'hero.lead': {
      tr: "Sade bir not defteri. Windows'ta çevrimdışı çalışır, telefonda uygulama gibi açılır; aynı hesapla notların her yerde aynı kalır.",
      en: 'A quiet notebook. It works offline on Windows, opens like an app on your phone, and keeps the same notes everywhere.'
    },
    'hero.open': { tr: 'Web uygulamasını aç', en: 'Open the web app' },
    'hero.openSub': { tr: 'Telefon + tarayıcı', en: 'Phone + browser' },
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

    'strip.aria': { tr: 'Özellikler', en: 'Features' },
    'strip.sections': { tr: 'Bölümler ve gruplar', en: 'Sections and groups' },
    'strip.speech': { tr: 'Cihazda sesten metne', en: 'On-device speech to text' },
    'strip.export': { tr: 'PDF · TXT · Markdown', en: 'PDF · TXT · Markdown' },
    'strip.offline': { tr: 'Çevrimdışı', en: 'Offline' },

    'film.kicker': { tr: '37 saniye', en: '37 seconds' },
    'film.title': { tr: 'Kısa bir bakış.', en: 'A short look.' },
    'film.lead': {
      tr: 'Ne yaptığını gösteren sessiz bir tur.',
      en: 'A quiet tour of what it does.'
    },
    'film.aria': { tr: 'YazNot tanıtım videosu', en: 'YazNot introduction video' },
    'film.fallback': {
      tr: 'Tarayıcın videoyu oynatamıyor. <a href="tanitim.mp4">MP4 olarak indir</a>.',
      en: 'Your browser cannot play the video. <a href="tanitim-en.mp4">Download the MP4</a>.'
    },
    'film.meta': { tr: '37 sn · sessiz · 1080p', en: '37 sec · silent · 1080p' },

    'how.kicker': { tr: 'Üç parça', en: 'Three parts' },
    'how.title': { tr: 'Üç şey yeter.', en: 'Three things are enough.' },
    'how.lead': {
      tr: 'Yaz, konuş, sakla. Geri kalan ayrıntılar yolda kaybolmasın.',
      en: 'Write, speak, keep. The small details should not get lost on the way.'
    },
    'how.oneTitle': { tr: 'Yaz', en: 'Write' },
    'how.oneBody': {
      tr: 'Bölümler, gruplar ve kitap gibi okuma. Düşünceni düzenli tut; arama ve odak modu gerisini halleder.',
      en: 'Sections, groups and a reader view. Keep the thought; search and focus mode handle the rest.'
    },
    'how.twoTitle': { tr: 'Konuş', en: 'Speak' },
    'how.twoBody': {
      tr: 'Türkçe ve İngilizce konuşmayı cihazında yazıya çevir. Kayıt sunucuya gitmez.',
      en: 'Turn Turkish and English speech into text on your device. Audio never leaves it.'
    },
    'how.threeTitle': { tr: 'Sakla', en: 'Keep' },
    'how.threeBody': {
      tr: 'Aynı hesap, her cihaz. Günlük yedek, çevrimdışı çalışma ve PDF / TXT / Markdown çıkışı.',
      en: 'One account, every device. Daily backups, offline writing and PDF / TXT / Markdown export.'
    },

    'desktop.kicker': { tr: 'Windows', en: 'Windows' },
    'desktop.receiptAria': { tr: 'Windows kurulum bilgileri', en: 'Windows install details' },
    'desktop.title': { tr: 'Masaüstünde.', en: 'On your desktop.' },
    'desktop.lead': {
      tr: '4,4 MB\'lık tek kurulum. İnternet olmadan yaz, bağlantı gelince eşitle.',
      en: 'One 4.4 MB install. Write offline; sync when the connection returns.'
    },
    'desktop.download': { tr: "YazNot'u indir", en: 'Download YazNot' },
    'desktop.downloadSub': { tr: 'Windows 10/11 · 64-bit', en: 'Windows 10/11 · 64-bit' },
    'desktop.note': {
      tr: 'İlk açılışta Windows uyarırsa: Daha fazla bilgi → Yine de çalıştır.',
      en: 'If Windows warns on first launch: More info → Run anyway.'
    },
    'desktop.os': { tr: 'İşletim sistemi', en: 'Operating system' },
    'desktop.arch': { tr: 'Mimari', en: 'Architecture' },
    'desktop.runtime': { tr: 'Çalışma ortamı', en: 'Runtime' },
    'desktop.offlineLabel': { tr: 'Çevrimdışı', en: 'Offline' },
    'desktop.offlineValue': { tr: 'Evet', en: 'Yes' },
    'desktop.receiptCta': { tr: 'Kurulumu indir', en: 'Download the installer' },
    'desktop.size': { tr: '4,4<span>MB</span>', en: '4.4<span>MB</span>' },

    'phone.kicker': { tr: 'Telefon', en: 'Phone' },
    'phone.title': { tr: 'Cebinde.', en: 'In your pocket.' },
    'phone.lead': {
      tr: 'Web uygulamasını aç, tarayıcı menüsünden ana ekrana ekle. Mağaza yok, ayrı indirme yok.',
      en: 'Open the web app, then add it to your home screen from the browser menu. No store, no second download.'
    },
    'phone.step1': { tr: 'Web uygulamasını aç.', en: 'Open the web app.' },
    'phone.step2': { tr: 'Ana ekrana ekle.', en: 'Add it to your home screen.' },
    'phone.note': {
      tr: 'Android: Uygulamayı yükle · iPhone: Paylaş → Ana Ekrana Ekle',
      en: 'Android: Install app · iPhone: Share → Add to Home Screen'
    },
    'phone.cta': { tr: 'Uygulamayı aç →', en: 'Open the app →' },

    'guide.kicker': { tr: 'Kılavuz', en: 'Guide' },
    'guide.title': { tr: 'Takıldığında.', en: 'When you need a hand.' },
    'guide.lead': {
      tr: 'Kılavuz uygulamanın içinde; PDF sürümü de burada. Bölümler, ses, dışa aktarma ve kısayollar.',
      en: 'The guide ships inside the app; the PDF is here too. Sections, speech, export and shortcuts.'
    },
    'guide.cover': { tr: 'Kullanım kılavuzu', en: 'User guide' },
    'guide.topic1': { tr: 'Kurulum ve ilk not', en: 'Setup and the first note' },
    'guide.topic2': { tr: 'Sesten metne', en: 'Speech to text' },
    'guide.topic3': { tr: 'Kısayollar ve dışa aktarma', en: 'Shortcuts and export' },
    'guide.pdf': { tr: "PDF'i aç", en: 'Open the PDF' },
    'guide.open': { tr: 'Uygulamada aç →', en: 'Open in the app →' },
    'guide.pdfNote': { tr: 'PDF · 9 sayfa · Türkçe', en: 'PDF · 9 pages · Turkish' },

    'footer.navAria': { tr: 'Alt bağlantılar', en: 'Footer links' },
    'footer.tagline': {
      tr: 'Notların senin. İstediğin cihazdan, istediğin zaman.',
      en: 'Your notes are yours. From any device, at any time.'
    },
    'footer.app': { tr: 'Uygulama', en: 'App' },
    'footer.download': { tr: 'Windows', en: 'Windows' },
    'footer.guide': { tr: 'Kılavuz', en: 'Guide' },
    'footer.ack': { tr: 'Teşekkürler', en: 'Acknowledgements' },
    'footer.colophon': { tr: 'Açık kaynak · MIT lisansı', en: 'Open source · MIT licence' }
  };

  var STORAGE_KEY = 'yaznot_site_lang';

  function currentLang() {
    var lang = document.documentElement.lang;
    return lang === 'en' ? 'en' : 'tr';
  }

  function setText(el, value) {
    if (value == null) return;
    el.textContent = value;
  }

  function apply(lang) {
    if (lang !== 'en' && lang !== 'tr') lang = 'tr';
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var item = dict[el.getAttribute('data-i18n')];
      if (item) setText(el, item[lang]);
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

    document.querySelectorAll('[data-set-lang]').forEach(function (button) {
      var active = button.getAttribute('data-set-lang') === lang;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.classList.toggle('active', active);
    });

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
