use crate::models::EditorInitPayload;
use crate::ocr::SidecarOcrProvider;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub app_data_dir: PathBuf,
    pub ocr: SidecarOcrProvider,
    pub pending_editors: Mutex<HashMap<String, EditorInitPayload>>,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            ocr: SidecarOcrProvider::dev_fallback(),
            pending_editors: Mutex::new(HashMap::new()),
        }
    }

    pub fn store_editor_init(&self, label: &str, payload: EditorInitPayload) {
        if let Ok(mut pending) = self.pending_editors.lock() {
            pending.insert(label.to_string(), payload);
        }
    }

    pub fn get_editor_init(&self, label: &str) -> Option<EditorInitPayload> {
        self.pending_editors
            .lock()
            .ok()
            .and_then(|pending| pending.get(label).cloned())
    }

    pub fn remove_editor_init(&self, label: &str) {
        if let Ok(mut pending) = self.pending_editors.lock() {
            pending.remove(label);
        }
    }
}
