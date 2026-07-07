use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TextMask {
    #[serde(rename = "range")]
    Range { start: usize, end: usize },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ImageMask {
    #[serde(rename = "rect")]
    Rect {
        x: f64,
        y: f64,
        w: f64,
        h: f64,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        color: Option<String>,
    },
    #[serde(rename = "ocr")]
    Ocr {
        word_ids: Vec<usize>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        color: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrWord {
    pub id: usize,
    pub text: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrResult {
    pub words: Vec<OcrWord>,
    pub full_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageRegion {
    pub crop_x: f64,
    pub crop_y: f64,
    pub crop_w: f64,
    pub crop_h: f64,
    pub masks: Vec<ImageMask>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveImageCardsRequest {
    pub deck_id: String,
    pub image_path: String,
    pub ocr_text: Option<String>,
    pub ocr_data: Option<String>,
    pub regions: Vec<ImageRegion>,
    pub source_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionStatus {
    pub accessibility: bool,
    pub screen_recording: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportTextResult {
    pub text: Option<String>,
    pub latency_ms: u128,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorInitPayload {
    pub mode: String,
    pub content: Option<String>,
    pub answer: Option<String>,
    pub image_path: Option<String>,
    pub card_id: Option<String>,
    pub deck_id: Option<String>,
    pub masks: Option<String>,
    pub note: Option<String>,
    pub ocr_text: Option<String>,
    pub ocr_data: Option<String>,
}
