use crate::error::{AppError, AppResult};
use crate::models::OcrResult;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};

pub trait OcrProvider: Send + Sync {
    fn recognize(&self, image_path: &Path) -> AppResult<OcrResult>;
}

pub struct SidecarOcrProvider {
    sidecar_path: PathBuf,
}

impl SidecarOcrProvider {
    pub fn from_app(app: &AppHandle) -> AppResult<Self> {
        let resource_dir = app
            .path()
            .resource_dir()
            .map_err(|e| AppError::Ocr(e.to_string()))?;
        let bundled = resource_dir.join("sidecar/ocr/xanki-ocr");
        if bundled.exists() {
            return Ok(Self {
                sidecar_path: bundled,
            });
        }

        let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("sidecar/ocr/xanki-ocr");
        if dev.exists() {
            return Ok(Self { sidecar_path: dev });
        }

        Err(AppError::Ocr("OCR sidecar binary not found".into()))
    }

    pub fn dev_fallback() -> Self {
        Self {
            sidecar_path: PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("sidecar/ocr/xanki-ocr"),
        }
    }
}

impl OcrProvider for SidecarOcrProvider {
    fn recognize(&self, image_path: &Path) -> AppResult<OcrResult> {
        if !image_path.exists() {
            return Err(AppError::NotFound(format!(
                "image not found: {}",
                image_path.display()
            )));
        }

        let output = Command::new(&self.sidecar_path)
            .arg(image_path)
            .output()
            .map_err(|e| AppError::Ocr(format!("failed to run OCR sidecar: {e}")))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::Ocr(format!("OCR failed: {stderr}")));
        }

        serde_json::from_slice(&output.stdout).map_err(|e| AppError::Ocr(e.to_string()))
    }
}

pub fn recognize_image(
    app_data_dir: &Path,
    relative_path: &str,
    provider: &SidecarOcrProvider,
) -> AppResult<OcrResult> {
    let path = app_data_dir.join(relative_path);
    provider.recognize(&path)
}
