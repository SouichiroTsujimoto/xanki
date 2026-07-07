use crate::models::{ImageMask, ImageRegion, OcrResult, OcrWord};

pub fn is_full_image_region(region: &ImageRegion, image_w: u32, image_h: u32) -> bool {
    if region.crop_x.abs() > 0.5 || region.crop_y.abs() > 0.5 {
        return false;
    }

    let crop_w = region.crop_w.round() as u32;
    let crop_h = region.crop_h.round() as u32;
    crop_w >= image_w.saturating_sub(1)
        && crop_h >= image_h.saturating_sub(1)
        && (region.crop_w - image_w as f64).abs() <= 1.0
        && (region.crop_h - image_h as f64).abs() <= 1.0
}

pub fn adjust_region_for_crop(
    region: &ImageRegion,
    ocr_data: Option<&str>,
) -> (Vec<ImageMask>, Option<String>, Option<String>) {
    let crop_x = region.crop_x.round();
    let crop_y = region.crop_y.round();
    let crop_w = region.crop_w.round();
    let crop_h = region.crop_h.round();

    let adjusted_masks: Vec<ImageMask> = region
        .masks
        .iter()
        .map(|mask| match mask {
            ImageMask::Rect { x, y, w, h, color } => ImageMask::Rect {
                x: x - crop_x,
                y: y - crop_y,
                w: *w,
                h: *h,
                color: color.clone(),
            },
            ImageMask::Ocr { word_ids, color } => ImageMask::Ocr {
                word_ids: word_ids.clone(),
                color: color.clone(),
            },
        })
        .collect();

    let Some(raw_ocr) = ocr_data else {
        return (adjusted_masks, None, None);
    };

    let Ok(full_ocr) = serde_json::from_str::<OcrResult>(raw_ocr) else {
        return (adjusted_masks, None, None);
    };

    let mut cropped_words = Vec::new();
    let mut id_map = std::collections::HashMap::new();

    for word in full_ocr.words {
        if !word_in_crop(&word, crop_x, crop_y, crop_w, crop_h) {
            continue;
        }

        let new_id = cropped_words.len();
        id_map.insert(word.id, new_id);
        cropped_words.push(OcrWord {
            id: new_id,
            text: word.text,
            x: word.x - crop_x,
            y: word.y - crop_y,
            w: word.w,
            h: word.h,
        });
    }

    let remapped_masks: Vec<ImageMask> = adjusted_masks
        .into_iter()
        .filter_map(|mask| match mask {
            ImageMask::Ocr { word_ids, color } => {
                let remapped: Vec<usize> = word_ids
                    .iter()
                    .filter_map(|id| id_map.get(id).copied())
                    .collect();
                if remapped.is_empty() {
                    None
                } else {
                    Some(ImageMask::Ocr {
                        word_ids: remapped,
                        color: color.clone(),
                    })
                }
            }
            other => Some(other),
        })
        .collect();

    let cropped_ocr = OcrResult {
        full_text: cropped_words
            .iter()
            .map(|word| word.text.as_str())
            .collect::<Vec<_>>()
            .join(" "),
        words: cropped_words,
    };

    let ocr_json = serde_json::to_string(&cropped_ocr).ok();
    (
        remapped_masks,
        Some(cropped_ocr.full_text.clone()),
        ocr_json,
    )
}

fn word_in_crop(word: &OcrWord, crop_x: f64, crop_y: f64, crop_w: f64, crop_h: f64) -> bool {
    let center_x = word.x + word.w / 2.0;
    let center_y = word.y + word.h / 2.0;
    center_x >= crop_x
        && center_y >= crop_y
        && center_x <= crop_x + crop_w
        && center_y <= crop_y + crop_h
}
