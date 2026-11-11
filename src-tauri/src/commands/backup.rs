use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Manager, WebviewWindow};

use crate::commands::{open_dialog, require_main, save_dialog};
use crate::paths;
use crate::results::{AutoBackupResult, ImportResult, SaveResult};
use crate::utc;

const KEEP_COPIES: usize = 7;
const AUTO_PREFIX: &str = "yaznot-oto-";
const USER_PREFIX: &str = "yaznot-yedek-";
const MAX_BACKUP_BYTES: u64 = 80 * 1024 * 1024;

#[tauri::command(async)]
pub fn export_backup(app: AppHandle, window: WebviewWindow, payload: Value) -> SaveResult {
    if let Err(err) = require_main(&window) {
        return SaveResult::error(err);
    }
    let file_name = format!("{USER_PREFIX}{}.json", utc::file_stamp(&utc::now()));
    let Some(path) = save_dialog(&app, "Yedek Oluştur", &file_name, "YazNot Yedek", &["json"]) else {
        return SaveResult::canceled();
    };
    let body = match serde_json::to_string_pretty(&payload) {
        Ok(body) => body,
        Err(err) => return SaveResult::error(err.to_string()),
    };
    match std::fs::write(&path, body) {
        Ok(()) => SaveResult::ok(&path),
        Err(err) => SaveResult::error(err.to_string()),
    }
}

/// Yedek dosyasını açar. `path` verilirse diyalog gösterilmez (bulunan yedek).
#[tauri::command(async)]
pub fn import_backup(
    app: AppHandle,
    window: WebviewWindow,
    path: Option<String>,
) -> ImportResult {
    if let Err(err) = require_main(&window) {
        return ImportResult {
            ok: false,
            error: Some(err),
            ..Default::default()
        };
    }

    let selected = match path {
        Some(path) => {
            let path = PathBuf::from(path);
            if !is_allowed_backup_path(&app, &path) {
                return ImportResult {
                    ok: false,
                    error: Some("Bu dosya bir YazNot yedeği değil.".into()),
                    ..Default::default()
                };
            }
            path
        }
        None => match open_dialog(&app, "Yedekten Geri Yükle", &[("YazNot Yedek", &["json"])]) {
            Some(path) => path,
            None => return ImportResult { ok: false, canceled: Some(true), ..Default::default() },
        },
    };

    if !is_plausible_backup_file(&selected) {
        return ImportResult {
            ok: false,
            error: Some("Yedek dosyası okunamadı.".into()),
            ..Default::default()
        };
    }

    let raw = match std::fs::read_to_string(&selected) {
        Ok(raw) => raw,
        Err(err) => {
            return ImportResult { ok: false, error: Some(err.to_string()), ..Default::default() }
        }
    };
    let raw = raw.trim_start_matches('\u{FEFF}');
    match serde_json::from_str::<Value>(raw) {
        Ok(data) => ImportResult {
            ok: true,
            data: Some(data),
            file_name: selected.file_name().map(|name| name.to_string_lossy().to_string()),
            ..Default::default()
        },
        Err(err) => ImportResult {
            ok: false,
            error: Some(format!("Geçersiz yedek dosyası: {err}")),
            ..Default::default()
        },
    }
}

/// Günlük otomatik yedek; hesap başına son 7 kopya tutulur.
#[tauri::command(async)]
pub fn auto_backup(app: AppHandle, window: WebviewWindow, payload: Value) -> AutoBackupResult {
    if let Err(err) = require_main(&window) {
        return AutoBackupResult { ok: false, error: Some(err), ..Default::default() };
    }
    let dirs = match paths::ensure(&app) {
        Ok(dirs) => dirs,
        Err(err) => return AutoBackupResult { ok: false, error: Some(err), ..Default::default() },
    };

    let raw_uid = payload.get("account_uid").and_then(Value::as_str).unwrap_or_default();
    let uid = sanitize_uid(raw_uid);
    let day = utc::day(&utc::now());
    let file_name = match &uid {
        Some(uid) => format!("{AUTO_PREFIX}{uid}-{day}.json"),
        None => format!("{AUTO_PREFIX}{day}.json"),
    };
    let file_path = dirs.backups.join(&file_name);

    let body = serde_json::to_string(&payload).unwrap_or_else(|_| "{}".into());
    if let Err(err) = std::fs::write(&file_path, body) {
        return AutoBackupResult { ok: false, error: Some(err.to_string()), ..Default::default() };
    }

    let mut files: Vec<String> = std::fs::read_dir(&dirs.backups)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|entry| entry.file_name().to_str().map(str::to_string))
        .filter(|name| is_auto_backup(name, uid.as_deref()))
        .collect();
    files.sort();

    while files.len() > KEEP_COPIES {
        let oldest = files.remove(0);
        let _ = std::fs::remove_file(dirs.backups.join(oldest));
    }

    AutoBackupResult {
        ok: true,
        file_path: Some(file_path.display().to_string()),
        count: Some(files.len()),
        ..Default::default()
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: u64,
    pub kind: &'static str,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FoundBackups {
    pub ok: bool,
    pub backups: Vec<BackupFile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Kullanıcının bilgisayarında duran YazNot yedeklerini bulur.
///
/// İlk kurulumda (hesap henüz boşken) eski sürümden kalan bir yedeği tek tıkla
/// geri yükleyebilmek için kullanılır. İndirilenler, Masaüstü ve uygulamanın
/// kendi yedek klasörü taranır; yalnızca içinde `sections` olan dosyalar sayılır.
#[tauri::command(async)]
pub fn find_backups(app: AppHandle, window: WebviewWindow) -> FoundBackups {
    if let Err(err) = require_main(&window) {
        return FoundBackups {
            ok: false,
            error: Some(err),
            ..Default::default()
        };
    }
    let mut backups = Vec::new();

    if let Ok(downloads) = app.path().download_dir() {
        collect(&downloads, "backup", &mut backups);
    }
    if let Ok(desktop) = app.path().desktop_dir() {
        collect(&desktop, "backup", &mut backups);
    }
    collect(&paths::root(&app).join("backups"), "auto", &mut backups);

    backups.sort_by(|a, b| b.modified.cmp(&a.modified));
    backups.dedup_by(|a, b| a.path == b.path);
    backups.truncate(5);
    FoundBackups { ok: true, backups, error: None }
}

fn is_plausible_backup_file(path: &Path) -> bool {
    let Ok(meta) = std::fs::metadata(path) else { return false };
    meta.is_file() && meta.len() > 0 && meta.len() <= MAX_BACKUP_BYTES
}

/// Yalnızca uygulamanın izin verdiği klasörlerdeki, YazNot adlandırma kuralına
/// uyan yedekleri okur. Arayüzden gelen serbest bir yol ile rastgele dosya
/// okunmasını engeller.
fn is_allowed_backup_path(app: &AppHandle, path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|n| n.to_str()) else { return false };
    let lower = name.to_ascii_lowercase();
    if !lower.ends_with(".json") {
        return false;
    }
    if !(name.starts_with(USER_PREFIX) || name.starts_with(AUTO_PREFIX)) {
        return false;
    }
    if !is_plausible_backup_file(path) {
        return false;
    }
    let Ok(canonical) = std::fs::canonicalize(path) else { return false };
    let canonical = canonical.to_string_lossy().to_ascii_lowercase();
    let mut roots = vec![paths::root(app).join("backups")];
    if let Ok(downloads) = app.path().download_dir() {
        roots.push(downloads);
    }
    if let Ok(desktop) = app.path().desktop_dir() {
        roots.push(desktop);
    }
    roots.into_iter().any(|root| {
        std::fs::canonicalize(root)
            .map(|root| path_is_within(Path::new(&canonical), &root))
            .unwrap_or(false)
    })
}

fn path_is_within(path: &Path, root: &Path) -> bool {
    let path: Vec<String> = path
        .components()
        .map(|part| part.as_os_str().to_string_lossy().to_ascii_lowercase())
        .collect();
    let root: Vec<String> = root
        .components()
        .map(|part| part.as_os_str().to_string_lossy().to_ascii_lowercase())
        .collect();
    path.starts_with(&root)
}

fn collect(dir: &Path, kind: &'static str, out: &mut Vec<BackupFile>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".json") {
            continue;
        }
        let wanted = if kind == "backup" { USER_PREFIX } else { AUTO_PREFIX };
        if !name.starts_with(wanted) {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };
        if meta.len() == 0 || meta.len() > MAX_BACKUP_BYTES {
            continue;
        }
        let path = entry.path();
        let Ok(raw) = std::fs::read_to_string(&path) else { continue };
        let Ok(value) = serde_json::from_str::<Value>(raw.trim_start_matches('\u{FEFF}')) else {
            continue;
        };
        if !value.get("sections").map(Value::is_array).unwrap_or(false) {
            continue;
        }
        let modified = meta
            .modified()
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        out.push(BackupFile {
            name,
            path: path.display().to_string(),
            size: meta.len(),
            modified,
            kind,
        });
    }
}

fn sanitize_uid(value: &str) -> Option<String> {
    let valid = !value.is_empty()
        && value.len() <= 64
        && value.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-');
    if valid {
        Some(value.to_string())
    } else {
        None
    }
}

fn is_auto_backup(name: &str, uid: Option<&str>) -> bool {
    let Some(rest) = name.strip_prefix(AUTO_PREFIX) else { return false };
    let Some(stamp) = rest.strip_suffix(".json") else { return false };
    let stamp = match uid {
        Some(uid) => {
            let Some(stamp) = stamp.strip_prefix(uid) else { return false };
            let Some(stamp) = stamp.strip_prefix('-') else { return false };
            stamp
        }
        None => stamp,
    };
    is_day(stamp)
}

fn is_day(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn day_shape_is_strict() {
        assert!(is_day("2026-11-07"));
        assert!(!is_day("2026-1-07"));
        assert!(!is_day("2026-11-7"));
        assert!(!is_day("2026_11_07"));
        assert!(!is_day("2026-11-07x"));
    }

    #[test]
    fn uid_backups_do_not_match_anonymous_pattern() {
        assert!(is_auto_backup("yaznot-oto-2026-11-07.json", None));
        assert!(!is_auto_backup("yaznot-oto-abc-2026-11-07.json", None));
        assert!(is_auto_backup("yaznot-oto-abc-2026-11-07.json", Some("abc")));
        assert!(!is_auto_backup("yaznot-oto-abcd-2026-11-07.json", Some("abc")));
        assert!(!is_auto_backup("yaznot-yedek-2026-11-07.json", None));
    }

    #[test]
    fn uid_rejects_unsafe_characters() {
        assert_eq!(sanitize_uid("abc-123"), Some("abc-123".into()));
        assert_eq!(sanitize_uid("abc_123"), None);
        assert_eq!(sanitize_uid("abc/123"), None);
        assert_eq!(sanitize_uid(""), None);
    }
}
