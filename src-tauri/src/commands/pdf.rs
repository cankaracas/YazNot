use tauri::{AppHandle, WebviewWindow};

use crate::paths;
use crate::results::SaveResult;

/// PDF dışa aktarma.
///
/// Windows'ta belge, gizli bir pencerede düzenlenip WebView2'nin yazdırma
/// motoruyla doğrudan PDF dosyasına çevrilir (önceki sürümdeki davranışın aynısı).
/// Yerel çevirici henüz sunulmayan platformlarda `unsupported` döner ve arayüz
/// tarayıcının yazdırma penceresine düşer; kullanıcı yine "PDF olarak kaydet"
/// seçebilir.
#[tauri::command(async)]
pub fn export_pdf(
    app: AppHandle,
    window: WebviewWindow,
    title: String,
    html: String,
) -> SaveResult {
    if let Err(message) = crate::commands::require_main(&window) {
        return SaveResult::error(message);
    }
    let file_name = format!("{}.pdf", paths::safe_file_name(&title, "belge"));

    #[cfg(windows)]
    {
        match render::print_html(&app, &html, &file_name) {
            Ok(result) => return result,
            Err(message) => {
                return SaveResult {
                    ok: false,
                    unsupported: Some(true),
                    error: Some(message),
                    ..Default::default()
                }
            }
        }
    }

    #[cfg(not(windows))]
    {
        let _ = (app, html, file_name);
        SaveResult::unsupported()
    }
}

#[allow(dead_code)]
pub fn document(html: &str) -> String {
    let body = strip_scripts(html);
    format!(
        "<!DOCTYPE html><html lang=\"tr\"><head><meta charset=\"utf-8\">\
         <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data: blob: https:; style-src 'unsafe-inline'; script-src 'none'; object-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'\"></head><style>\
         html,body{{margin:0;padding:0;background:#fff;color:#111;}}\
         body{{font-family:\"Segoe UI\",Roboto,Arial,Helvetica,sans-serif;font-size:13pt;line-height:1.6;padding:48px;}}\
         h1,h2,h3{{font-weight:700;margin:0.6em 0 0.3em;page-break-after:avoid;}}\
         p,div{{margin:0.4em 0;}}\
         img{{max-width:100%;height:auto;}}\
         b,strong{{font-weight:700;}}i,em{{font-style:italic;}}u{{text-decoration:underline;}}\
         mark{{background:#ffe08a;color:#1a1a1a;}}\
         blockquote{{margin:0.6em 0;padding-left:14px;border-left:3px solid #ddd;color:#444;}}\
         </style><body>{body}</body></html>"
    )
}

#[allow(dead_code)]
fn strip_scripts(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let lower = html.to_lowercase();
    let mut cursor = 0;
    while let Some(start) = lower[cursor..].find("<script") {
        let start = cursor + start;
        out.push_str(&html[cursor..start]);
        match lower[start..].find("</script>") {
            Some(end) => cursor = start + end + "</script>".len(),
            None => {
                cursor = html.len();
                break;
            }
        }
    }
    out.push_str(&html[cursor.min(html.len())..]);
    out
}

#[cfg(windows)]
mod render {
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::{mpsc, Arc};
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    use tauri::webview::PageLoadEvent;
    use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2PrintSettings, ICoreWebView2_7,
    };
    use webview2_com::PrintToPdfCompletedHandler;
    use windows::core::{Interface, HSTRING};

    use super::document;
    use crate::commands::save_dialog;
    use crate::results::SaveResult;

    pub fn print_html(app: &AppHandle, html: &str, file_name: &str) -> Result<SaveResult, String> {
        let Some(path) = save_dialog(app, "PDF Olarak Dışa Aktar", file_name, "PDF", &["pdf"])
        else {
            return Ok(SaveResult::canceled());
        };
        render_to_file(app, html, &path)?;
        Ok(SaveResult::ok(&path))
    }

    fn render_to_file(app: &AppHandle, html: &str, path: &PathBuf) -> Result<(), String> {
        let page = document(html);
        let script = format!(
            "document.open();document.write({});document.close();",
            serde_json::to_string(&page).map_err(|e| e.to_string())?
        );

        let label = format!(
            "print-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0)
        );
        let loaded = Arc::new(AtomicBool::new(false));
        let loaded_flag = loaded.clone();

        // Ayrı WebView2 veri klasörü: ikinci pencerenin açılamaması
        // (HRESULT 0x8007139F) sorununu önler.
        let print_data_dir = app
            .path()
            .app_local_data_dir()
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("print-webview");
        let _ = std::fs::create_dir_all(&print_data_dir);

        let window = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("print.html".into()))
            .data_directory(print_data_dir)
            .title("YazNot")
            .visible(false)
            .inner_size(900.0, 1200.0)
            .on_page_load(move |webview, payload| {
                if payload.event() == PageLoadEvent::Finished
                    && !loaded_flag.swap(true, Ordering::SeqCst)
                {
                    let _ = webview.eval(&script);
                }
            })
            .build()
            .map_err(|e| e.to_string())?;

        // Belge yazıldıktan sonra düzenin oturması için kısa bir bekleme.
        let mut waited = 0;
        while !loaded.load(Ordering::SeqCst) && waited < 5_000 {
            std::thread::sleep(Duration::from_millis(25));
            waited += 25;
        }
        std::thread::sleep(Duration::from_millis(900));

        let destination = path.clone();
        let (tx, rx) = mpsc::channel::<Result<(), String>>();

        let dispatch = window.with_webview(move |webview| {
            let controller = webview.controller();
            let core = match unsafe { controller.CoreWebView2() } {
                Ok(core) => core,
                Err(err) => {
                    let _ = tx.send(Err(format!("WebView2 çekirdeği alınamadı: {err}")));
                    return;
                }
            };
            let core: ICoreWebView2_7 = match core.cast() {
                Ok(core) => core,
                Err(err) => {
                    let _ = tx.send(Err(format!("PDF motoru bulunamadı: {err}")));
                    return;
                }
            };
            let sender = tx.clone();
            let handler = PrintToPdfCompletedHandler::create(Box::new(move |status, succeeded| {
                if status.is_ok() && succeeded {
                    let _ = sender.send(Ok(()));
                } else {
                    let _ = sender.send(Err(format!("PDF yazdırılamadı: {status:?}")));
                }
                Ok(())
            }));
            let target = HSTRING::from(destination.to_string_lossy().as_ref());
            if let Err(err) =
                unsafe { core.PrintToPdf(&target, None::<&ICoreWebView2PrintSettings>, &handler) }
            {
                let _ = tx.send(Err(err.to_string()));
            }
        });

        if let Err(err) = dispatch {
            let _ = window.close();
            return Err(err.to_string());
        }

        let outcome = rx.recv_timeout(Duration::from_secs(30));
        let _ = window.close();
        match outcome {
            Ok(Ok(())) => Ok(()),
            Ok(Err(message)) => Err(message),
            Err(_) => Err("PDF oluşturma zaman aşımına uğradı".into()),
        }
    }
}
