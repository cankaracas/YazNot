use serde_json::Value;
use tauri::{AppHandle, WebviewWindow};

use crate::commands::require_main;
use crate::paths;

/// Eski (dosya tabanlı) sürümün verisini okur. IndexedDB boşsa devreye girer.
#[tauri::command(async)]
pub fn load_legacy(app: AppHandle, window: WebviewWindow, key: String) -> Option<Value> {
    require_main(&window).ok()?;
    let safe = paths::safe_key(&key)?;
    let dirs = paths::ensure(&app).ok()?;
    let raw = std::fs::read_to_string(dirs.data.join(format!("{safe}.json"))).ok()?;
    serde_json::from_str(&raw).ok()
}
