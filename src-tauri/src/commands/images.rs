use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::AppHandle;

use crate::commands::open_dialog;
use crate::results::PickImageResult;

const MAX_IMAGE_BYTES: u64 = 30 * 1024 * 1024;

const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "jpe", "jfif", "gif", "webp", "bmp", "svg", "ico", "avif", "tif", "tiff",
];

#[tauri::command(async)]
pub fn pick_image(app: AppHandle) -> PickImageResult {
    let Some(path) = open_dialog(
        &app,
        "Resim Seç",
        &[("Resimler", IMAGE_EXTENSIONS), ("Tüm Dosyalar", &["*"])],
    ) else {
        return PickImageResult {
            ok: false,
            canceled: Some(true),
            ..Default::default()
        };
    };

    let meta = match std::fs::metadata(&path) {
        Ok(meta) => meta,
        Err(err) => {
            return PickImageResult {
                ok: false,
                error: Some(err.to_string()),
                ..Default::default()
            }
        }
    };
    if meta.len() > MAX_IMAGE_BYTES {
        return PickImageResult {
            ok: false,
            error: Some("Dosya çok büyük (maks 30 MB)".into()),
            ..Default::default()
        };
    }

    let bytes = match std::fs::read(&path) {
        Ok(bytes) => bytes,
        Err(err) => {
            return PickImageResult {
                ok: false,
                error: Some(err.to_string()),
                ..Default::default()
            }
        }
    };

    let ext = path
        .extension()
        .map(|value| value.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let ext = match ext.as_str() {
        "jpeg" | "jpe" | "jfif" => "jpg",
        other => other,
    };
    let mime_ext = match ext {
        "jpg" => "jpeg",
        "svg" => "svg+xml",
        "ico" => "x-icon",
        "tif" => "tiff",
        other => other,
    };
    if mime_ext.is_empty() {
        return PickImageResult {
            ok: false,
            error: Some("Desteklenmeyen dosya türü".into()),
            ..Default::default()
        };
    }

    PickImageResult {
        ok: true,
        data_url: Some(format!(
            "data:image/{mime_ext};base64,{}",
            STANDARD.encode(bytes)
        )),
        ..Default::default()
    }
}
