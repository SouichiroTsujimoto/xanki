mod capture;
mod clipboard;
mod commands;
mod db;
mod error;
mod models;
mod ocr;
mod permissions;
mod scheduler;
mod state;
mod windows;

use state::AppState;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }
                    let text_shortcut =
                        Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyM);
                    let screenshot_shortcut =
                        Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyS);

                    if shortcut == &text_shortcut {
                        windows::handle_text_import(app);
                    } else if shortcut == &screenshot_shortcut {
                        if let Some(state) = app.try_state::<AppState>() {
                            windows::handle_screenshot_import(
                                app,
                                state.app_data_dir.clone(),
                            );
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            let db_path = app_data_dir.join("xanki.db");
            let db = db::Database::open(&db_path).expect("failed to open database");
            db.with_conn(db::repos::ensure_default_deck)
                .expect("failed to ensure default deck");

            let mut app_state = AppState::new(app_data_dir, db);
            if let Ok(ocr) = ocr::SidecarOcrProvider::from_app(app.handle()) {
                app_state.ocr = ocr;
            }
            app.manage(app_state);

            let review = MenuItem::with_id(app, "review", "今日の復習: 0件", true, None::<&str>)?;
            let library = MenuItem::with_id(app, "library", "Home を開く", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "設定", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&review, &library, &settings, &separator, &quit])?;

            let _tray = TrayIconBuilder::with_id("main")
                .menu(&menu)
                .tooltip("xanki")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "review" => {
                        let _ = windows::show_main_window(app);
                        let _ = app.emit("navigate", "study");
                    }
                    "library" => {
                        let _ = windows::open_home_window(app);
                    }
                    "settings" => {
                        let _ = windows::show_main_window(app);
                        let _ = app.emit("navigate", "settings");
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        let _ = windows::show_main_window(app);
                    }
                })
                .build(app)?;

            if let Some(state) = app.try_state::<AppState>() {
                let _ = windows::refresh_tray_count(app.handle(), &state);
            }

            let text_shortcut =
                Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyM);
            let screenshot_shortcut =
                Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyS);
            app.global_shortcut()
                .register(text_shortcut)
                .expect("failed to register text import shortcut");
            app.global_shortcut()
                .register(screenshot_shortcut)
                .expect("failed to register screenshot shortcut");

            if let Some(main) = app.get_webview_window("main") {
                let _ = windows::configure_main_window(&main);
                let window = main.clone();
                main.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_editor_init,
            commands::clear_editor_init,
            commands::list_decks,
            commands::create_deck,
            commands::delete_deck,
            commands::ensure_default_deck,
            commands::list_cards,
            commands::get_card,
            commands::save_text_card,
            commands::save_qa_card,
            commands::save_image_cards,
            commands::update_text_card,
            commands::update_qa_card,
            commands::update_image_card,
            commands::open_card_editor,
            commands::update_deck,
            commands::toggle_star,
            commands::duplicate_card,
            commands::reset_card_progress,
            commands::get_study_cards,
            commands::export_deck,
            commands::import_deck,
            commands::delete_card,
            commands::get_due_count,
            commands::get_due_cards,
            commands::submit_review,
            commands::get_last_used_deck_id,
            commands::check_permissions,
            commands::open_accessibility_settings,
            commands::open_screen_recording_settings,
            commands::resolve_image_url,
            commands::run_ocr,
            commands::crop_image_region,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            match event {
                RunEvent::Ready => {
                    if let Some(state) = app.try_state::<AppState>() {
                        let _ = windows::refresh_tray_count(app, &state);
                    }
                    let _ = windows::open_home_window(app);
                }
                #[cfg(target_os = "macos")]
                RunEvent::Reopen { .. } => {
                    let _ = windows::open_home_window(app);
                }
                _ => {}
            }
        });
}
