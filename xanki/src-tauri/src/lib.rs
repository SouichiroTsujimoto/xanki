mod capture;
mod clipboard;
mod cloud;
mod commands;
mod error;
mod image_store;
mod models;
mod ocr;
mod permissions;
mod state;
mod windows;

use state::AppState;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_deep_link::DeepLinkExt;

fn handle_auth_deep_link(app: &tauri::AppHandle, url: &str) {
    if let Some(token) = cloud::handle_auth_callback_url(url) {
        if cloud::save_session_token(&token).is_ok() {
            cloud::notify_auth_complete(app);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
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
                        let deck_id = app
                            .try_state::<AppState>()
                            .and_then(|state| state.capture_deck_id());
                        windows::handle_text_import(app, deck_id);
                    } else if shortcut == &screenshot_shortcut {
                        if let Some(state) = app.try_state::<AppState>() {
                            let deck_id = state.capture_deck_id();
                            windows::handle_screenshot_import(
                                app,
                                state.app_data_dir.clone(),
                                deck_id,
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
            std::fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");

            let mut app_state = AppState::new(app_data_dir);
            if let Ok(ocr) = ocr::SidecarOcrProvider::from_app(app.handle()) {
                app_state.ocr = ocr;
            }
            app.manage(app_state);

            let review = MenuItem::with_id(app, "review", "今日の復習: 0件", true, None::<&str>)?;
            let library = MenuItem::with_id(app, "home", "ホームを開く", true, None::<&str>)?;
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
                        let _ = app.emit("navigate", "leitner");
                    }
                    "home" => {
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

            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    handle_auth_deep_link(&handle, url.as_ref());
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_editor_init,
            commands::clear_editor_init,
            commands::trigger_text_capture,
            commands::trigger_screenshot_capture,
            commands::open_new_card_editor,
            commands::check_permissions,
            commands::open_accessibility_settings,
            commands::open_screen_recording_settings,
            commands::resolve_image_url,
            commands::run_ocr,
            commands::crop_image_region,
            commands::process_image_cards,
            commands::open_editor_with_payload,
            commands::update_tray_due_count,
            commands::cloud::cloud_get_session,
            commands::cloud::cloud_prepare_google_sign_in,
            commands::cloud::cloud_set_session,
            commands::cloud::cloud_clear_session,
            commands::set_capture_deck_id,
            commands::cloud::read_image_bytes,
            commands::cloud::write_image_bytes,
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
                    let _ = windows::show_main_window(app);
                }
                _ => {}
            }
        });
}
