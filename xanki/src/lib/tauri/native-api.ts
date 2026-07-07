import { parseImageMasksJson, parseTextMasksJson } from "@xanki/shared";
import { invoke } from "@tauri-apps/api/core";
import type {
  EditorInitPayload,
  ImageMask,
  ImageRegion,
  OcrResult,
  PermissionStatus,
  TextMask,
} from "@xanki/ui";

export const nativeApi = {
  resolveImageUrl: (imagePath: string) => invoke<string>("resolve_image_url", { imagePath }),
  runOcr: (imagePath: string) => invoke<OcrResult>("run_ocr", { imagePath }),
  getEditorInit: (windowLabel: string) =>
    invoke<EditorInitPayload | null>("get_editor_init", { windowLabel }),
  openAccessibilitySettings: () => invoke<void>("open_accessibility_settings"),
  openScreenRecordingSettings: () => invoke<void>("open_screen_recording_settings"),
  checkPermissions: () => invoke<PermissionStatus>("check_permissions"),
  triggerTextCapture: (deckId?: string) =>
    invoke<void>("trigger_text_capture", { deckId: deckId ?? null }),
  triggerScreenshotCapture: (deckId?: string) =>
    invoke<void>("trigger_screenshot_capture", { deckId: deckId ?? null }),
  openNewCardEditor: (request: { deckId: string; mode: "text" | "qa" | "image" }) =>
    invoke<void>("open_new_card_editor", { deckId: request.deckId, mode: request.mode }),
};

export function parseTextMasks(raw: string): TextMask[] {
  return parseTextMasksJson(raw);
}

export function parseImageMasks(raw: string): ImageMask[] {
  return parseImageMasksJson(raw);
}

export type { ImageRegion, OcrResult, PermissionStatus, TextMask, ImageMask, EditorInitPayload };
