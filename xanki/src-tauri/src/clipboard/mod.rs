use crate::error::{AppError, AppResult};
use std::time::{Duration, Instant};

const COPY_WAIT_MS: u64 = 200;
const COPY_POLL_MS: u64 = 25;

pub struct ClipboardService;

impl ClipboardService {
    pub fn import_selected_text() -> AppResult<(Option<String>, u128)> {
        let started = Instant::now();
        let backup = Self::read_clipboard_text()?;

        // Let the global shortcut keys release before synthesizing Cmd+C.
        std::thread::sleep(Duration::from_millis(80));
        Self::simulate_copy()?;

        let imported = Self::wait_for_clipboard_change(&backup, COPY_WAIT_MS)?;
        Self::restore_clipboard(&backup)?;

        let text = imported.filter(|value| !value.trim().is_empty());

        Ok((text, started.elapsed().as_millis()))
    }

    fn wait_for_clipboard_change(
        backup: &Option<String>,
        max_wait_ms: u64,
    ) -> AppResult<Option<String>> {
        let deadline = Instant::now() + Duration::from_millis(max_wait_ms);
        while Instant::now() < deadline {
            if let Some(text) = Self::read_clipboard_text()? {
                let changed = backup
                    .as_ref()
                    .map(|previous| previous != &text)
                    .unwrap_or(!text.is_empty());
                if changed {
                    return Ok(Some(text));
                }
            }
            std::thread::sleep(Duration::from_millis(COPY_POLL_MS));
        }

        Self::read_clipboard_text()
    }

    fn read_clipboard_text() -> AppResult<Option<String>> {
        let mut clipboard = arboard::Clipboard::new()
            .map_err(|e| AppError::Clipboard(e.to_string()))?;
        match clipboard.get_text() {
            Ok(text) => Ok(Some(text)),
            Err(error) => {
                let message = error.to_string().to_lowercase();
                if message.contains("no text") || message.contains("empty") {
                    Ok(None)
                } else {
                    Err(AppError::Clipboard(error.to_string()))
                }
            }
        }
    }

    fn restore_clipboard(backup: &Option<String>) -> AppResult<()> {
        let mut clipboard = arboard::Clipboard::new()
            .map_err(|e| AppError::Clipboard(e.to_string()))?;
        match backup {
            Some(text) => clipboard
                .set_text(text.clone())
                .map_err(|e| AppError::Clipboard(e.to_string()))?,
            None => {
                let _ = clipboard.clear();
            }
        }
        Ok(())
    }

    fn simulate_copy() -> AppResult<()> {
        use enigo::{Direction, Enigo, Key, Keyboard, Settings};
        let mut enigo = Enigo::new(&Settings::default())
            .map_err(|e| AppError::Clipboard(format!("enigo init: {e}")))?;

        for key in [Key::Alt, Key::Meta, Key::Shift, Key::Control] {
            let _ = enigo.key(key, Direction::Release);
        }

        enigo
            .key(Key::Meta, Direction::Press)
            .map_err(|e| AppError::Clipboard(format!("meta press: {e}")))?;
        enigo
            .key(Key::Unicode('c'), Direction::Click)
            .map_err(|e| AppError::Clipboard(format!("c click: {e}")))?;
        enigo
            .key(Key::Meta, Direction::Release)
            .map_err(|e| AppError::Clipboard(format!("meta release: {e}")))?;
        Ok(())
    }
}
