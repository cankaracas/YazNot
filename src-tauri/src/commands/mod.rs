pub mod backup;
pub mod data;
pub mod files;
pub mod images;
pub mod oauth;
pub mod pdf;

use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

pub fn save_dialog(
    app: &AppHandle,
    title: &str,
    file_name: &str,
    filter_name: &str,
    extensions: &[&str],
) -> Option<PathBuf> {
    // Otomasyon: diyalog yerine sabit klasöre yaz (yalnızca test ortamında).
    if let Ok(dir) = std::env::var("YAZNOT_TEST_DIR") {
        let dir = PathBuf::from(dir);
        let _ = std::fs::create_dir_all(&dir);
        return Some(dir.join(file_name));
    }
    app.dialog()
        .file()
        .set_title(title)
        .set_file_name(file_name)
        .add_filter(filter_name, extensions)
        .blocking_save_file()
        .and_then(|path| path.into_path().ok())
}

pub fn open_dialog(app: &AppHandle, title: &str, filters: &[(&str, &[&str])]) -> Option<PathBuf> {
    // Otomasyon: diyalog yerine sabit dosyayı döndür (yalnızca test ortamında).
    if let Ok(path) = std::env::var("YAZNOT_TEST_OPEN") {
        return Some(PathBuf::from(path));
    }
    let mut dialog = app.dialog().file().set_title(title);
    for (name, extensions) in filters {
        dialog = dialog.add_filter(*name, extensions);
    }
    dialog
        .blocking_pick_file()
        .and_then(|path| path.into_path().ok())
}
