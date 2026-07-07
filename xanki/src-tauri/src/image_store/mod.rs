use crate::error::{AppError, AppResult};
use image::codecs::webp::WebPEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, ImageEncoder, RgbaImage};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

const MAX_EDGE: u32 = 3000;

pub struct StoredImage {
    pub relative_path: String,
    pub hash: String,
    pub size: u64,
}

pub fn resolve_image_path(app_data_dir: &Path, relative: &str) -> PathBuf {
    app_data_dir.join(relative)
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    hex::encode(digest)
}

fn resize_if_needed(img: DynamicImage) -> DynamicImage {
    let (w, h) = img.dimensions();
    let max_dim = w.max(h);
    if max_dim <= MAX_EDGE {
        return img;
    }
    let scale = MAX_EDGE as f64 / max_dim as f64;
    let new_w = (w as f64 * scale).round().max(1.0) as u32;
    let new_h = (h as f64 * scale).round().max(1.0) as u32;
    img.resize(new_w, new_h, FilterType::Lanczos3)
}

fn encode_webp(img: &DynamicImage) -> AppResult<Vec<u8>> {
    let rgba: RgbaImage = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    let mut buf = Vec::new();
    WebPEncoder::new_lossless(&mut buf)
        .write_image(rgba.as_raw(), w, h, image::ExtendedColorType::Rgba8)
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    Ok(buf)
}

pub fn finalize_image(app_data_dir: &Path, relative_path: &str) -> AppResult<StoredImage> {
    let source = resolve_image_path(app_data_dir, relative_path);
    if !source.exists() {
        return Err(AppError::NotFound(format!(
            "image not found: {relative_path}"
        )));
    }

    let img = image::open(&source)
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    let resized = resize_if_needed(img);
    let webp_bytes = encode_webp(&resized)?;
    let hash = sha256_hex(&webp_bytes);
    let relative = format!("images/{hash}.webp");
    let dest = app_data_dir.join(&relative);

    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent)?;
    }

    if dest.exists() {
        let existing = fs::read(&dest)?;
        if existing == webp_bytes {
            if source != dest {
                let _ = fs::remove_file(&source);
            }
            return Ok(StoredImage {
                relative_path: relative,
                hash,
                size: webp_bytes.len() as u64,
            });
        }
    }

    fs::write(&dest, &webp_bytes)?;
    if source != dest {
        let _ = fs::remove_file(&source);
    }

    Ok(StoredImage {
        relative_path: relative,
        hash,
        size: webp_bytes.len() as u64,
    })
}

pub fn backfill_image_hashes(conn: &rusqlite::Connection, app_data_dir: &Path) -> AppResult<()> {
    let mut stmt = conn.prepare(
        "SELECT id, image_path FROM cards
         WHERE kind = 'image' AND deleted_at IS NULL
           AND image_path IS NOT NULL
           AND (image_hash IS NULL OR image_hash = '')",
    )?;
    let rows: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<_, _>>()?;

    for (card_id, image_path) in rows {
        if let Ok(stored) = finalize_image(app_data_dir, &image_path) {
            conn.execute(
                "UPDATE cards SET image_path = ?1, image_hash = ?2, updated_at = ?3 WHERE id = ?4",
                rusqlite::params![stored.relative_path, stored.hash, chrono::Utc::now().timestamp_millis(), card_id],
            )?;
        }
    }
    Ok(())
}
