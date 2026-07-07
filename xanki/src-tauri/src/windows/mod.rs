use crate::capture::capture_to_app_data;
use crate::clipboard::ClipboardService;
use crate::error::{AppError, AppResult};
use crate::models::{EditorInitPayload, ImportTextResult};
use crate::state::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use uuid::Uuid;

fn store_editor_init(app: &AppHandle, label: &str, payload: EditorInitPayload) {
    match app.try_state::<AppState>() {
        Some(state) => state.store_editor_init(label, payload),
        None => eprintln!("AppState unavailable while storing editor init for {label}"),
    }
}

fn store_and_open_editor(
    app: &AppHandle,
    label: &str,
    payload: EditorInitPayload,
    width: f64,
    height: f64,
) -> AppResult<()> {
    store_editor_init(app, label, payload);

    let url = WebviewUrl::App(format!("/editor?label={label}").into());
    let window = WebviewWindowBuilder::new(app, label, url)
        .title("xanki — マスクエディタ")
        .inner_size(width, height)
        .decorations(true)
        .always_on_top(true)
        .center()
        .visible(false)
        .theme(Some(tauri::Theme::Light))
        .background_color(tauri::window::Color(255, 255, 255, 255))
        .build()
        .map_err(|e| AppError::Other(e.to_string()))?;

    let app_handle = app.clone();
    let label_for_cleanup = label.to_string();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Destroyed) {
            if let Some(state) = app_handle.try_state::<AppState>() {
                state.remove_editor_init(&label_for_cleanup);
            }
        }
    });

    window
        .set_focus()
        .map_err(|e| AppError::Other(e.to_string()))?;
    Ok(())
}

pub fn open_mask_editor_text(
    app: &AppHandle,
    text: &str,
    deck_id: Option<String>,
) -> AppResult<()> {
    let label = format!("mask-editor-{}", Uuid::now_v7());
    store_and_open_editor(
        app,
        &label,
        EditorInitPayload {
            mode: "text".into(),
            content: Some(text.to_string()),
            answer: None,
            image_path: None,
            card_id: None,
            deck_id,
            masks: None,
            note: None,
            ocr_text: None,
            ocr_data: None,
        },
        720.0,
        600.0,
    )
}

pub fn open_mask_editor_image(
    app: &AppHandle,
    image_path: &str,
    deck_id: Option<String>,
) -> AppResult<()> {
    let label = format!("mask-editor-{}", Uuid::now_v7());
    store_and_open_editor(
        app,
        &label,
        EditorInitPayload {
            mode: "image".into(),
            content: None,
            answer: None,
            image_path: Some(image_path.to_string()),
            card_id: None,
            deck_id,
            masks: None,
            note: None,
            ocr_text: None,
            ocr_data: None,
        },
        1000.0,
        1000.0,
    )
}

fn run_on_main<F>(app: &AppHandle, task: F)
where
    F: FnOnce() + Send + 'static,
{
    if let Err(error) = app.run_on_main_thread(task) {
        eprintln!("failed to dispatch task to main thread: {error}");
    }
}

pub fn handle_text_import(app: &AppHandle, deck_id: Option<String>) {
    let app = app.clone();
    let app_for_task = app.clone();
    run_on_main(&app, move || {
        let result = match ClipboardService::import_selected_text() {
            Ok((text, latency_ms)) => ImportTextResult {
                text,
                latency_ms,
                error: None,
            },
            Err(error) => ImportTextResult {
                text: None,
                latency_ms: 0,
                error: Some(error.to_string()),
            },
        };

        if let Some(text) = result.text.clone().filter(|value| !value.trim().is_empty()) {
            if let Err(error) = open_mask_editor_text(&app_for_task, &text, deck_id) {
                eprintln!("failed to open text mask editor: {error}");
            }
            let _ = app_for_task.emit("import-metrics", &result);
            return;
        }

        let _ = app_for_task.emit("import-failed", &result);
        use tauri_plugin_notification::NotificationExt;
        let _ = app_for_task
            .notification()
            .builder()
            .title("xanki")
            .body("テキストを取得できませんでした。⌥⌘S でスクショ取込を試してください。")
            .show();
    });
}

pub fn handle_screenshot_import(
    app: &AppHandle,
    app_data_dir: PathBuf,
    deck_id: Option<String>,
) {
    let app = app.clone();
    let app_for_task = app.clone();
    run_on_main(&app, move || match capture_to_app_data(&app_data_dir) {
        Ok(Some(path)) => {
            if let Err(error) = open_mask_editor_image(&app_for_task, &path, deck_id) {
                eprintln!("failed to open image mask editor: {error}");
            }
        }
        Ok(None) => {}
        Err(error) => {
            use tauri_plugin_notification::NotificationExt;
            let _ = app_for_task
                .notification()
                .builder()
                .title("xanki")
                .body(&format!("スクショ取込に失敗しました: {error}"))
                .show();
        }
    });
}

pub fn open_new_card_editor(app: &AppHandle, deck_id: String, mode: &str) -> AppResult<()> {
    let label = format!("mask-editor-{}", Uuid::now_v7());
    let payload = match mode {
        "text" => EditorInitPayload {
            mode: "text".into(),
            content: Some(String::new()),
            answer: None,
            image_path: None,
            card_id: None,
            deck_id: Some(deck_id),
            masks: None,
            note: None,
            ocr_text: None,
            ocr_data: None,
        },
        "qa" => EditorInitPayload {
            mode: "qa".into(),
            content: Some(String::new()),
            answer: Some(String::new()),
            image_path: None,
            card_id: None,
            deck_id: Some(deck_id),
            masks: None,
            note: None,
            ocr_text: None,
            ocr_data: None,
        },
        other => {
            return Err(AppError::Other(format!("unsupported new card mode: {other}")));
        }
    };

    store_and_open_editor(app, &label, payload, 720.0, 600.0)
}

pub fn open_editor_with_payload(
    app: &AppHandle,
    _state: &AppState,
    payload: EditorInitPayload,
) -> AppResult<()> {
    let label = format!("mask-editor-{}", Uuid::now_v7());
    let (width, height) = if payload.mode == "image" {
        (1000.0, 1000.0)
    } else {
        (720.0, 600.0)
    };
    store_and_open_editor(app, &label, payload, width, height)
}

pub fn refresh_tray_count(app: &AppHandle, _state: &State<'_, AppState>) -> AppResult<()> {
    Ok(())
}

pub fn configure_main_window(window: &tauri::WebviewWindow) -> AppResult<()> {
    window
        .set_theme(Some(tauri::Theme::Light))
        .map_err(|e| AppError::Other(e.to_string()))?;
    window
        .set_background_color(Some(tauri::window::Color(255, 255, 255, 255)))
        .map_err(|e| AppError::Other(e.to_string()))?;
    Ok(())
}

pub fn show_main_window(app: &AppHandle) -> AppResult<()> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| AppError::Other(e.to_string()))?;
        window
            .set_focus()
            .map_err(|e| AppError::Other(e.to_string()))?;
    }
    Ok(())
}

pub fn open_home_window(app: &AppHandle) -> AppResult<()> {
    show_main_window(app)?;
    app.emit("navigate", "home")
        .map_err(|e| AppError::Other(e.to_string()))?;
    Ok(())
}

pub fn update_tray_menu(app: &AppHandle, due_count: i64) -> AppResult<()> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

    let tray = app
        .tray_by_id("main")
        .ok_or_else(|| AppError::Other("tray not found".into()))?;

    let review_label = format!("今日の復習: {due_count}件");
    let review = MenuItem::with_id(app, "review", &review_label, true, None::<&str>)
        .map_err(|e| AppError::Other(e.to_string()))?;
    let library = MenuItem::with_id(app, "library", "ホームを開く", true, None::<&str>)
        .map_err(|e| AppError::Other(e.to_string()))?;
    let settings = MenuItem::with_id(app, "settings", "設定", true, None::<&str>)
        .map_err(|e| AppError::Other(e.to_string()))?;
    let quit = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)
        .map_err(|e| AppError::Other(e.to_string()))?;
    let separator =
        PredefinedMenuItem::separator(app).map_err(|e| AppError::Other(e.to_string()))?;

    let menu = Menu::with_items(app, &[&review, &library, &settings, &separator, &quit])
        .map_err(|e| AppError::Other(e.to_string()))?;
    tray.set_menu(Some(menu))
        .map_err(|e| AppError::Other(e.to_string()))?;
    Ok(())
}
