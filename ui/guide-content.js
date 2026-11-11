/* ÜRETİLMİŞ DOSYA — elle düzenlemeyin. Kaynak: docs/USER-GUIDE.tr.md (npm run guide) */
window.YAZNOT_GUIDE = {
  "version": "1.0",
  "updated": "Kasım 2026",
  "title": "Kullanım kılavuzu",
  "subtitle": "YazNot 1.0 · her şeyi adım adım anlatır",
  "pdf": "yaznot-kullanim-kilavuzu.pdf",
  "sections": [
    {
      "id": "hos-geldin",
      "title": "Hoş geldin",
      "html": "<p>YazNot, notlarını yazdığın her yerde yanında taşıyan sade bir defter. Telefonda, bilgisayarda ve tablette açılır; aynı hesapla girdiğin sürece notların her cihazda aynı görünür. İnternet yokken de yazabilirsin, bağlantı gelince kendiliğinden eşitlenir.</p>\n<p>Bu kılavuzu her zaman uygulamanın sağ alt köşesindeki <strong>?</strong> düğmesinden açabilirsin. Aynı kılavuzun PDF sürümü de yanında durur; <strong>PDF olarak kaydet</strong> düğmesiyle indirebilirsin.</p>"
    },
    {
      "id": "i-lk-adim",
      "title": "İlk adım",
      "html": "<ol><li>Google hesabınla ya da e-postana gelen tek kullanımlık kodla giriş yap.</li><li><strong>Yeni bölüm</strong> düğmesiyle ilk bölümünü oluştur; adını, simgesini ve rengini seç.</li><li>Sağ üstteki <strong>Yeni öğe</strong> düğmesiyle ilk notunu aç ve yazmaya başla.</li></ol>\n<p>Notlar kendiliğinden kaydedilir. Yazarken &quot;kaydettim mi?&quot; diye düşünmen gerekmez; başlığın altındaki durum yazısı sana ne olduğunu söyler.</p>\n<h3>Masaüstüne kurulum</h3>\n<ul><li>Windows için indirme sayfasındaki <strong>YazNot'u indir</strong> düğmesini kullan. Kurulum dosyası <code>YazNot-Setup-1.0.0.exe</code> adıyla gelir.</li><li>Windows ilk açılışta &quot;tanınmayan uygulama&quot; uyarısı gösterebilir: <strong>Daha fazla bilgi → Yine de çalıştır</strong> ile devam edebilirsin.</li><li>Kurulumdan sonra YazNot masaüstünde ve başlat menüsünde görünür.</li></ul>\n<h3>Telefona kurulum (PWA)</h3>\n<ul><li>Android'de Chrome menüsünden <strong>Uygulamayı yükle</strong>, iPhone'da Safari'de <strong>Paylaş → Ana Ekrana Ekle</strong> seçeneğini kullan.</li><li>Uygulama tam ekran açılır; internet olmadan da çalışır.</li><li>Mikrofon ve çevrimdışı özellikler için sayfanın <strong>https</strong> üzerinden açılması gerekir.</li></ul>"
    },
    {
      "id": "ekrani-tani",
      "title": "Ekranı tanı",
      "html": "<p>YazNot'un arayüzü üç sade parçadan oluşur: solda bölümler, ortada not listen, yazarken de tam genişlikte editör.</p>\n<h3>Yan menü</h3>\n<ul><li>Üstte <strong>YazNot</strong> amblemi ve sürüm etiketi, yanında arama ve menüyü gizleme düğmeleri durur.</li><li><strong>Bölümler</strong> listesi: her bölüm kendi simgesi ve rengiyle görünür. Etkin bölüm vurgulanır.</li><li><strong>Yeni bölüm</strong>: listenin hemen altındadır.</li><li><strong>Paylaşımlar</strong> ve <strong>Geri dönüşüm</strong>: listenin altında, sayı rozetleriyle.</li><li>En altta senkron durumu, hesabın ve <strong>⋯</strong> düğmesi vardır. Yedek, istatistik, ayarlar ve gizli bölümler bu menünün içindedir.</li></ul>\n<h3>Bölüm ekranı</h3>\n<ul><li>Başlığın altında kaç not olduğu yazar.</li><li><strong>Yeni öğe</strong> birincil işlemdir; <strong>⋯</strong> menüsünde okuma, seçme, içe aktarma, Markdown dışa aktarma, bölümü düzenleme, gizleme ve silme bulunur.</li><li>Arama alanı yalnızca açtığın bölümde arar. Tüm notlarda aramak için <strong>Ctrl + K</strong> kullan ya da yan menüdeki büyütece bas.</li></ul>\n<h3>Editör</h3>\n<ul><li>Üstte geri düğmesi, not başlığı ve kelime sayısı; sağda mikrofon, odak modu ve <strong>⋯</strong> menüsü bulunur. PDF, TXT ve Markdown dışa aktarma bu menüdedir.</li><li>Başlık ve biçimlendirme çubuğu birlikte sabit kalır; notun aşağısına insen bile araç çubuğu elinin altındadır.</li><li>Mobilde araç çubuğu yana kaydırılabilir.</li></ul>"
    },
    {
      "id": "bolumler-ve-notlar",
      "title": "Bölümler ve notlar",
      "html": "<ul><li><strong>Düz liste</strong> bölümünde notlar alt alta durur; <strong>alt kategorili</strong> bölümde önce grupları, sonra grubun içindeki notları görürsün.</li><li>Bir bölüme <strong>emoji</strong>, <strong>renk</strong> ve <strong>görünüm</strong> (liste veya kart) seçebilirsin. Bölümü düzenlemek için <strong>⋯ → Bölümü düzenle</strong> yolunu kullan.</li><li>Bölümleri yan menüde <strong>sürükleyerek</strong> sıralayabilirsin.</li><li>Bir bölüme, gruba veya nota <strong>sağ tık</strong> (mobilde <strong>uzun basma</strong>) yapınca hızlı işlem menüsü açılır: yeniden adlandır, paylaş, gizle, sil.</li><li><strong>Gizle</strong> dediğin bölüm silinmez; <strong>⋯ → Gizli bölümler</strong> listesinden geri getirebilirsin (<code>Ctrl + Shift + H</code>).</li><li>Silinen her şey <strong>Geri dönüşüm</strong> kutusuna gider ve 30 gün bekler. Silme anında çıkan bildirimdeki <strong>Geri Al</strong> ile hemen geri alabilirsin.</li></ul>\n<h3>Toplu işlem</h3>\n<p>Bir bölümde <strong>⋯ → Seç</strong> de, notlara dokunarak seç. Alttaki çubuktan seçili notları <strong>taşı</strong>, <strong>dışa aktar</strong> (tek Markdown dosyası) veya <strong>sil</strong>. <code>Shift</code> ile aralık, <code>Ctrl + A</code> ile tümünü seçebilirsin.</p>"
    },
    {
      "id": "yazarken",
      "title": "Yazarken",
      "html": "<ul><li><strong>Biçimlendirme:</strong> başlık (H1–H3), kalın, italik, altı çizili, üstü çizili, vurgu, alıntı, madde/numaralı liste, bağlantı ve görsel.</li><li><strong>Görsel ekleme:</strong> araç çubuğundaki görsel düğmesini kullan, panodan yapıştır ya da dosyayı editöre sürükle. YazNot görseli kendisi küçültüp sıkıştırır.</li><li><strong>Odak modu:</strong> yalnızca sen ve yazın kalır. Editördeki hedef düğmesi veya <code>Ctrl + Shift + F</code>.</li><li><strong>Tema ve yazı ayarları:</strong> <strong>⋯ → Ayarlar</strong> altında koyu/açık tema, yazı boyutu, satır aralığı ve yazı alanı genişliği seçilebilir.</li><li><strong>Yazım denetimi:</strong> Ayarlar'dan açılıp kapatılabilir.</li><li><strong>Kelime ve süre:</strong> Başlığın altında kelime sayısı ve yaklaşık okuma süresi görünür.</li></ul>"
    },
    {
      "id": "sesten-metne",
      "title": "Sesten metne",
      "html": "<p>Yazmak istemediğin anlarda konuşmanı yazıya çevirebilirsin. Notun içindeyken araç çubuğundaki <strong>mikrofon</strong> düğmesine bas.</p>\n<ol><li><strong>İlk kullanım:</strong> Duyu-small modeli (~56 MB) bir kez indirilir ve cihazında kalır. Sonra internet olmadan da çalışır. <strong>Modeli sil</strong> ile yer açabilirsin.</li><li><strong>Kaydet:</strong> <strong>Kaydı başlat</strong>'a bas, konuş, <strong>Kaydı bitir</strong>'e bas (en fazla 2 dakika). Ya da <strong>Cihazından ses dosyası seç</strong> ile MP3, M4A, WAV, OGG veya WEBM bir dosya yükle (en fazla 5 dakika).</li><li><strong>Bekle:</strong> &quot;Ses işleniyor…&quot; ve &quot;Yazıya çevriliyor…&quot; ilerlemesi görünür.</li><li><strong>Kontrol et:</strong> Metni düzeltebilir, <strong>Kopyala</strong> ile panoya alabilirsin.</li><li><strong>Nota ekle</strong>'ye bas; metin imlecin olduğu yere eklenir.</li></ol>\n<ul><li><strong>Dil:</strong> Otomatik (Türkçe + İngilizce), Türkçe veya İngilizce. Seçim cihazda hatırlanır.</li><li><strong>Gizlilik:</strong> Ses ve metin cihazından dışarı çıkmaz. Yalnızca model dosyaları ilk seferde internetten indirilir.</li><li><strong>İpucu:</strong> Sessiz bir ortamda, mikrofona 20–30 cm mesafeden, normal hızda konuşmak sonucu belirgin şekilde iyileştirir.</li></ul>"
    },
    {
      "id": "ara-ve-oku",
      "title": "Ara ve oku",
      "html": "<ul><li><strong>Tüm notlarda ara:</strong> <code>Ctrl + K</code> (ya da yan menüdeki büyüteç). Yazdıkça başlık ve içerik eşleşmeleri listelenir; <code>↑</code> <code>↓</code> ile gez, <code>Enter</code> ile aç.</li><li><strong>Bölüm içinde ara:</strong> Bölüm başlığının altındaki arama alanı; <code>Ctrl + F</code> imleci oraya taşır.</li><li><strong>Kitap gibi oku:</strong> Bölüm veya grup menüsünden <strong>Oku</strong>'yu seç. Bölüm baştan sona tek sayfa hâlinde açılır; okuma yüzdesi üstte görünür. Aşağı kaydırınca üst bar gizlenir, dokununca geri gelir. <code>Esc</code> ile çıkılır.</li></ul>"
    },
    {
      "id": "disa-ve-ice-aktarma",
      "title": "Dışa ve içe aktarma",
      "html": "<h3>Dışa aktarma</h3>\n<p>Editörde <strong>⋯</strong> menüsünden notu <strong>PDF</strong>, <strong>TXT</strong> veya <strong>Markdown</strong> olarak kaydedebilirsin. Bölümün tamamını <strong>⋯ → Markdown olarak dışa aktar</strong> ile tek dosyada alabilirsin. Seçili notları toplu olarak Markdown'a aktarmak için seçim çubuğundaki <strong>Dışa aktar</strong>'ı kullan.</p>\n<table><thead><tr><th>Biçim</th><th>Ne zaman iyi?</th></tr></thead><tbody><tr><td>PDF</td><td>Yazdırılacak, paylaşılacak son hâl</td></tr><tr><td>TXT</td><td>Düz metin; her yerde açılır</td></tr><tr><td>Markdown</td><td>Başka bir not uygulamasına veya siteye taşırken</td></tr></tbody></table>\n<h3>İçe aktarma</h3>\n<p>Bölüm veya grup menüsünden <strong>İçe aktar…</strong> seç. Desteklenen biçimler:</p>\n<ul><li><strong>TXT:</strong> Düz metin olarak eklenir.</li><li><strong>Markdown (<code>.md</code>, <code>.markdown</code>):</strong> Başlıklar, listeler, kalın/italik, alıntı, bağlantı, kod ve tablolar korunarak zengin metne dönüştürülür. Ham HTML çalıştırılmaz; güvenlik için temizlenir.</li><li><strong>PDF:</strong> Metin katmanı okunur ve düz metin olarak aktarılır.</li></ul>\n<p>Aktarmadan önce bir önizleme penceresi açılır; başlığı düzenleyebilir ve onay verebilirsin. İçerik, açık olan bölüme ya da gruba yeni bir not olarak eklenir.</p>\n<h3>Yedek</h3>\n<p><strong>⋯ → Yedek oluştur</strong> tüm notlarını tek bir JSON dosyasına kaydeder. <strong>⋯ → Yedekten içe aktar</strong> ile iki yöntemden birini seçersin:</p>\n<ul><li><strong>Mevcut notların üzerine ekle:</strong> Var olan bölüm ve notların olduğu gibi kalır; yedektekiler ayrı bölümler olarak eklenir.</li><li><strong>Mevcut notları değiştir:</strong> Bu hesaptaki tüm bölüm ve notlar silinir, yalnızca yedekteki içerik kalır. Geri dönüşüm kutusu da boşaltılır.</li></ul>\n<p>Masaüstünde ayrıca her gün kendiliğinden yedek alınır; hesap başına son 7 kopya saklanır (<strong>⋯ → Ayarlar → Yedek Klasörü</strong>).</p>"
    },
    {
      "id": "paylasim",
      "title": "Paylaşım",
      "html": "<p>Bir bölümü, grubu veya notu e-posta adresiyle gönderebilirsin. Editördeki <strong>⋯ → Bu notu paylaş</strong>, bölüm menüsündeki <strong>Paylaş</strong> ya da sağ tık menüsündeki <strong>Paylaş</strong> ile başla. Alıcı, <strong>Paylaşımlar</strong> ekranının <strong>Gelen</strong> sekmesinde içeriği görür ve kabul edip kendi hesabına ekler.</p>"
    },
    {
      "id": "hesaplar",
      "title": "Hesaplar",
      "html": "<p>Aynı cihazda birden fazla hesabın açık kalabilir; aralarında geçerken e-posta kodu istemez.</p>\n<ul><li>Yan menünün altındaki <strong>hesap satırına</strong> dokun; açılan listede o cihazdaki hesapları görürsün. Etkin hesabın yanında <strong>✓</strong> vardır.</li><li><strong>Hesap Ekle</strong> ile yeni hesap gir. Mevcut hesabın oturumu kapanmaz.</li><li>Başka bir hesabın satırına dokununca uygulama o hesabın notlarıyla yeniden açılır.</li><li><strong>Bu Hesaptan Çıkış Yap</strong> yalnızca etkin hesabı kaldırır. Bir hesabı listeden tamamen kaldırmak için satırındaki <strong>×</strong> işaretini kullan.</li><li>Her hesabın notları, geri dönüşüm kutusu ve ayarları ayrıdır.</li></ul>"
    },
    {
      "id": "telefonda",
      "title": "Telefonda",
      "html": "<ul><li><strong>Menüyü açmak için</strong> ekranın sol kenarından parmağını sağa kaydır; kapatmak için sola kaydır veya karartılmış alana dokun. Sol üstteki menü düğmesi de aynı işi görür.</li><li><strong>Yazarken</strong> üstteki başlık ve araç çubuğu sabit kalır; araç çubuğunu yana kaydırarak tüm düğmelere ulaşırsın.</li><li><strong>Okurken</strong> aşağı kaydırırsan üst bar gizlenir; yazı tam ekrana yayılır. Geri getirmek için ekrana dokun.</li><li>Telefonu yan çevirebilirsin; yazı ve menüler çentiğe göre kendini ayarlar.</li><li>İnternet olmadan da açılır; notların cihazında durur.</li></ul>"
    },
    {
      "id": "klavye-kisayollari",
      "title": "Klavye kısayolları",
      "html": "<table><thead><tr><th>Kısayol</th><th>Ne yapar</th></tr></thead><tbody><tr><td>Ctrl + K</td><td>Tüm notlarda ara</td></tr><tr><td>Ctrl + S</td><td>Hemen kaydet</td></tr><tr><td>Ctrl + N</td><td>Yeni not</td></tr><tr><td>Ctrl + F</td><td>Açtığın listede ara</td></tr><tr><td>Ctrl + B / I / U</td><td>Kalın / italik / altı çizili</td></tr><tr><td>Ctrl + \\</td><td>Yan menüyü aç/kapat</td></tr><tr><td>Ctrl + Shift + F</td><td>Odak modu</td></tr><tr><td>Ctrl + Shift + H</td><td>Gizli bölümler</td></tr><tr><td>Ctrl + A</td><td>Seçim modunda tümünü seç</td></tr><tr><td>Shift + tık</td><td>Seçim modunda aralık seç</td></tr><tr><td>Esc</td><td>Açık pencereyi kapat / geri dön</td></tr></tbody></table>"
    },
    {
      "id": "sorun-giderme",
      "title": "Sorun giderme",
      "html": "<ul><li><strong>E-posta giriş kodu gelmiyor:</strong> Gereksiz/Spam klasörünü, ardından okul veya kurum posta sunucunun karantinasını kontrol et. Bazı kurumlar dış gönderenleri kendiliğinden engeller.</li><li><strong>Değişiklikler başka cihaza geçmiyor:</strong> Yan menüdeki senkron durumuna bak. &quot;bekliyor…&quot; yazıyorsa bağlantı gelince kendiliğinden gönderilir.</li><li><strong>Sesten metne modeli indirilemiyor:</strong> İnternet bağlantısını kontrol et. Kurumsal ağlar <code>huggingface.co</code> adresini engelliyor olabilir. İndirme yarıda kalırsa dosyalar doğrulanmadığı için yarım kopya saklanmaz; <strong>tekrar dene</strong> yeterlidir.</li><li><strong>Mikrofon izni:</strong> Tarayıcıda adres çubuğundaki kilit simgesinden mikrofon iznini aç. PWA'nın https üzerinden açılması gerekir.</li><li><strong>Yedekler nerede?</strong> Masaüstünde <strong>Ayarlar → Yedek Klasörü</strong>.</li></ul>"
    },
    {
      "id": "kilavuza-her-zaman-ulas",
      "title": "Kılavuza her zaman ulaş",
      "html": "<ul><li>Ekranın sağ altındaki küçük <strong>?</strong> düğmesi kılavuzu her an açar.</li><li>Yan menüdeki <strong>⋯ → Kullanım kılavuzu</strong> ve editördeki <strong>⋯ → Kullanım kılavuzu</strong> aynı pencereyi açar.</li><li>Kılavuz uygulamanın içinde geldiği için çevrimdışı da okunur.</li><li><strong>PDF olarak kaydet</strong> düğmesi kılavuzun yazdırılabilir sürümünü indirir.</li></ul>\n<p>Hepsi bu. Notların senin; istediğin cihazdan, istediğin zaman ulaşabilirsin.</p>"
    }
  ]
};
