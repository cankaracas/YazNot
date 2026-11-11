use tauri::WebviewWindow;

/// WebView2'nin bellek hedef seviyesini değiştirir.
///
/// `low = true` iken Chromium kullanılmayan önbellekleri bırakır; sayfa
/// görünür ve etkinken `false` kullanılır. Yalnızca Windows'ta etkilidir.
pub fn apply(window: &WebviewWindow, low: bool) {
    #[cfg(windows)]
    {
        let _ = window.with_webview(move |webview| {
            use webview2_com::Microsoft::Web::WebView2::Win32::{
                COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW,
                COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL, ICoreWebView2_19,
            };
            use windows::core::Interface;

            let controller = webview.controller();
            let Ok(core) = (unsafe { controller.CoreWebView2() }) else {
                return;
            };
            let Ok(core19) = core.cast::<ICoreWebView2_19>() else {
                return;
            };
            let level = if low {
                COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW
            } else {
                COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL
            };
            unsafe {
                let _ = core19.SetMemoryUsageTargetLevel(level);
            }
        });
    }

    #[cfg(not(windows))]
    {
        let _ = (window, low);
    }
}

#[tauri::command]
pub fn set_memory_level(window: WebviewWindow, low: bool) {
    if crate::commands::require_main(&window).is_err() {
        return;
    }
    apply(&window, low);
}
