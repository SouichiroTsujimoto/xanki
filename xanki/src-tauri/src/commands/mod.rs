use crate::capture::resolve_image_path;
use crate::db::repos;
use crate::error::AppResult;
use crate::models::*;
use crate::state::AppState;
use tauri::{AppHandle, Emitter, State};

fn notify_library_changed(app: &AppHandle, state: &State<'_, AppState>) {
    let _ = crate::windows::refresh_tray_count(app, state);
    let _ = app.emit("library-changed", ());
}

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
pub fn list_decks(state: State<'_, AppState>) -> AppResult<Vec<Deck>> {
    state.db.with_conn(repos::list_decks)
}

#[tauri::command]
pub fn create_deck(state: State<'_, AppState>, name: String) -> AppResult<Deck> {
    state.db.with_conn(|conn| repos::create_deck(conn, &name))
}

#[tauri::command]
pub fn delete_deck(state: State<'_, AppState>, deck_id: String) -> AppResult<()> {
    state.db.with_conn(|conn| repos::delete_deck(conn, &deck_id))
}

#[tauri::command]
pub fn ensure_default_deck(state: State<'_, AppState>) -> AppResult<Deck> {
    state.db.with_conn(repos::ensure_default_deck)
}

#[tauri::command]
pub fn list_cards(
    state: State<'_, AppState>,
    deck_id: Option<String>,
    query: Option<String>,
) -> AppResult<Vec<Card>> {
    state.db.with_conn(|conn| {
        repos::list_cards(
            conn,
            deck_id.as_deref(),
            query.as_deref(),
        )
    })
}

#[tauri::command]
pub fn get_card(state: State<'_, AppState>, card_id: String) -> AppResult<Card> {
    state.db.with_conn(|conn| repos::get_card(conn, &card_id))
}

#[tauri::command]
pub fn save_text_card(
    app: AppHandle,
    state: State<'_, AppState>,
    request: SaveTextCardRequest,
) -> AppResult<Card> {
    let deck_id = request.deck_id.clone();
    let card = state
        .db
        .with_conn(|conn| repos::save_text_card(conn, &request))?;
    if let Ok(mut last) = state.last_used_deck_id.lock() {
        *last = Some(deck_id);
    }
    notify_library_changed(&app, &state);
    Ok(card)
}

#[tauri::command]
pub fn save_image_cards(
    app: AppHandle,
    state: State<'_, AppState>,
    request: SaveImageCardsRequest,
) -> AppResult<Vec<Card>> {
    let deck_id = request.deck_id.clone();
    let source_image = request.image_path.clone();
    let mut all_cards = Vec::new();

    let source_dims = {
        let source_path =
            crate::capture::resolve_image_path(&state.app_data_dir, &source_image);
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

        let mut adjusted_region = region.clone();
        adjusted_region.masks = masks;

        let single = SaveImageCardsRequest {
            deck_id: deck_id.clone(),
            image_path: cropped,
            ocr_text: ocr_text.or_else(|| request.ocr_text.clone()),
            ocr_data: ocr_data.or_else(|| request.ocr_data.clone()),
            regions: vec![adjusted_region],
            source_hint: request.source_hint.clone(),
        };

        let cards = state
            .db
            .with_conn(|conn| repos::save_image_cards(conn, &single))?;
        all_cards.extend(cards);
    }

    if let Ok(mut last) = state.last_used_deck_id.lock() {
        *last = Some(deck_id);
    }
    notify_library_changed(&app, &state);
    Ok(all_cards)
}

#[tauri::command]
pub fn save_qa_card(
    app: AppHandle,
    state: State<'_, AppState>,
    request: SaveQaCardRequest,
) -> AppResult<Card> {
    let deck_id = request.deck_id.clone();
    let card = state
        .db
        .with_conn(|conn| repos::save_qa_card(conn, &request))?;
    if let Ok(mut last) = state.last_used_deck_id.lock() {
        *last = Some(deck_id);
    }
    notify_library_changed(&app, &state);
    Ok(card)
}

#[tauri::command]
pub fn update_text_card(
    app: AppHandle,
    state: State<'_, AppState>,
    request: UpdateTextCardRequest,
) -> AppResult<Card> {
    let card = state
        .db
        .with_conn(|conn| repos::update_text_card(conn, &request))?;
    notify_library_changed(&app, &state);
    Ok(card)
}

#[tauri::command]
pub fn update_qa_card(
    app: AppHandle,
    state: State<'_, AppState>,
    request: UpdateQaCardRequest,
) -> AppResult<Card> {
    let card = state
        .db
        .with_conn(|conn| repos::update_qa_card(conn, &request))?;
    notify_library_changed(&app, &state);
    Ok(card)
}

#[tauri::command]
pub fn update_image_card(
    app: AppHandle,
    state: State<'_, AppState>,
    request: UpdateImageCardRequest,
) -> AppResult<Card> {
    let card = state
        .db
        .with_conn(|conn| repos::update_image_card(conn, &request))?;
    notify_library_changed(&app, &state);
    Ok(card)
}

#[tauri::command]
pub fn open_card_editor(
    app: AppHandle,
    state: State<'_, AppState>,
    card_id: String,
) -> AppResult<()> {
    crate::windows::open_card_editor(&app, &state, &card_id)
}

#[tauri::command]
pub fn update_deck(
    state: State<'_, AppState>,
    deck_id: String,
    name: String,
) -> AppResult<Deck> {
    state.db.with_conn(|conn| repos::update_deck(conn, &deck_id, &name))
}

#[tauri::command]
pub fn toggle_star(state: State<'_, AppState>, card_id: String) -> AppResult<Card> {
    state.db.with_conn(|conn| repos::toggle_star(conn, &card_id))
}

#[tauri::command]
pub fn duplicate_card(
    app: AppHandle,
    state: State<'_, AppState>,
    card_id: String,
) -> AppResult<Card> {
    let card = state
        .db
        .with_conn(|conn| repos::duplicate_card(conn, &card_id))?;
    notify_library_changed(&app, &state);
    Ok(card)
}

#[tauri::command]
pub fn reset_card_progress(state: State<'_, AppState>, card_id: String) -> AppResult<Card> {
    state.db.with_conn(|conn| repos::reset_card_progress(conn, &card_id))
}

#[tauri::command]
pub fn get_study_cards(
    state: State<'_, AppState>,
    deck_id: Option<String>,
    filter: StudyFilter,
    limit: Option<i64>,
) -> AppResult<Vec<ReviewCard>> {
    let limit = limit.unwrap_or(200);
    let app_data = state.app_data_dir.clone();
    state.db.with_conn(|conn| {
        let mut cards = repos::get_study_cards(conn, deck_id.as_deref(), filter, limit)?;
        for item in &mut cards {
            if let Some(path) = &item.card.image_path {
                item.image_url = Some(
                    resolve_image_path(&app_data, path)
                        .to_string_lossy()
                        .to_string(),
                );
            }
        }
        Ok(cards)
    })
}

#[tauri::command]
pub fn export_deck(state: State<'_, AppState>, deck_id: String) -> AppResult<DeckExport> {
    state.db.with_conn(|conn| repos::export_deck(conn, &deck_id))
}

#[tauri::command]
pub fn import_deck(app: AppHandle, state: State<'_, AppState>, export: DeckExport) -> AppResult<Deck> {
    let deck = state.db.with_conn(|conn| repos::import_deck(conn, &export))?;
    notify_library_changed(&app, &state);
    Ok(deck)
}

#[tauri::command]
pub fn delete_card(
    app: AppHandle,
    state: State<'_, AppState>,
    card_id: String,
) -> AppResult<()> {
    state.db.with_conn(|conn| repos::delete_card(conn, &card_id))?;
    notify_library_changed(&app, &state);
    Ok(())
}

#[tauri::command]
pub fn get_due_count(state: State<'_, AppState>) -> AppResult<i64> {
    state.db.with_conn(repos::count_due_cards)
}

#[tauri::command]
pub fn get_due_cards(
    state: State<'_, AppState>,
    deck_id: Option<String>,
    limit: Option<i64>,
) -> AppResult<Vec<ReviewCard>> {
    let limit = limit.unwrap_or(50);
    let app_data = state.app_data_dir.clone();
    state.db.with_conn(|conn| {
        let mut cards = repos::get_due_cards(conn, deck_id.as_deref(), limit)?;
        for item in &mut cards {
            if let Some(path) = &item.card.image_path {
                item.image_url = Some(resolve_image_path(&app_data, path).to_string_lossy().to_string());
            }
        }
        Ok(cards)
    })
}

#[tauri::command]
pub fn submit_review(
    app: AppHandle,
    state: State<'_, AppState>,
    card_id: String,
    result: i32,
) -> AppResult<i64> {
    state.db.with_conn(|conn| repos::submit_review(conn, &card_id, result))?;
    let count = state.db.with_conn(repos::count_due_cards)?;
    let _ = crate::windows::refresh_tray_count(&app, &state);
    Ok(count)
}

#[tauri::command]
pub fn get_last_used_deck_id(state: State<'_, AppState>) -> AppResult<Option<String>> {
    if let Ok(last) = state.last_used_deck_id.lock() {
        if last.is_some() {
            return Ok(last.clone());
        }
    }
    state.db.with_conn(repos::get_last_used_deck_id)
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
pub fn resolve_image_url(state: State<'_, AppState>, relative_path: String) -> AppResult<String> {
    Ok(resolve_image_path(&state.app_data_dir, &relative_path)
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
pub fn run_ocr(state: State<'_, AppState>, relative_path: String) -> AppResult<OcrResult> {
    crate::ocr::recognize_image(&state.app_data_dir, &relative_path, &state.ocr)
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
