use crate::cloud;
use crate::error::AppResult;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudSession {
    pub token: Option<String>,
}

#[tauri::command]
pub fn cloud_prepare_google_sign_in(
    app: tauri::AppHandle,
    cloud_url: String,
) -> AppResult<GoogleSignInStart> {
    Ok(GoogleSignInStart {
        sign_in_url: cloud::build_google_sign_in_url(&app, &cloud_url)?,
    })
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleSignInStart {
    pub sign_in_url: String,
}

#[tauri::command]
pub fn cloud_get_session() -> AppResult<CloudSession> {
    Ok(CloudSession {
        token: cloud::get_session_token()?,
    })
}

#[tauri::command]
pub fn cloud_set_session(token: String) -> AppResult<()> {
    cloud::save_session_token(&token)
}

#[tauri::command]
pub fn cloud_clear_session() -> AppResult<()> {
    cloud::clear_session_token()
}

#[tauri::command]
pub fn read_image_bytes(
    state: tauri::State<'_, crate::state::AppState>,
    relative_path: String,
) -> AppResult<Vec<u8>> {
    let path = crate::capture::resolve_image_path(&state.app_data_dir, &relative_path);
    Ok(std::fs::read(path)?)
}

#[tauri::command]
pub fn write_image_bytes(
    state: tauri::State<'_, crate::state::AppState>,
    hash: String,
    bytes: Vec<u8>,
) -> AppResult<String> {
    let relative = format!("images/{hash}.webp");
    let path = crate::capture::resolve_image_path(&state.app_data_dir, &relative);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, bytes)?;
    Ok(relative)
}
