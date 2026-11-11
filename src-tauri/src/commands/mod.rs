pub mod backup;
pub mod data;
pub mod files;
pub mod images;
pub mod oauth;
pub mod pdf;

use std::path::PathBuf;
use tauri::{AppHandle, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

/// Uygulama komutları yalnızca ana arayüzden çağrılabilir.
///
/// Google/PDF gibi yardımcı pencereler dış (remote) sayfalar yükleyebildiği
/// için, bu pencerelerden dosya okuma/yazma veya onay atlama girişimlerini
/// kabul etmiyoruz. Ayrıca capabilities dosyasında da bu pencerelere izin
/// verilmiyor.
pub fn require_main(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == "main" {
        Ok(())
    } else {
        Err("Bu işlem yalnızca ana pencereden kullanılabilir.".into())
    }
}

pub fn save_dialog(
    app: &AppHandle,
    title: &str,
    file_name: &str,
    filter_name: &str,
    extensions: &[&str],
) -> Option<PathBuf> {
    app.dialog()
        .file()
        .set_title(title)
        .set_file_name(file_name)
        .add_filter(filter_name, extensions)
        .blocking_save_file()
        .and_then(|path| path.into_path().ok())
}

pub fn open_dialog(app: &AppHandle, title: &str, filters: &[(&str, &[&str])]) -> Option<PathBuf> {
    let mut dialog = app.dialog().file().set_title(title);
    for (name, extensions) in filters {
        dialog = dialog.add_filter(*name, extensions);
    }
    dialog
        .blocking_pick_file()
        .and_then(|path| path.into_path().ok())
}
