use crate::error::{AppError, AppResult};
use keyring::Entry;

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
