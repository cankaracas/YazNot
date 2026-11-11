use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Önceki sürümün kullandığı klasörle aynı yeri kullanır
/// (%APPDATA%\YazNot). Böylece eski yedekler, görseller ve pencere durumu
/// taşınmadan yerinde kalır.
pub fn root(app: &AppHandle) -> PathBuf {
    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = app.path().home_dir() {
            let legacy = home.join(".config").join("YazNot");
            if legacy.is_dir() {
                return legacy;
            }
        }
    }
    app.path()
        .data_dir()
        .map(|dir| dir.join("YazNot"))
        .unwrap_or_else(|_| PathBuf::from("YazNot"))
}

pub struct Dirs {
    pub data: PathBuf,
    #[allow(dead_code)]
    pub images: PathBuf,
    pub backups: PathBuf,
}

pub fn ensure(app: &AppHandle) -> Result<Dirs, String> {
    let root = root(app);
    let data = root.join("data");
    let images = data.join("images");
    let backups = root.join("backups");
    for dir in [&root, &data, &images, &backups] {
        std::fs::create_dir_all(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    }
    Ok(Dirs {
        data,
        images,
        backups,
    })
}

/// Anahtar adları yalnızca güvenli karakterlerden oluşabilir (yol aşımı koruması).
pub fn safe_key(key: &str) -> Option<&str> {
    if key.is_empty() || key.len() > 64 {
        return None;
    }
    let valid = key
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-');
    if valid {
        Some(key)
    } else {
        None
    }
}

/// Dosya adı olarak kullanılabilecek hâle getirir (önceki sürümle aynı kural).
pub fn safe_file_name(name: &str, fallback: &str) -> String {
    let mut out = String::with_capacity(name.len());
    for ch in name.chars() {
        if matches!(ch, '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
            out.push('-');
        } else {
            out.push(ch);
        }
    }
    let trimmed = out.trim();
    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed.to_string()
    }
}
