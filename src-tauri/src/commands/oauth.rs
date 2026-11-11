use percent_encoding::percent_decode_str;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tokio::sync::oneshot;

use crate::results::OAuthResult;

const AUTH_TIMEOUT: Duration = Duration::from_secs(300);

fn query_param(raw: &str, key: &str) -> Option<String> {
    raw.split('&').find_map(|part| {
        let mut pieces = part.splitn(2, '=');
        if pieces.next() == Some(key) {
            pieces.next().map(|value| {
                percent_decode_str(&value.replace('+', " "))
                    .decode_utf8_lossy()
                    .into_owned()
            })
        } else {
            None
        }
    })
}

fn oauth_error(raw: &str) -> Option<String> {
    let code = query_param(raw, "error")?;
    if let Some(description) = query_param(raw, "error_description") {
        Some(description)
    } else {
        Some(format!("Google girişi tamamlanamadı ({code})"))
    }
}

/// Google girişini uygulama içi bir pencerede yürütür; dönen https veya
/// `yaznot://auth` adresindeki token'ları yakalar. Tarayıcı açılmaz; oturum anahtarı
/// ağ üzerinden değil, doğrudan bu pencereden alınır.
#[tauri::command]
pub async fn google_sign_in(
    app: AppHandle,
    window: WebviewWindow,
    url: String,
) -> OAuthResult {
    if let Err(message) = crate::commands::require_main(&window) {
        return OAuthResult {
            ok: false,
            error: Some(message),
            ..Default::default()
        };
    }
    if !url.starts_with("https://") {
        return OAuthResult {
            ok: false,
            error: Some("Geçersiz giriş adresi".into()),
            ..Default::default()
        };
    }
    let Ok(parsed) = url.parse::<tauri::Url>() else {
        return OAuthResult {
            ok: false,
            error: Some("Geçersiz giriş adresi".into()),
            ..Default::default()
        };
    };

    let label = format!(
        "auth-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );
    let (tx, rx) = oneshot::channel::<OAuthResult>();
    let sender = Arc::new(Mutex::new(Some(tx)));

    // WebView2 bazen aynı kullanıcı verisi klasöründe ikinci bir pencere
    // açamıyor (HRESULT 0x8007139F). Giriş penceresine kendi veri klasörünü ver.
    let auth_data_dir = app
        .path()
        .app_local_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir())
        .join("oauth-webview");
    let _ = std::fs::create_dir_all(&auth_data_dir);

    let navigator = sender.clone();
    let builder = WebviewWindowBuilder::new(&app, &label, WebviewUrl::External(parsed))
        .data_directory(auth_data_dir)
        .title("YazNot — Giriş")
        .inner_size(520.0, 720.0)
        .resizable(false)
        .center()
        .on_navigation(move |target| {
            // Hem özel şema (yaznot://auth) hem de Supabase'in Site URL'e
            // düşerek döndürdüğü https adresindeki token'ları yakala.
            let fragment = target.fragment().unwrap_or("");
            let query = target.query().unwrap_or("");
            let has_token = fragment.contains("access_token=") || query.contains("access_token=");
            let error = oauth_error(fragment).or_else(|| oauth_error(query));
            let is_auth_scheme = target.scheme() == "yaznot";
            if !is_auth_scheme && !has_token && error.is_none() {
                return true;
            }
            let result = OAuthResult {
                ok: has_token && error.is_none(),
                canceled: if !has_token && error.is_none() { Some(true) } else { None },
                hash: target.fragment().map(str::to_string),
                query: target.query().map(str::to_string),
                error,
                ..Default::default()
            };
            if let Some(tx) = navigator.lock().unwrap().take() {
                let _ = tx.send(result);
            }
            false
        });

    let window = match builder.build() {
        Ok(window) => window,
        Err(err) => {
            eprintln!("[oauth] webview olusturulamadi: {err}");
            return OAuthResult {
                ok: false,
                error: Some("Google giriş penceresi açılamadı. Uygulamayı yeniden başlatmayı dene.".into()),
                ..Default::default()
            }
        }
    };

    let on_close = sender.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            if let Some(tx) = on_close.lock().unwrap().take() {
                let _ = tx.send(OAuthResult {
                    ok: false,
                    canceled: Some(true),
                    ..Default::default()
                });
            }
        }
    });

    let result = match tokio::time::timeout(AUTH_TIMEOUT, rx).await {
        Ok(Ok(value)) => value,
        Ok(Err(_)) => OAuthResult {
            ok: false,
            canceled: Some(true),
            ..Default::default()
        },
        Err(_) => OAuthResult {
            ok: false,
            canceled: Some(true),
            error: Some("Giriş zaman aşımına uğradı".into()),
            ..Default::default()
        },
    };

    let _ = window.close();
    result
}
