mod commands;
mod memory;
mod paths;
mod results;
mod utc;
mod window_state;

use tauri::Manager;

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::data::load_legacy,
            commands::images::pick_image,
            commands::files::save_text_file,
            commands::files::save_guide_pdf,
            commands::files::open_external,
            commands::files::open_backups_folder,
            commands::files::confirm,
            commands::backup::export_backup,
            commands::backup::import_backup,
            commands::backup::auto_backup,
            commands::backup::find_backups,
            commands::oauth::google_sign_in,
            commands::pdf::export_pdf,
            memory::set_memory_level,
        ])
        .setup(|app| {
            let handle = app.handle();
            if let Err(err) = paths::ensure(handle) {
                eprintln!("[yaznot] veri klasörü hazırlanamadı: {err}");
            }
            window_state::create_main_window(handle)?;
            Ok(())
        });

    let app = builder
        .build(tauri::generate_context!())
        .expect("YazNot başlatılamadı");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        {
            if let tauri::RunEvent::Reopen { .. } = event {
                if app_handle.get_webview_window("main").is_none() {
                    let _ = window_state::create_main_window(app_handle);
                }
            }
        }
        let _ = (app_handle, event);
    });
}
