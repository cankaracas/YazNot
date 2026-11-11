use serde_json::Value;
use tauri::AppHandle;

use crate::paths;

/// Eski (dosya tabanlı) sürümün verisini okur. IndexedDB boşsa devreye girer.
#[tauri::command(async)]
pub fn load_legacy(app: AppHandle, key: String) -> Option<Value> {
    let safe = paths::safe_key(&key)?;
    let dirs = paths::ensure(&app).ok()?;
    let raw = std::fs::read_to_string(dirs.data.join(format!("{safe}.json"))).ok()?;
    serde_json::from_str(&raw).ok()
}
