/**
 * YazNot — arayüz dili.
 *
 * Türkçe varsayılan dildir. İngilizce seçildiğinde, arayüzdeki bilinen metinler
 * çalışma anında çevrilir. Kullanıcı içeriği (not başlıkları, gövde, paylaşım
 * metinleri) hiçbir zaman çevrilmez.
 */
(function () {
  'use strict';

  var LANG_KEY = 'yaznot_lang';

  function detectLang() {
    var stored = null;
    try { stored = localStorage.getItem(LANG_KEY); } catch (e) {}
    if (stored === 'tr' || stored === 'en') return stored;
    var browser = String(navigator.language || 'tr').toLowerCase();
    return browser.indexOf('tr') === 0 ? 'tr' : 'en';
  }

  var lang = detectLang();
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;

  var EN = {
    // ---------- shell ----------
    "Bölümler": "Sections",
    "Yeni bölüm": "New section",
    "Paylaşımlar": "Shares",
    "Geri dönüşüm": "Trash",
    "Senkronize": "Synced",
    "Hesap Ekle": "Add account",
    "Bu Hesaptan Çıkış Yap": "Sign out of this account",
    "Veri": "Data",
    "Yedek oluştur": "Create backup",
    "Yedekten içe aktar": "Restore from backup",
    "Gizli bölümler": "Hidden sections",
    "İstatistikler": "Statistics",
    "Ayarlar": "Settings",
    "Kullanım kılavuzu": "User guide",
    "Henüz bölüm yok": "No sections yet",
    "İlk bölümünü oluşturarak başla. İstediğin kadar bölüm ekleyebilir, her birini ayrı isimlendirebilirsin.": "Start by creating your first section. Add as many as you like and give each its own name.",
    "+ İlk Bölümünü Oluştur": "+ Create your first section",
    "Bölüm": "Section",
    "Grup": "Group",
    "Not": "Note",
    "Yeni öğe": "New item",
    "Seç": "Select",
    "İçe aktar": "Import",
    "Dışa aktar": "Export",
    "Markdown olarak dışa aktar": "Export as Markdown",
    "Bölümü düzenle": "Edit section",
    "Bölümü gizle": "Hide section",
    "Bölümü sil": "Delete section",
    "Grubu sil": "Delete group",
    "Paylaş": "Share",
    "Bu notu paylaş": "Share this note",
    "Başlık": "Title",
    "Kaydedildi": "Saved",
    "Kitap": "Reader",
    "Kapat": "Close",
    "İptal": "Cancel",
    "Vazgeç": "Cancel",
    "Kaydet": "Save",
    "Tamam": "Done",
    "Sil": "Delete",
    "Geri yükle": "Restore",
    "Taşı": "Move",
    "Geri": "Back",
    "Ara": "Search",
    "Göster": "Show",
    "Gizle": "Hide",
    "Oku": "Read",
    "Yeniden Adlandır": "Rename",
    "Geri Dönüşüme Taşı": "Move to trash",
    "Kalıcı olarak sil": "Delete permanently",
    "Emin misin? Sil": "Are you sure? Delete",
    "Bu işlem geri alınamaz.": "This cannot be undone.",
    "DİKKAT": "WARNING",
    "Hata:": "Error:",
    "Yükleniyor…": "Loading…",
    "Kaydediliyor…": "Saving…",
    "Hazır": "Ready",
    "İşleniyor…": "Processing…",
    "Bağlantı kuruluyor": "Connecting",
    "Çevrimdışı": "Offline",
    "Bekliyor…": "Waiting…",
    "Bekliyor": "Pending",
    "Kabul edildi": "Accepted",
    "Reddedildi": "Declined",
    "Değişiklikler bekliyor": "Changes waiting",
    "Geri Al": "Undo",
    "Bildirimi kapat": "Dismiss notification",
    "İşlem iptal edildi.": "Cancelled.",
    "İşlem tamamlanamadı. Lütfen tekrar dene.": "Could not complete. Please try again.",
    "Bölüm bulunamadı.": "Section not found.",
    "Grup bulunamadı.": "Group not found.",
    "Hedef bölüm bulunamadı.": "Target section not found.",
    "Hedef grup bulunamadı.": "Target group not found.",
    "Hesap bulunamadı.": "Account not found.",
    "Bölüm işlemleri": "Section actions",
    "Grup işlemleri": "Group actions",
    "Not işlemleri": "Note actions",
    "Bölümü Geri Dönüşüme Taşı": "Move section to trash",
    "Bölümü Yeniden Adlandır": "Rename section",
    "Grubu Geri Dönüşüme Taşı": "Move group to trash",
    "Grubu Yeniden Adlandır": "Rename group",
    "Düz Yap (grupları kaldır)": "Flatten (remove groups)",
    "Görünüm Tipi Değiştir": "Change view type",
    "Bu bölümde ara": "Search this section",
    "Bu grupta ara": "Search this group",
    "Yeni Grup": "New group",
    "Yeni Öğe": "New item",
    "Grup adı": "Group name",
    "Bölüm adı": "Section name",
    "Düz Liste": "Flat list",
    "Doğrudan not tut. Tek kademe.": "Write notes directly. One level.",
    "Alt Kategorili": "Grouped",
    "Gruplar aç, içine not yaz. İki kademe.": "Create groups and write notes inside. Two levels.",
    "Görünüm": "Layout",
    "Liste": "List",
    "Alt alta satırlar": "Rows",
    "Izgara görünümü": "Grid",
    "Simge (Emoji)": "Icon (emoji)",
    "Renk": "Colour",
    "Biçimlendirme": "Formatting",
    "Bağlantı ekle": "Add link",
    "Bağlantı Ekle": "Add link",
    "Görsel": "Image",
    "Alıntı": "Quote",
    "Büyük başlık": "Heading 1",
    "Alt başlık": "Subheading",
    "Kalın (Ctrl+B)": "Bold (Ctrl+B)",
    "İtalik (Ctrl+I)": "Italic (Ctrl+I)",
    "Altı çizili (Ctrl+U)": "Underline (Ctrl+U)",
    "Üstü çizili": "Strikethrough",
    "Vurgula": "Highlight",
    "Madde listesi": "Bulleted list",
    "Numaralı liste": "Numbered list",
    "Biçimi temizle": "Clear formatting",
    "Geri al (Ctrl+Z)": "Undo (Ctrl+Z)",
    "Yinele (Ctrl+Y)": "Redo (Ctrl+Y)",
    "Odak modu": "Focus mode",
    "Sesle yaz": "Voice input",
    "Yeni not (Ctrl+N)": "New note (Ctrl+N)",
    "Daha fazla": "More",
    "Kenar çubuğunu gizle": "Hide sidebar",
    "Kenar çubuğunu gizle (Ctrl+\\)": "Hide sidebar (Ctrl+\\)",
    "Menüyü göster": "Show menu",
    "Menüyü göster (Ctrl+\\)": "Show menu (Ctrl+\\)",
    "Hızlı arama": "Quick search",
    "Kılavuz": "Guide",
    "Kılavuz konuları": "Guide topics",
    "Kaydı başlat": "Start recording",
    "Kaydı bitir": "Stop recording",
    "Dosyadan seç": "Choose file",
    "Cihazından ses dosyası seç": "Choose an audio file from your device",
    "Kopyala": "Copy",
    "Nota ekle": "Add to note",
    "Metin kopyalandı": "Text copied",
    "Kopyalanamadı": "Could not copy",

    // ---------- auth ----------
    "Notlarına her cihazdan erişmek için giriş yap": "Sign in to reach your notes from any device.",
    "Google ile giriş yap": "Continue with Google",
    "veya": "or",
    "E-posta adresin": "Your email",
    "Giriş kodu gönder": "Send sign-in code",
    "Kod gelmiyorsa Gereksiz/Spam ve karantina klasörlerini kontrol et.": "If the code does not arrive, check Spam and your quarantine folder.",
    "E-postandaki giriş kodu": "The code in your email",
    "Doğrula ve giriş yap": "Verify and sign in",
    "Farklı e-posta kullan": "Use a different email",
    "Giriş başarılı, yükleniyor...": "Signed in, loading...",
    "Google açılıyor...": "Opening Google...",
    "Google ile giriş yapılıyor...": "Signing in with Google...",
    "Giriş iptal edildi": "Sign-in cancelled",
    "E-posta adresi geçersiz görünüyor. Adresi kontrol et.": "That email looks invalid. Check the address.",
    "Geçerli bir e-posta adresi gir.": "Enter a valid email address.",
    "Geçerli bir e-posta gir.": "Enter a valid email.",
    "Bağlantını kontrol et.": "Check your connection.",
    "Çok sık kod istedin. Güvenlik için": "You requested codes too often. For security,",
    "Kod geçersiz veya süresi dolmuş. Yeni kod isteyip tekrar dene.": "The code is invalid or has expired. Request a new code and try again.",
    "Bu adrese e-posta gönderim izni yok. Yöneticinin Supabase panelinde özel SMTP yapılandırması gerekiyor.": "Sending email to this address is not allowed. The administrator needs to configure custom SMTP in Supabase.",
    "E-posta ile giriş şu anda kapalı. Google ile giriş yapmayı dene.": "Email sign-in is currently off. Try signing in with Google.",
    "Hesap ekleme bu sürümde kullanılamıyor.": "Adding accounts is not available in this version.",
    "Mevcut oturumun açık kalacak. Eklemek istediğin hesabın e-postasını gir.": "Your current session stays open. Enter the email of the account you want to add.",
    "Bu hesabın oturumu bulunamadı. Yeniden giriş yapman gerekiyor.": "This account's session was not found. Please sign in again.",
    "Bu hesapta mevcut bölüm yok. Yedekteki": "This account has no sections yet. The backup's",
    "Bu hesaptaki tüm bölüm ve notlar silinip yedekteki içerik yüklenecek. Devam edilsin mi?": "All sections and notes in this account will be deleted and the backup will be loaded. Continue?",
    "Bu hesaptan çıkış yapılsın mı?": "Sign out of this account?",
    "Bu hesabı bu cihazdan kaldır": "Remove this account from this device",
    "Bu cihazda kayıtlı hesap yok.": "No account is stored on this device.",
    "Hesap değiştiriliyor": "Switching account",
    "Hesap değiştirilemedi": "Could not switch account",
    "Hesap kaldırılamadı": "Could not remove account",
    "Hesap bu cihazdan kaldırıldı": "Account removed from this device",
    "Hesap eklendi, yükleniyor...": "Account added, loading...",
    "Bu cihazdaki diğer hesaplar açık kalır. Notların güvende; aynı hesapla tekrar giriş yapınca geri gelir.": "Other accounts on this device stay open. Your notes are safe; sign in again to bring them back.",
    "bu cihazdan kaldırılsın mı?": "be removed from this device?",
    "Bu hesap": "This account",

    // ---------- settings ----------
    "Tema": "Theme",
    "Koyu": "Dark",
    "Gece yazımı": "Night writing",
    "Açık": "Light",
    "Gündüz yazımı": "Day writing",
    "Yazı Boyutu": "Font size",
    "Satır Aralığı": "Line spacing",
    "Yazı Alanı Genişliği": "Writing width",
    "Dar": "Narrow",
    "Normal": "Normal",
    "Geniş": "Wide",
    "Yazım Denetimi": "Spell check",
    "Yazarken yazım hatalarını işaretle": "Mark spelling mistakes while writing",
    "Yedek Klasörü": "Backup folder",
    "Yedek klasörü": "Backup folder",
    "Dil": "Language",
    "Türkçe": "Turkish",
    "İngilizce": "English",
    "Otomatik": "Auto",
    "Dil: Otomatik (Türkçe + İngilizce)": "Language: Auto (Turkish + English)",
    "Dil: Türkçe": "Language: Turkish",
    "Dil: İngilizce": "Language: English",

    // ---------- trash ----------
    "Geri Dönüşüm Kutusu": "Trash",
    "Silinen notlar burada 30 gün bekler, sonra kalıcı olarak silinir.": "Deleted notes stay here for 30 days, then are permanently deleted.",
    "Tümünü Boşalt": "Empty all",
    "Geri dönüşüm kutusu boşaltıldı": "Trash emptied",
    "Geri dönüşüm kutusunu boşalt": "Empty trash",
    "Geri dönüşüm kutusu boş.": "Trash is empty.",
    "Sildiğin notlar 30 gün boyunca burada görünür.": "Deleted notes appear here for 30 days.",
    "30 gün içinde geri yükleyebilirsin.": "You can restore within 30 days.",
    "Bu işlem geri alınamaz; 30 günlük bekleme süresi atlanır.": "This cannot be undone; the 30-day wait is skipped.",
    "Kalıcı silme": "Permanent delete",
    "Bölüm geri dönüşüme taşındı": "Section moved to trash",
    "Grup geri dönüşüme taşındı": "Group moved to trash",
    "Not geri dönüşüme taşındı": "Note moved to trash",
    "not geri dönüşüme taşındı": "note moved to trash",
    "Geri yüklendi.": "Restored.",
    "not geri yüklendi": "note restored",
    "geri dönüşüm kaydı": "trash entry",

    // ---------- shares ----------
    "İçerik Paylaş": "Share content",
    "Alıcının e-posta adresi": "Recipient email",
    "Not (isteğe bağlı)": "Note (optional)",
    "Bir not ekle…": "Add a note…",
    "Gönder": "Send",
    "Gönderiliyor...": "Sending...",
    "Paylaşım gönderildi ✔": "Share sent ✔",
    "Gelen": "Incoming",
    "Gönderilen": "Sent",
    "Henüz paylaşım yok.": "No shares yet.",
    "Paylaşımlar yüklenemedi.": "Could not load shares.",
    "Gelen ve gönderilen paylaşımlar": "Incoming and sent shares",
    "Gönderen:": "From:",
    "Alıcı:": "To:",
    "Kabul et": "Accept",
    "Reddet": "Decline",
    "Reddedildi.": "Declined.",
    "İçerik okunamadı.": "Could not read the content.",
    "İnternet bağlantısı gerekli. Tekrar dene.": "Internet connection required. Try again.",
    "Paylaşım": "Share",

    // ---------- import / export / restore ----------
    "İçe Aktarma Önizleme": "Import preview",
    "TXT, Markdown veya PDF dosyasından içerik aktarabilirsin. Markdown biçimi (başlık, liste, kalın yazı) korunur.": "Import from a TXT, Markdown or PDF file. Markdown formatting (headings, lists, bold) is preserved.",
    "İçerik önizleme": "Content preview",
    "İçeri Aktar": "Import",
    "İçe aktarılıyor…": "Importing…",
    "Markdown biçimi korunarak aktarılacak.": "Markdown formatting will be preserved.",
    "PDF metni düz metin olarak aktarılacak.": "PDF text will be imported as plain text.",
    "Yedekten İçe Aktar": "Restore from backup",
    "İçe aktarma yöntemi": "Restore method",
    "Mevcut notların üzerine ekle": "Add to existing notes",
    "Mevcut notları değiştir": "Replace existing notes",
    "Üzerine Ekle": "Add",
    "Mevcut Verileri Sil ve Yükle": "Delete existing data and restore",
    "Mevcut Notları Değiştir": "Replace existing notes",
    "Mevcut notların üzerine ekle": "Add to existing notes",
    "Mevcut notları değiştir": "Replace existing notes",
    "Bu hesaptaki tüm bölüm ve notlar silinip yedekteki içerik yüklenecek. Devam edilsin mi?": "All sections and notes in this account will be deleted and the backup will be loaded. Continue?",
    "JSON yedeğini içe aktar": "Import a JSON backup",
    "Yedekten geri yükle": "Restore from backup",
    "PDF olarak dışa aktar": "Export as PDF",
    "TXT olarak dışa aktar": "Export as TXT",
    "Markdown Olarak Dışa Aktar": "Export as Markdown",
    "Dışa aktarılamadı:": "Could not export:",
    "İçe aktarılamadı:": "Could not import:",
    "İçe aktarma için önce giriş yapmalısın.": "Sign in first to import.",
    "Dosya çok büyük (en fazla 200 MB).": "File too large (max 200 MB).",
    "Desteklenmeyen dosya türü.": "Unsupported file type.",
    "Bu PDF'de çıkarılabilir metin bulunamadı (taranmış görüntü olabilir).": "No extractable text in this PDF (it may be a scan).",
    "PDF okunamadı:": "Could not read the PDF:",
    "PDF okunuyor…": "Reading PDF…",
    "PDF kitaplığı yüklenemedi.": "Could not load the PDF library.",
    "İçe Aktarılan Bölüm": "Imported section",
    "Bu yedekte içe aktarılacak bölüm bulunamadı.": "No sections found in this backup.",
    "Geçersiz yedek dosyası.": "Invalid backup file.",
    "Gecersiz yedek:": "Invalid backup:",
    "Yedek dosyası okunamadı.": "Could not read the backup file.",
    "Bu dosya bir YazNot yedeği değil.": "This is not a YazNot backup.",

    // ---------- statistics ----------
    "Toplam not": "Total notes",
    "Toplam kelime": "Total words",
    "Kelime": "Words",
    "Karakter": "Characters",
    "Görsel": "Images",
    "Toplam okuma": "Total reading",
    "Gizli bölüm": "Hidden sections",
    "Son düzenleme:": "Last edited:",
    "Bu hafta": "This week",
    "Okuma süresi": "Reading time",

    // ---------- STT ----------
    "Sesten metne": "Speech to text",
    "Sesin cihazında yazıya çevrilir; kayıt hiçbir sunucuya gönderilmez.": "Your voice is transcribed on your device; audio is never sent to a server.",
    "Duyu-small ses tanıma modeli": "Duyu-small speech model",
    "Türkçe + İngilizce · cihazda çalışır · tek seferlik indirme": "Turkish + English · on-device · one-time download",
    "Model yalnızca ilk kullanımda indirilir, sonra cihazda kalır.": "The model downloads on first use, then stays on your device.",
    "İndirdikten sonra internet olmadan da çalışır.": "Works offline after download.",
    "Modeli sil": "Delete model",
    "Modeli indir": "Download model",
    "İndiriliyor…": "Downloading…",
    "Model cihazda saklanır.": "The model is stored on your device.",
    "Model cihazda yüklü": "Model installed",
    "Model dosyası bulunamadı:": "Model file not found:",
    "Model indi ama ses motoru başlatılamadı:": "The model downloaded but the speech engine could not start:",
    "Kayıt hazırlanıyor…": "Preparing recording…",
    "Kayıt boş görünüyor, tekrar dene.": "The recording seems empty. Try again.",
    "Kayıt çok kısa; en az birkaç kelime söyle.": "The recording is too short; say at least a few words.",
    "Kayıt sırasında hata oluştu.": "An error occurred while recording.",
    "Ses işleniyor…": "Processing audio…",
    "Yazıya çevriliyor…": "Transcribing…",
    "En fazla 2 dakika kayıt alınabilir.": "Up to 2 minutes can be recorded.",
    "Bu ses dosyası okunamadı. MP3, M4A, WAV veya OGG formatlarından birini dene.": "Could not read this audio file. Try MP3, M4A, WAV or OGG.",
    "Bu tarayıcı ses kaydını desteklemiyor. “Dosyadan seç” ile bir ses dosyası yükleyebilirsin.": "This browser does not support recording. Use “Choose file” to upload audio.",
    "Bu tarayıcı/cihaz ses tanımayı desteklemiyor (WebAssembly SIMD gerekli).": "This browser/device does not support speech recognition (WebAssembly SIMD required).",
    "Bu tarayıcı/ortam ses tanımayı desteklemiyor (WebAssembly veya Worker yok).": "This browser/environment does not support speech recognition (no WebAssembly or Worker).",
    "Mikrofon izni verilmedi. Tarayıcı/uygulama ayarlarından YazNot için mikrofon iznini aç.": "Microphone permission was not granted. Allow microphone access for YazNot in your browser/app settings.",
    "Mikrofona erişilemiyor. Uygulamayı https üzerinden veya masaüstü uygulamasında aç.": "Cannot access the microphone. Open the app over https or in the desktop app.",
    "Mikrofon başka bir uygulama tarafından kullanılıyor.": "The microphone is being used by another app.",
    "Cihazda mikrofon bulunamadı.": "No microphone found.",
    "Cihazda yeterli bellek yok. Diğer uygulamaları kapatıp tekrar dene.": "Not enough memory. Close other apps and try again.",
    "Cihazda yeterli bellek yok. Diğer uygulamaları kapatıp daha kısa bir kayıtla tekrar dene.": "Not enough memory. Close other apps and try a shorter recording.",
    "Mikrofon açılamadı:": "Could not open the microphone:",
    "Mikrofon için güvenli bağlantı (https) gerekiyor.": "The microphone requires a secure (https) connection.",
    "Kayıt başlatılamadı.": "Could not start recording.",
    "Metin hazır; gözden geçirip nota ekleyebilirsin.": "Text is ready; review it and add it to the note.",
    "Sesin": "Your voice",
    "cihazında": "on your device",
    "yazıya çevrilir; kayıt hiçbir sunucuya gönderilmez.": "is transcribed; audio is never sent to a server.",

    // ---------- guide ----------
    "YazNot 1.0 · her şeyi adım adım anlatır": "YazNot 1.0 · everything, step by step",
    "YazNot 1.0'a hoş geldin.": "Welcome to YazNot 1.0.",
    "Kılavuz bir kez açıldı; dilediğin zaman sağ alttaki": "The guide opened once; you can reopen it any time from the",
    "düğmesinden yeniden okuyabilirsin.": "button at the bottom right.",
    "Kılavuz çevrimdışı da okunur.": "The guide also works offline.",
    "PDF olarak kaydet": "Save PDF (Turkish)",
    "Anladım": "Got it",
    "Kılavuz hazırlanıyor": "Guide is being prepared",
    "Bu sürümde kılavuz içeriği bulunamadı. PDF dosyasını indirerek okuyabilirsin.": "Guide content was not found in this version. You can download the PDF.",
    "PDF kaydetme bu ortamda kullanılamıyor.": "Saving the PDF is unavailable in this environment.",
    "Kılavuza her zaman ulaş": "Open the guide any time",

    // ---------- reader / misc ----------
    "Henüz öğe yok.": "No items yet.",
    "Henüz düzenlenmiş bir not yok.": "No edited notes yet.",
    "Burada henüz öğe yok. Yukarıdaki “+ Yeni Öğe” butonuna tıklayarak başlayın.": "No items here yet. Use “+ New item” above to start.",
    "Bu bölümde henüz grup yok. Yukarıdaki “+ Yeni Grup” butonuna tıklayarak başlayın.": "No groups in this section yet. Use “+ New group” above to start.",
    "Bu grupta henüz öğe yok. Yukarıdaki “+ Yeni Öğe” butonuna tıklayarak başlayın.": "No items in this group yet. Use “+ New item” above to start.",
    "Aramanızla eşleşen öğe bulunamadı.": "No items match your search.",
    "Sonuç bulunamadı.": "No results.",
    "(Bu öğe henüz yazılmamış.)": "(This item has not been written yet.)",
    "Şu an gizli bölüm yok.": "No hidden sections right now.",
    "Bu pencere yalnızca senin ekranında görünür. Kapatınca hiçbir iz kalmaz.": "This window is visible only on your screen. Nothing remains when you close it.",
    "Gizli Bölümler": "Hidden sections",
    "Notları Taşı": "Move notes",
    "Hedef bölüm / grup": "Target section / group",
    "Tümünü seç": "Select all",
    "0 not seçildi": "0 selected",
    "Henüz düzenlenmiş bir not yok.": "No edited notes yet.",
    "Başlıksız": "Untitled",
    "Başlıksız not": "Untitled note",
    "Bölümü Düzenle": "Edit section",
    "Başlığı Yeniden Adlandır": "Rename title",
    "Bölüme dön": "Back to section",
    "Bu bölümde ara": "Search this section",
    "İçinde ara": "Search inside",
    "içinde ara": "search inside",
    "Hızlı arama": "Quick search",
    "Tüm notlarda ara": "Search all notes",
    "açık": "open",
    "kapat": "close",
    "Aç": "Open",
    "Görsel ekle": "Add image",
    "Bağlantı adresi": "Link address",
    "Bağlantı metni": "Link text",
    "Görsel adresi": "Image URL",
    "Görsel açıklaması": "Alt text",
    "Notun başlığı": "Note title",
    "Yazmaya başla...": "Start writing...",
    "Ara...": "Search...",
    "Kod": "Code",
    "Yeni Bölüm": "New section",
    "Yeni bölüm adı": "New section name",
    "Bölümü düzenle": "Edit section",
    "Bölümü Gizle": "Hide section",
    "Bölümü Sil": "Delete section",
    "Grubu Gizle": "Hide group",
    "Grubu Sil": "Delete group",
    "Notu Sil": "Delete note",
    "Notu Paylaş": "Share note",
    "Notu Taşı": "Move note",
    "Bu notu sil": "Delete this note",
    "Silmek istediğine emin misin?": "Are you sure you want to delete?",
    "Geri Dönüşüm": "Trash",
    "Geri Dönüşüm Kutusu": "Trash",
    "Çıkış Yap": "Sign out",
    "Hesabı kaldır": "Remove account",
    "Hesabı bu cihazdan kaldır": "Remove account from this device",
    "Hesaplar arasında geçiş yap": "Switch between accounts",
    "Bu cihazdaki hesaplar": "Accounts on this device",
    "Hesap": "Account",
    "E-posta": "Email",
    "E-posta adresi": "Email address",
    "Giriş yap": "Sign in",
    "Çıkış": "Sign out",
    "Oturum": "Session",
    "Bağlantı hatası": "Connection error",
    "Bağlantı kurulamadı": "Could not connect",
    "Tekrar dene": "Try again",
    "Yeniden dene": "Try again",
    "Kapat (Esc)": "Close (Esc)",
    "Kapat": "Close",
    "Tamam": "Done",
    "Evet": "Yes",
    "Hayır": "No",
    "not": "note",
    "öğe": "item",
    "bölüm": "section",
    "grup": "group",
    "kelime": "word",
    "karakter": "character",
    "görsel": "image",
    "gün": "day",
    "kopya": "copy",
    "dk": "min",
    "sn": "sec",

    "Uygulama": "App",
    "● Model hazır": "● Model ready",
    "gez ·": "navigate ·",
    "aç ·": "open ·",
    "Yapı": "Structure",
    "Yazı Boyutu —": "Font size —",
    "Satır Aralığı —": "Line spacing —",
    "İçe aktar…": "Import…",
    "Otomatik yedekleme yalnızca masaüstü uygulamasında çalışır.": "Automatic backup only runs in the desktop app.",
    "Şu anki bölüm ve notların olduğu gibi kalır. Yedekteki bölümler ayrı bölümler olarak ayrıca eklenir.": "Your current sections and notes stay as they are. The backup's sections are added as separate sections.",
    "Bu hesaptaki tüm bölüm ve notlar silinir; yalnızca yedekteki içerik kalır. Geri dönüşüm kutusu da boşaltılır.": "All sections and notes in this account are deleted; only the backup remains. The trash is emptied too.",
    "Sesten Metne": "Speech to Text",
    "İstediğin zaman bu penceredeki": "You can free up space any time with",
    "ile yer açabilirsin.": "in this window.",
    "Model hazır": "Model ready",
    "Hazırlanıyor…": "Preparing…",
    "Yazıya çevrilen metin": "Transcribed text",
    "(düzenleyebilirsin)": "(you can edit it)",
    "Bu pencere yalnızca senin ekranında görünür. Kapatınca hiçbir iz kalmaz.": "This window is visible only on your screen. Nothing remains when you close it.",
    "Geri Dönüşüm": "Trash",
    "Sesten metne": "Speech to text",
    "Metin hazır; gözden geçirip nota ekleyebilirsin.": "Text is ready; review it and add it to the note.",
    "Modeli sil": "Delete model",
    "Modeli indir": "Download model",
    "Dosyadan seç": "Choose file",
    "Kaydı başlat": "Start recording",
    "Kaydı bitir": "Stop recording",
    "Kopyala": "Copy",
    "Nota ekle": "Add to note",
    "İndiriliyor…": "Downloading…",
    "Vazgeç": "Cancel"
  };

  // Exact strings in attributes (titles, placeholders, aria-labels).
  var ATTR = {
    "Sil": "Delete",
    "Kapat": "Close",
    "Kapat (Esc)": "Close (Esc)",
    "Yeni not (Ctrl+N)": "New note (Ctrl+N)",
    "Yeni öğe": "New item",
    "Daha fazla": "More",
    "Paylaş": "Share",
    "Geri": "Back",
    "Geri (Esc)": "Back (Esc)",
    "Kılavuz": "Guide",
    "Kullanım kılavuzu": "User guide",
    "Kenar çubuğunu gizle": "Hide sidebar",
    "Menüyü göster": "Show menu",
    "Odak modu": "Focus mode",
    "Sesle yaz": "Voice input",
    "Hızlı arama": "Quick search",
    "Ara": "Search",
    "Ara...": "Search...",
    "Başlık": "Title",
    "Bölüm adı": "Section name",
    "Grup adı": "Group name",
    "Notun başlığı": "Note title",
    "Yazmaya başla...": "Start writing...",
    "Bir not ekle…": "Add a note…",
    "Kod": "Code",
    "ornek@example.com": "name@example.com",
    "Bağlantı adresi": "Link address",
    "Bağlantı metni": "Link text",
    "Görsel adresi": "Image URL",
    "Görsel açıklaması": "Alt text",
    "Kalın (Ctrl+B)": "Bold (Ctrl+B)",
    "İtalik (Ctrl+I)": "Italic (Ctrl+I)",
    "Altı çizili (Ctrl+U)": "Underline (Ctrl+U)",
    "Üstü çizili": "Strikethrough",
    "Vurgula": "Highlight",
    "Büyük başlık": "Heading 1",
    "Alt başlık": "Subheading",
    "Alıntı": "Quote",
    "Madde listesi": "Bulleted list",
    "Numaralı liste": "Numbered list",
    "Bağlantı ekle": "Add link",
    "Görsel ekle": "Add image",
    "Biçimi temizle": "Clear formatting",
    "Geri al (Ctrl+Z)": "Undo (Ctrl+Z)",
    "Yinele (Ctrl+Y)": "Redo (Ctrl+Y)",
    "Türkçe": "Turkish",
    "İngilizce": "English",
    "Otomatik": "Auto",
    "Vazgeç": "Cancel",
    "Bildirimi kapat": "Dismiss notification",
    "Yedek Klasörü": "Backup folder",
    "Yeniden adlandır": "Rename"
  };

  var SKIP = [
    '.editor-content', '.reader-content', '.reader-body', '.reader-chapter',
    '.reader-book-title', '.note-title', '.item-title', '.item-preview',
    '.book-card-title', '.trash-title', '.nav-btn[data-section-id]',
    '.section-title', '.group-title', '.confirm-subject', '.account-email',
    '.account-name', '.share-card-title', '.share-card-meta', '.share-preview',
    '.share-summary', '.palette-item-title', '.palette-item-sub', '.search-hit',
    '.stt-transcript', '.stt-raw', '.editor-title', '.import-preview',
    '.guide-body', '.guide-toc', '.modal-input', '.title-input', '[data-i18n-skip]',
    '.rename-input', '[contenteditable="true"]'
  ].join(',');

  function isSkipped(el) {
    return !el || !el.closest || !!el.closest(SKIP);
  }

  function plural(n, one, many) {
    return n === '1' ? one : many;
  }

  var EN_NORMALIZED = null;
  function normalize(value) {
    return String(value)
      .replace(/[“”„]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
  function lookup(value) {
    if (!EN_NORMALIZED) {
      EN_NORMALIZED = {};
      Object.keys(EN).forEach(function (key) { EN_NORMALIZED[normalize(key)] = EN[key]; });
    }
    return EN[value] || EN_NORMALIZED[normalize(value)];
  }

  function translateUnits(text) {
    return text
      .replace(/Otomatik yedek: son alınma /g, 'Automatic backup: last ')
      .replace(/Otomatik yedek: ilk kopya birazdan alınacak/g, 'Automatic backup: the first copy is coming soon')
      .replace(/günlük, son 7 kopya tutulur\./g, 'daily, the last 7 copies are kept.')
      .replace(/Son düzenleme: /g, 'Last edited: ')
      .replace(/(\d+)\s+bekliyor…/g, '$1 pending…')
      .replace(/(\d+)\s+min okuma/g, '$1 min read')
      .replace(/(\d[\d.,]*)\s+not seçildi/g, function (_, n) { return n + ' selected'; })
      .replace(/(\d[\d.,]*)\s+not\b/g, function (_, n) { return n + ' ' + plural(n, 'note', 'notes'); })
      .replace(/(\d[\d.,]*)\s+öğe\b/g, function (_, n) { return n + ' ' + plural(n, 'item', 'items'); })
      .replace(/(\d[\d.,]*)\s+bölüm\b/g, function (_, n) { return n + ' ' + plural(n, 'section', 'sections'); })
      .replace(/(\d[\d.,]*)\s+grup\b/g, function (_, n) { return n + ' ' + plural(n, 'group', 'groups'); })
      .replace(/(\d[\d.,]*)\s+kelime\b/g, function (_, n) { return n + ' ' + plural(n, 'word', 'words'); })
      .replace(/(\d[\d.,]*)\s+karakter\b/g, function (_, n) { return n + ' ' + plural(n, 'character', 'characters'); })
      .replace(/(\d[\d.,]*)\s+görsel\b/g, function (_, n) { return n + ' ' + plural(n, 'image', 'images'); })
      .replace(/(\d[\d.,]*)\s+gün\b/g, function (_, n) { return n + ' ' + plural(n, 'day', 'days'); })
      .replace(/(\d[\d.,]*)\s+kopya\b/g, function (_, n) { return n + ' ' + plural(n, 'copy', 'copies'); })
      .replace(/(\d[\d.,]*)\s+dk\b/g, function (_, n) { return n + ' min'; })
      .replace(/(\d[\d.,]*)\s+sn\b/g, function (_, n) { return n + ' sec'; });
  }

  function translateText(value) {
    if (!value) return value;
    var text = String(value);
    var trimmed = text.trim();
    if (!trimmed) return text;
    var match = lookup(trimmed);
    if (match) return text.replace(trimmed, match);
    var units = translateUnits(trimmed);
    if (units !== trimmed) return text.replace(trimmed, units);
    return text;
  }

  function translateAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    ['title', 'placeholder', 'aria-label', 'alt'].forEach(function (name) {
      var value = el.getAttribute(name);
      if (!value) return;
      var trimmed = value.trim();
      var next = ATTR[trimmed] || lookup(trimmed);
      if (next && next !== trimmed) el.setAttribute(name, value.replace(trimmed, next));
    });
  }

  function translateNode(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      var parent = node.parentElement;
      if (!parent || isSkipped(parent)) return;
      var tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return;
      var next = translateText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== 1) return;
    translateAttrs(node);
    for (var i = 0; i < node.childNodes.length; i++) translateNode(node.childNodes[i]);
  }

  var observer = null;
  function start() {
    if (lang !== 'en' || observer || !document.body) return;
    translateNode(document.body);
    observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var record = records[i];
        for (var j = 0; j < record.addedNodes.length; j++) translateNode(record.addedNodes[j]);
        if (record.type === 'characterData') translateNode(record.target);
        if (record.type === 'attributes') translateAttrs(record.target);
      }
    });
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label', 'alt']
    });
  }

  function setLang(next) {
    if (next !== 'en' && next !== 'tr') return;
    try { localStorage.setItem(LANG_KEY, next); } catch (e) {}
    location.reload();
  }

  function markLanguageButtons() {
    document.querySelectorAll('[data-set-lang]').forEach(function (button) {
      var active = button.getAttribute('data-set-lang') === lang;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.classList.toggle('active', active);
    });
  }

  function bindLanguageButtons() {
    document.querySelectorAll('[data-set-lang]').forEach(function (button) {
      if (button.dataset.langBound === '1') return;
      button.dataset.langBound = '1';
      button.addEventListener('click', function () {
        setLang(button.getAttribute('data-set-lang'));
      });
    });
    markLanguageButtons();
  }

  window.YazNotI18n = {
    lang: function () { return lang; },
    locale: function () { return lang === 'en' ? 'en-US' : 'tr-TR'; },
    t: function (value) { return lang === 'en' ? translateText(value) : value; },
    setLang: setLang,
    apply: function () { bindLanguageButtons(); start(); }
  };

  if (lang === 'en') {
    ['alert', 'confirm', 'prompt'].forEach(function (name) {
      var native = window[name];
      if (typeof native !== 'function') return;
      window[name] = function (message) {
        var args = Array.prototype.slice.call(arguments);
        if (args.length) args[0] = translateText(String(args[0]));
        return native.apply(window, args);
      };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bindLanguageButtons();
      start();
    });
  } else {
    bindLanguageButtons();
    start();
  }
})();
