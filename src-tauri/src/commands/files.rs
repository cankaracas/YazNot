use tauri::{AppHandle, Url, WebviewWindow};

use crate::commands::{require_main, save_dialog};
use crate::paths;
use crate::results::{SaveResult, SimpleResult};

const GUIDE_PDF: &[u8] = include_bytes!("../../../ui/yaznot-kullanim-kilavuzu.pdf");
const GUIDE_PDF_EN: &[u8] = include_bytes!("../../../ui/yaznot-user-guide.pdf");

#[tauri::command(async)]
pub fn save_text_file(
    app: AppHandle,
    window: WebviewWindow,
    title: String,
    text: String,
    ext: String,
) -> SaveResult {
    if let Err(err) = require_main(&window) {
        return SaveResult::error(err);
    }
    let ext = match ext.as_str() {
        "md" => "md",
        "html" => "html",
        _ => "txt",
    };
    let filter_name = match ext {
        "md" => "Markdown",
        "html" => "HTML",
        _ => "Metin Dosyası",
    };
    let dialog_title = match ext {
        "md" => "Markdown Olarak Dışa Aktar",
        "html" => "HTML Olarak Dışa Aktar",
        _ => "TXT Olarak Dışa Aktar",
    };
    let file_name = format!("{}.{ext}", paths::safe_file_name(&title, "belge"));

    let Some(path) = save_dialog(&app, dialog_title, &file_name, filter_name, &[ext]) else {
        return SaveResult::canceled();
    };

    // BOM: Windows Not Defteri Türkçe karakterleri doğru göstersin.
    match std::fs::write(&path, format!("\u{FEFF}{text}")) {
        Ok(()) => SaveResult::ok(&path),
        Err(err) => SaveResult::error(err.to_string()),
    }
}

/// Kılavuz PDF'i uygulamanın içinden kopyalanır; internet gerekmez.
#[tauri::command(async)]
pub fn save_guide_pdf(
    app: AppHandle,
    window: WebviewWindow,
    lang: Option<String>,
) -> SaveResult {
    if let Err(err) = require_main(&window) {
        return SaveResult::error(err);
    }
    let english = lang.as_deref() == Some("en");
    let (bytes, title, file_name): (&[u8], &str, &str) = if english {
        (GUIDE_PDF_EN, "Save the user guide", "YazNot-User-Guide.pdf")
    } else {
        (GUIDE_PDF, "Kullanım Kılavuzunu Kaydet", "YazNot-Kullanim-Kilavuzu.pdf")
    };
    let Some(path) = save_dialog(&app, title, file_name, "PDF", &["pdf"]) else {
        return SaveResult::canceled();
    };
    match std::fs::write(&path, bytes) {
        Ok(()) => SaveResult::ok(&path),
        Err(err) => SaveResult::error(err.to_string()),
    }
}

#[tauri::command(async)]
pub fn open_external(window: WebviewWindow, url: String) -> SimpleResult {
    if let Err(err) = require_main(&window) {
        return SimpleResult { ok: false, error: Some(err) };
    }
    let Ok(parsed) = Url::parse(&url) else {
        return SimpleResult {
            ok: false,
            error: Some("Geçersiz bağlantı".into()),
        };
    };
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return SimpleResult {
            ok: false,
            error: Some("Yalnızca http/https bağlantıları açılabilir".into()),
        };
    }
    if parsed.host_str().is_none() {
        return SimpleResult {
            ok: false,
            error: Some("Geçersiz bağlantı".into()),
        };
    }
    match open::that_detached(parsed.as_str()) {
        Ok(()) => SimpleResult {
            ok: true,
            error: None,
        },
        Err(err) => SimpleResult {
            ok: false,
            error: Some(err.to_string()),
        },
    }
}

#[tauri::command(async)]
pub fn open_backups_folder(app: AppHandle, window: WebviewWindow) -> SimpleResult {
    if let Err(err) = require_main(&window) {
        return SimpleResult { ok: false, error: Some(err) };
    }
    let dirs = match paths::ensure(&app) {
        Ok(dirs) => dirs,
        Err(err) => {
            return SimpleResult {
                ok: false,
                error: Some(err),
            }
        }
    };
    match open::that_detached(&dirs.backups) {
        Ok(()) => SimpleResult {
            ok: true,
            error: None,
        },
        Err(err) => SimpleResult {
            ok: false,
            error: Some(err.to_string()),
        },
    }
}

#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmOptions {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub detail: String,
    #[serde(default)]
    pub confirm_label: String,
}

#[tauri::command(async)]
pub fn confirm(app: AppHandle, window: WebviewWindow, opts: ConfirmOptions) -> bool {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

    if require_main(&window).is_err() {
        return false;
    }

    let title = if opts.title.is_empty() {
        "Onay"
    } else {
        &opts.title
    };
    let confirm_label = if opts.confirm_label.is_empty() {
        "Onayla"
    } else {
        &opts.confirm_label
    };
    let mut message = opts.message;
    if !opts.detail.is_empty() {
        message.push_str("\n\n");
        message.push_str(&opts.detail);
    }

    app.dialog()
        .message(message)
        .title(title)
        .buttons(MessageDialogButtons::OkCancelCustom(
            confirm_label.to_string(),
            "İptal".to_string(),
        ))
        .blocking_show()
}
