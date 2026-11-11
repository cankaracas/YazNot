# YazNot 1.0 — Kullanım Kılavuzu

YazNot, notlarını yazdığın her yerde yanında taşıyan sade bir defter. Telefonda,
bilgisayarda ve tablette açılır; aynı hesapla girdiğin sürece notların her cihazda
aynı görünür. İnternet yokken de yazabilirsin, bağlantı gelince kendiliğinden
eşitlenir.

Bu kılavuzu her zaman uygulamanın sağ alt köşesindeki **?** düğmesinden
açabilirsin. Aynı kılavuzun PDF sürümü de yanında durur; **PDF olarak kaydet**
düğmesiyle indirebilirsin.

---

## İlk adım

1. Google hesabınla ya da e-postana gelen tek kullanımlık kodla giriş yap.
2. **Yeni bölüm** düğmesiyle ilk bölümünü oluştur; adını, simgesini ve rengini seç.
3. Sağ üstteki **Yeni öğe** düğmesiyle ilk notunu aç ve yazmaya başla.

Notlar kendiliğinden kaydedilir. Yazarken "kaydettim mi?" diye düşünmen gerekmez;
başlığın altındaki durum yazısı sana ne olduğunu söyler.

### Masaüstüne kurulum

- Windows için indirme sayfasındaki **YazNot'u indir** düğmesini kullan. Kurulum
  dosyası `YazNot-Setup-1.0.0.exe` adıyla gelir.
- Windows ilk açılışta "tanınmayan uygulama" uyarısı gösterebilir:
  **Daha fazla bilgi → Yine de çalıştır** ile devam edebilirsin.
- Kurulumdan sonra YazNot masaüstünde ve başlat menüsünde görünür.

### Telefona kurulum (PWA)

- Android'de Chrome menüsünden **Uygulamayı yükle**, iPhone'da Safari'de
  **Paylaş → Ana Ekrana Ekle** seçeneğini kullan.
- Uygulama tam ekran açılır; internet olmadan da çalışır.
- Mikrofon ve çevrimdışı özellikler için sayfanın **https** üzerinden açılması
  gerekir.

---

## Ekranı tanı

YazNot'un arayüzü üç sade parçadan oluşur: solda bölümler, ortada not listen,
yazarken de tam genişlikte editör.

### Yan menü

- Üstte **YazNot** amblemi ve sürüm etiketi, yanında arama ve menüyü gizleme
  düğmeleri durur.
- **Bölümler** listesi: her bölüm kendi simgesi ve rengiyle görünür. Etkin bölüm
  vurgulanır.
- **Yeni bölüm**: listenin hemen altındadır.
- **Paylaşımlar** ve **Geri dönüşüm**: listenin altında, sayı rozetleriyle.
- En altta senkron durumu, hesabın ve **⋯** düğmesi vardır. Yedek, istatistik,
  ayarlar ve gizli bölümler bu menünün içindedir.

### Bölüm ekranı

- Başlığın altında kaç not olduğu yazar.
- **Yeni öğe** birincil işlemdir; **⋯** menüsünde okuma, seçme, içe aktarma,
  Markdown dışa aktarma, bölümü düzenleme, gizleme ve silme bulunur.
- Arama alanı yalnızca açtığın bölümde arar. Tüm notlarda aramak için
  **Ctrl + K** kullan ya da yan menüdeki büyütece bas.

### Editör

- Üstte geri düğmesi, not başlığı ve kelime sayısı; sağda mikrofon, odak modu ve
  **⋯** menüsü bulunur. PDF, TXT ve Markdown dışa aktarma bu menüdedir.
- Başlık ve biçimlendirme çubuğu birlikte sabit kalır; notun aşağısına insen bile
  araç çubuğu elinin altındadır.
- Mobilde araç çubuğu yana kaydırılabilir.

---

## Bölümler ve notlar

- **Düz liste** bölümünde notlar alt alta durur; **alt kategorili** bölümde önce
  grupları, sonra grubun içindeki notları görürsün.
- Bir bölüme **emoji**, **renk** ve **görünüm** (liste veya kart) seçebilirsin.
  Bölümü düzenlemek için **⋯ → Bölümü düzenle** yolunu kullan.
- Bölümleri yan menüde **sürükleyerek** sıralayabilirsin.
- Bir bölüme, gruba veya nota **sağ tık** (mobilde **uzun basma**) yapınca hızlı
  işlem menüsü açılır: yeniden adlandır, paylaş, gizle, sil.
- **Gizle** dediğin bölüm silinmez; **⋯ → Gizli bölümler** listesinden geri
  getirebilirsin (`Ctrl + Shift + H`).
- Silinen her şey **Geri dönüşüm** kutusuna gider ve 30 gün bekler. Silme anında
  çıkan bildirimdeki **Geri Al** ile hemen geri alabilirsin.

### Toplu işlem

Bir bölümde **⋯ → Seç** de, notlara dokunarak seç. Alttaki çubuktan seçili
notları **taşı**, **dışa aktar** (tek Markdown dosyası) veya **sil**. `Shift`
ile aralık, `Ctrl + A` ile tümünü seçebilirsin.

---

## Yazarken

- **Biçimlendirme:** başlık (H1–H3), kalın, italik, altı çizili, üstü çizili,
  vurgu, alıntı, madde/numaralı liste, bağlantı ve görsel.
- **Görsel ekleme:** araç çubuğundaki görsel düğmesini kullan, panodan yapıştır
  ya da dosyayı editöre sürükle. YazNot görseli kendisi küçültüp sıkıştırır.
- **Odak modu:** yalnızca sen ve yazın kalır. Editördeki hedef düğmesi veya
  `Ctrl + Shift + F`.
- **Tema ve yazı ayarları:** **⋯ → Ayarlar** altında koyu/açık tema, yazı boyutu,
  satır aralığı ve yazı alanı genişliği seçilebilir.
- **Yazım denetimi:** Ayarlar'dan açılıp kapatılabilir.
- **Kelime ve süre:** Başlığın altında kelime sayısı ve yaklaşık okuma süresi görünür.

---

## Sesten metne

Yazmak istemediğin anlarda konuşmanı yazıya çevirebilirsin. Notun içindeyken
araç çubuğundaki **mikrofon** düğmesine bas.

1. **İlk kullanım:** Duyu-small modeli (~56 MB) bir kez indirilir ve cihazında
   kalır. Sonra internet olmadan da çalışır. **Modeli sil** ile yer açabilirsin.
2. **Kaydet:** **Kaydı başlat**'a bas, konuş, **Kaydı bitir**'e bas (en fazla 2
   dakika). Ya da **Cihazından ses dosyası seç** ile MP3, M4A, WAV, OGG veya WEBM
   bir dosya yükle (en fazla 5 dakika).
3. **Bekle:** "Ses işleniyor…" ve "Yazıya çevriliyor…" ilerlemesi görünür.
4. **Kontrol et:** Metni düzeltebilir, **Kopyala** ile panoya alabilirsin.
5. **Nota ekle**'ye bas; metin imlecin olduğu yere eklenir.

- **Dil:** Otomatik (Türkçe + İngilizce), Türkçe veya İngilizce. Seçim cihazda
  hatırlanır.
- **Gizlilik:** Ses ve metin cihazından dışarı çıkmaz. Yalnızca model dosyaları
  ilk seferde internetten indirilir.
- **İpucu:** Sessiz bir ortamda, mikrofona 20–30 cm mesafeden, normal hızda
  konuşmak sonucu belirgin şekilde iyileştirir.

---

## Ara ve oku

- **Tüm notlarda ara:** `Ctrl + K` (ya da yan menüdeki büyüteç). Yazdıkça
  başlık ve içerik eşleşmeleri listelenir; `↑` `↓` ile gez, `Enter` ile aç.
- **Bölüm içinde ara:** Bölüm başlığının altındaki arama alanı; `Ctrl + F` imleci
  oraya taşır.
- **Kitap gibi oku:** Bölüm veya grup menüsünden **Oku**'yu seç. Bölüm baştan sona
  tek sayfa hâlinde açılır; okuma yüzdesi üstte görünür. Aşağı kaydırınca üst bar
  gizlenir, dokununca geri gelir. `Esc` ile çıkılır.

---

## Dışa ve içe aktarma

### Dışa aktarma

Editörde **⋯** menüsünden notu **PDF**, **TXT** veya **Markdown** olarak
kaydedebilirsin. Bölümün tamamını **⋯ → Markdown olarak dışa aktar** ile tek
dosyada alabilirsin. Seçili notları toplu olarak Markdown'a aktarmak için seçim
çubuğundaki **Dışa aktar**'ı kullan.

| Biçim    | Ne zaman iyi?                                          |
| -------- | ------------------------------------------------------ |
| PDF      | Yazdırılacak, paylaşılacak son hâl                       |
| TXT      | Düz metin; her yerde açılır                             |
| Markdown | Başka bir not uygulamasına veya siteye taşırken         |

### İçe aktarma

Bölüm veya grup menüsünden **İçe aktar…** seç. Desteklenen biçimler:

- **TXT:** Düz metin olarak eklenir.
- **Markdown (`.md`, `.markdown`):** Başlıklar, listeler, kalın/italik, alıntı,
  bağlantı, kod ve tablolar korunarak zengin metne dönüştürülür. Ham HTML
  çalıştırılmaz; güvenlik için temizlenir.
- **PDF:** Metin katmanı okunur ve düz metin olarak aktarılır.

Aktarmadan önce bir önizleme penceresi açılır; başlığı düzenleyebilir ve onay
verebilirsin. İçerik, açık olan bölüme ya da gruba yeni bir not olarak eklenir.

### Yedek

**⋯ → Yedek oluştur** tüm notlarını tek bir JSON dosyasına kaydeder.
**⋯ → Yedekten içe aktar** ile iki yöntemden birini seçersin:

- **Mevcut notların üzerine ekle:** Var olan bölüm ve notların olduğu gibi kalır;
  yedektekiler ayrı bölümler olarak eklenir.
- **Mevcut notları değiştir:** Bu hesaptaki tüm bölüm ve notlar silinir, yalnızca
  yedekteki içerik kalır. Geri dönüşüm kutusu da boşaltılır.

Masaüstünde ayrıca her gün kendiliğinden yedek alınır; hesap başına son 7 kopya
saklanır (**⋯ → Ayarlar → Yedek Klasörü**).

---

## Paylaşım

Bir bölümü, grubu veya notu e-posta adresiyle gönderebilirsin. Editördeki
**⋯ → Bu notu paylaş**, bölüm menüsündeki **Paylaş** ya da sağ tık menüsündeki
**Paylaş** ile başla. Alıcı, **Paylaşımlar** ekranının **Gelen** sekmesinde
içeriği görür ve kabul edip kendi hesabına ekler.

---

## Hesaplar

Aynı cihazda birden fazla hesabın açık kalabilir; aralarında geçerken e-posta
kodu istemez.

- Yan menünün altındaki **hesap satırına** dokun; açılan listede o cihazdaki
  hesapları görürsün. Etkin hesabın yanında **✓** vardır.
- **Hesap Ekle** ile yeni hesap gir. Mevcut hesabın oturumu kapanmaz.
- Başka bir hesabın satırına dokununca uygulama o hesabın notlarıyla yeniden
  açılır.
- **Bu Hesaptan Çıkış Yap** yalnızca etkin hesabı kaldırır. Bir hesabı listeden
  tamamen kaldırmak için satırındaki **×** işaretini kullan.
- Her hesabın notları, geri dönüşüm kutusu ve ayarları ayrıdır.

---

## Telefonda

- **Menüyü açmak için** ekranın sol kenarından parmağını sağa kaydır; kapatmak
  için sola kaydır veya karartılmış alana dokun. Sol üstteki menü düğmesi de
  aynı işi görür.
- **Yazarken** üstteki başlık ve araç çubuğu sabit kalır; araç çubuğunu yana
  kaydırarak tüm düğmelere ulaşırsın.
- **Okurken** aşağı kaydırırsan üst bar gizlenir; yazı tam ekrana yayılır. Geri
  getirmek için ekrana dokun.
- Telefonu yan çevirebilirsin; yazı ve menüler çentiğe göre kendini ayarlar.
- İnternet olmadan da açılır; notların cihazında durur.

---

## Klavye kısayolları

| Kısayol          | Ne yapar                        |
| ---------------- | ------------------------------- |
| Ctrl + K         | Tüm notlarda ara                |
| Ctrl + S         | Hemen kaydet                    |
| Ctrl + N         | Yeni not                        |
| Ctrl + F         | Açtığın listede ara             |
| Ctrl + B / I / U | Kalın / italik / altı çizili    |
| Ctrl + \         | Yan menüyü aç/kapat             |
| Ctrl + Shift + F | Odak modu                       |
| Ctrl + Shift + H | Gizli bölümler                  |
| Ctrl + A         | Seçim modunda tümünü seç        |
| Shift + tık      | Seçim modunda aralık seç        |
| Esc              | Açık pencereyi kapat / geri dön |

---

## Sorun giderme

- **E-posta giriş kodu gelmiyor:** Gereksiz/Spam klasörünü, ardından okul veya
  kurum posta sunucunun karantinasını kontrol et. Bazı kurumlar dış gönderenleri
  kendiliğinden engeller.
- **Değişiklikler başka cihaza geçmiyor:** Yan menüdeki senkron durumuna bak.
  "bekliyor…" yazıyorsa bağlantı gelince kendiliğinden gönderilir.
- **Sesten metne modeli indirilemiyor:** İnternet bağlantısını kontrol et.
  Kurumsal ağlar `huggingface.co` adresini engelliyor olabilir. İndirme yarıda
  kalırsa dosyalar doğrulanmadığı için yarım kopya saklanmaz; **tekrar dene**
  yeterlidir.
- **Mikrofon izni:** Tarayıcıda adres çubuğundaki kilit simgesinden mikrofon
  iznini aç. PWA'nın https üzerinden açılması gerekir.
- **Yedekler nerede?** Masaüstünde **Ayarlar → Yedek Klasörü**.

---

## Kılavuza her zaman ulaş

- Ekranın sağ altındaki küçük **?** düğmesi kılavuzu her an açar.
- Yan menüdeki **⋯ → Kullanım kılavuzu** ve editördeki **⋯ → Kullanım kılavuzu**
  aynı pencereyi açar.
- Kılavuz uygulamanın içinde geldiği için çevrimdışı da okunur.
- **PDF olarak kaydet** düğmesi kılavuzun yazdırılabilir sürümünü indirir.

Hepsi bu. Notların senin; istediğin cihazdan, istediğin zaman ulaşabilirsin.
