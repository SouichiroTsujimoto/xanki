pub mod cloud;

use crate::capture::resolve_image_path;
use crate::error::AppResult;
use crate::models::*;
use crate::state::AppState;
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub fn get_editor_init(
    state: State<'_, AppState>,
    window_label: String,
) -> AppResult<Option<EditorInitPayload>> {
    Ok(state.get_editor_init(&window_label))
}

#[tauri::command]
pub fn clear_editor_init(state: State<'_, AppState>, window_label: String) -> AppResult<()> {
    state.remove_editor_init(&window_label);
    Ok(())
}

#[tauri::command]
pub fn trigger_text_capture(app: AppHandle, deck_id: Option<String>) {
    crate::windows::handle_text_import(&app, deck_id);
}

#[tauri::command]
pub fn trigger_screenshot_capture(
    app: AppHandle,
    state: State<'_, AppState>,
    deck_id: Option<String>,
) {
    crate::windows::handle_screenshot_import(&app, state.app_data_dir.clone(), deck_id);
}

#[tauri::command]
pub fn open_new_card_editor(
    app: AppHandle,
    deck_id: String,
    mode: String,
) -> AppResult<()> {
    crate::windows::open_new_card_editor(&app, deck_id, &mode)
}

#[tauri::command]
pub fn check_permissions() -> PermissionStatus {
    crate::permissions::check_permissions()
}

#[tauri::command]
pub fn open_accessibility_settings() {
    crate::permissions::open_accessibility_settings();
}

#[tauri::command]
pub fn open_screen_recording_settings() {
    crate::permissions::open_screen_recording_settings();
}

#[tauri::command]
pub fn resolve_image_url(state: State<'_, AppState>, image_path: String) -> AppResult<String> {
    Ok(resolve_image_path(&state.app_data_dir, &image_path)
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
pub fn run_ocr(state: State<'_, AppState>, image_path: String) -> AppResult<OcrResult> {
    crate::ocr::recognize_image(&state.app_data_dir, &image_path, &state.ocr)
}

#[tauri::command]
pub fn crop_image_region(
    state: State<'_, AppState>,
    relative_path: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> AppResult<String> {
    crate::capture::crop_image(&state.app_data_dir, &relative_path, x, y, w, h)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessedImageCard {
    pub relative_path: String,
    pub hash: String,
    pub masks: String,
    pub note: Option<String>,
    pub ocr_text: Option<String>,
    pub ocr_data: Option<String>,
}

#[tauri::command]
pub fn process_image_cards(
    state: State<'_, AppState>,
    request: SaveImageCardsRequest,
) -> AppResult<Vec<ProcessedImageCard>> {
    let source_image = request.image_path.clone();
    let mut processed = Vec::new();

    let source_dims = {
        let source_path = resolve_image_path(&state.app_data_dir, &source_image);
        if source_path.exists() {
            image::open(&source_path)
                .ok()
                .map(|img| (img.width(), img.height()))
        } else {
            None
        }
    };

    for region in request.regions {
        if region.crop_w <= 0.0 || region.crop_h <= 0.0 {
            continue;
        }

        let (masks, ocr_text, ocr_data) =
            crate::capture::adjust_region_for_crop(&region, request.ocr_data.as_deref());

        if masks.is_empty() {
            continue;
        }

        let cropped = if let Some((w, h)) = source_dims {
            if crate::capture::is_full_image_region(&region, w, h) {
                source_image.clone()
            } else {
                crate::capture::crop_image(
                    &state.app_data_dir,
                    &source_image,
                    region.crop_x,
                    region.crop_y,
                    region.crop_w,
                    region.crop_h,
                )?
            }
        } else {
            crate::capture::crop_image(
                &state.app_data_dir,
                &source_image,
                region.crop_x,
                region.crop_y,
                region.crop_w,
                region.crop_h,
            )?
        };

        let stored = crate::image_store::finalize_image(&state.app_data_dir, &cropped)?;
        processed.push(ProcessedImageCard {
            relative_path: stored.relative_path,
            hash: stored.hash,
            masks: serde_json::to_string(&masks)?,
            note: region.note.clone(),
            ocr_text: ocr_text.or_else(|| request.ocr_text.clone()),
            ocr_data: ocr_data.or_else(|| request.ocr_data.clone()),
        });
    }

    Ok(processed)
}

#[tauri::command]
pub fn open_editor_with_payload(
    app: AppHandle,
    state: State<'_, AppState>,
    payload: EditorInitPayload,
) -> AppResult<()> {
    crate::windows::open_editor_with_payload(&app, &state, payload)
}

#[tauri::command]
pub fn update_tray_due_count(app: AppHandle, count: i64) -> AppResult<()> {
    crate::windows::update_tray_menu(&app, count)?;
    let _ = app.emit("review-count-changed", count);
    Ok(())
}
