mod region;

pub use region::{adjust_region_for_crop, is_full_image_region};

use crate::error::{AppError, AppResult};
use std::path::{Path, PathBuf};
use std::process::Command;
use uuid::Uuid;

pub trait CaptureProvider: Send + Sync {
    fn capture_interactive(&self, dest: &Path) -> AppResult<Option<PathBuf>>;
}

pub struct ScreencaptureProvider;

impl CaptureProvider for ScreencaptureProvider {
    fn capture_interactive(&self, dest: &Path) -> AppResult<Option<PathBuf>> {
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let status = Command::new("screencapture")
            .args(["-i", "-x", dest.to_string_lossy().as_ref()])
            .status()?;

        if !status.success() || !dest.exists() {
            return Ok(None);
        }

        Ok(Some(dest.to_path_buf()))
    }
}

pub fn capture_to_app_data(app_data_dir: &Path) -> AppResult<Option<String>> {
    let images_dir = app_data_dir.join("images");
    std::fs::create_dir_all(&images_dir)?;
    let filename = format!("{}.png", Uuid::now_v7());
    let dest = images_dir.join(&filename);
    let provider = ScreencaptureProvider;
    let captured = provider.capture_interactive(&dest)?;
    Ok(captured.map(|_| format!("images/{filename}")))
}

pub fn resolve_image_path(app_data_dir: &Path, relative: &str) -> PathBuf {
    app_data_dir.join(relative)
}

pub fn crop_image(
    app_data_dir: &Path,
    relative_path: &str,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> AppResult<String> {
    let source = resolve_image_path(app_data_dir, relative_path);
    if !source.exists() {
        return Err(AppError::NotFound(format!("image not found: {relative_path}")));
    }

    let img = image::open(&source).map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    let x0 = x.round().max(0.0) as u32;
    let y0 = y.round().max(0.0) as u32;
    let w0 = w.round().max(1.0) as u32;
    let h0 = h.round().max(1.0) as u32;
    let cropped = img.crop_imm(x0, y0, w0, h0);

    let filename = format!("{}.png", Uuid::now_v7());
    let relative = format!("images/{filename}");
    let dest = app_data_dir.join(&relative);
    cropped
        .save(&dest)
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    Ok(relative)
}
