mod auth_loopback;

use crate::error::{AppError, AppResult};
use keyring::Entry;
use tauri::AppHandle;

pub use auth_loopback::start_auth_loopback;

/// macOS Keychain の service 名（Entry ごとに同一キーで read/write される）
const SERVICE: &str = "com.souic.xanki.cloud";
const ACCOUNT: &str = "session";

fn open_entry() -> AppResult<Entry> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| AppError::Other(format!("keychain entry: {e}")))
}

pub fn save_session_token(token: &str) -> AppResult<()> {
    let entry = open_entry()?;
    entry
        .set_password(token)
        .map_err(|e| AppError::Other(format!("keychain set: {e}")))?;
    let saved = entry
        .get_password()
        .map_err(|e| AppError::Other(format!("keychain verify: {e}")))?;
    if saved != token {
        return Err(AppError::Other("keychain verify: token mismatch".into()));
    }
    Ok(())
}

pub fn get_session_token() -> AppResult<Option<String>> {
    match open_entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Other(format!("keychain get: {e}"))),
    }
}

pub fn clear_session_token() -> AppResult<()> {
    match open_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::Other(format!("keychain delete: {e}"))),
    }
}

pub fn handle_auth_callback_url(url: &str) -> Option<String> {
    const PREFIX: &str = "xanki://auth/callback";
    if !url.starts_with(PREFIX) {
        return None;
    }
    let query = url.split('?').nth(1)?;
    for pair in query.split('&') {
        let (key, value) = pair.split_once('=')?;
        if key == "token" {
            return Some(decode_form_component(value));
        }
    }
    None
}

fn decode_form_component(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            b'%' if i + 2 < bytes.len() => {
                if let Ok(byte) = u8::from_str_radix(&value[i + 1..i + 3], 16) {
                    out.push(byte);
                    i += 3;
                } else {
                    out.push(bytes[i]);
                    i += 1;
                }
            }
            byte => {
                out.push(byte);
                i += 1;
            }
        }
    }
    String::from_utf8(out).unwrap_or_else(|_| value.to_string())
}

pub fn build_google_sign_in_url(app: &AppHandle, cloud_url: &str) -> AppResult<String> {
    let port = start_auth_loopback(app)?;
    let return_url = format!("http://127.0.0.1:{port}/callback");
    let base = cloud_url.trim_end_matches('/');
    Ok(format!(
        "{base}/auth/desktop-sign-in?return={}",
        encode_form_component(&return_url)
    ))
}

fn encode_form_component(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}
