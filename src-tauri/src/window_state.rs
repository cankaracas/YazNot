use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

use crate::paths;

const SAVE_INTERVAL: Duration = Duration::from_millis(400);
const MIN_WIDTH: f64 = 900.0;
const MIN_HEIGHT: f64 = 600.0;

#[derive(Serialize, Deserialize)]
#[serde(default)]
pub struct WindowState {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: i32,
    pub height: i32,
    pub maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self { x: None, y: None, width: 1200, height: 800, maximized: false }
    }
}

pub fn create_main_window(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = load(app);

    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("YazNot")
        .inner_size(state.width as f64, state.height as f64)
        .min_inner_size(MIN_WIDTH, MIN_HEIGHT)
        .resizable(true)
        .disable_drag_drop_handler()
        .additional_browser_args("--js-flags=--expose-gc");

    if let (Some(x), Some(y)) = (state.x, state.y) {
        builder = builder.position(x as f64, y as f64);
    }

    let window = builder.build()?;
    if state.maximized {
        let _ = window.maximize();
    }

    let handle = app.clone();
    window.on_window_event(move |event| match event {
        WindowEvent::CloseRequested { .. } => save_now(&handle),
        WindowEvent::Resized(_) | WindowEvent::Moved(_) => schedule_save(&handle),
        _ => {}
    });

    Ok(())
}

fn state_path(app: &AppHandle) -> std::path::PathBuf {
    paths::root(app).join("window-state.json")
}

fn load(app: &AppHandle) -> WindowState {
    let Ok(raw) = std::fs::read_to_string(state_path(app)) else {
        return WindowState::default();
    };
    let Ok(mut state) = serde_json::from_str::<WindowState>(&raw) else {
        return WindowState::default();
    };
    if state.width < MIN_WIDTH as i32 {
        state.width = WindowState::default().width;
    }
    if state.height < MIN_HEIGHT as i32 {
        state.height = WindowState::default().height;
    }
    state
}

fn schedule_save(app: &AppHandle) {
    static LAST: OnceLock<Mutex<Option<Instant>>> = OnceLock::new();
    let lock = LAST.get_or_init(|| Mutex::new(None));
    let mut last = lock.lock().unwrap_or_else(|e| e.into_inner());
    let now = Instant::now();
    if last.map(|value| now.duration_since(value) < SAVE_INTERVAL).unwrap_or(false) {
        return;
    }
    *last = Some(now);
    drop(last);
    save_now(app);
}

fn save_now(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if window.is_minimized().unwrap_or(false) {
        return;
    }

    let scale = window.scale_factor().unwrap_or(1.0);
    let maximized = window.is_maximized().unwrap_or(false);
    let mut state = load(app);

    if !maximized {
        if let Ok(size) = window.inner_size() {
            state.width = (size.width as f64 / scale).round() as i32;
            state.height = (size.height as f64 / scale).round() as i32;
        }
        if let Ok(position) = window.outer_position() {
            state.x = Some((position.x as f64 / scale).round() as i32);
            state.y = Some((position.y as f64 / scale).round() as i32);
        }
    }
    state.maximized = maximized;

    if let Ok(body) = serde_json::to_string(&state) {
        let _ = std::fs::write(state_path(app), body);
    }
}
