# YazNot

YazNot, Windows ve web için bulut senkronlu bir not alma ve yazma uygulamasıdır.
Masaüstü sürümü **Tauri 2 + Rust**, telefon sürümü aynı arayüzden üretilen bir
**PWA**'dır.

Notlar **bölüm → grup → not** yapısında tutulur. Veriler önce cihaza yazılır,
ardından kendi Supabase projenize senkronize edilir. Sesten metne özelliği
cihazda çalışır; ses hiçbir sunucuya gönderilmez.

> Arayüz Türkçedir. Ayrıntılı İngilizce dokümantasyon için [README.md](README.md)
> dosyasına bakın.

## Öne çıkanlar

- Bölüm, grup ve not yapısı; emoji, renk ve liste/kart görünümü
- Zengin metin editörü; görsel ekleme, otomatik boyutlandırma
- `Ctrl+K` ile tüm notlarda arama, kitap okuma görünümü
- PDF, TXT ve Markdown içe/dışa aktarma
- Cihazda Türkçe/İngilizce sesten metne (model ilk kullanımda indirilir)
- Çevrimdışı çalışma ve bağlantı gelince otomatik senkron
- Çoklu hesap, geri dönüşüm kutusu, toplu işlem, otomatik yedek
- Koyu/açık tema, odak modu, yazı tipi ve satır aralığı ayarları
- Uygulama içi kullanım kılavuzu

## Hızlı başlangıç

```bash
git clone <depo-adresi>
cd yaznot
npm ci
npm run setup
npm run dev
```

`ui/config.js` dosyasına kendi Supabase projenizin adresini ve **publishable**
anahtarını yazın. Tablo kurulumu ve RLS politikaları için
[docs/SUPABASE.md](docs/SUPABASE.md) dosyasına bakın.

## Derleme

```bash
npm run build          # Windows kurulum paketi
npm run build:vercel   # yayına hazır vercel/ klasörü
npm test               # testler
```

## Belgeler

- [Mimari](docs/ARCHITECTURE.md)
- [Geliştirme](docs/DEVELOPMENT.md)
- [Supabase kurulumu](docs/SUPABASE.md)
- [Gizlilik](docs/PRIVACY.md)
- [Sesten metne](docs/STT.md)
- [Kullanım kılavuzu](docs/USER-GUIDE.tr.md)
- [Teşekkür](ACKNOWLEDGEMENTS.md)
- [Güvenlik politikası](SECURITY.md)

## Teşekkür

Sesten metne, **Kaan Aydınlı**'nın geliştirdiği ve Apache-2.0 lisansıyla
paylaştığı [Duyu-small](https://huggingface.co/KaanAydinli/Duyu-small) modeliyle
çalışır. Model cihazda çalışır; ses dışarı çıkmaz.

Tauri, ONNX Runtime, PDF.js ve Supabase ekiplerine; kodunu, modelini ve emeğini
açıkça paylaşan bütün geliştiricilere teşekkürler. Ayrıntılar:
[ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).

## Lisans

[MIT](LICENSE)
