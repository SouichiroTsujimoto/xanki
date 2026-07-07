import { invoke } from "@tauri-apps/api/core";
import type {
  Card,
  Deck,
  DeckExport,
  EditorInitPayload,
  ImageMask,
  ImageRegion,
  OcrResult,
  PermissionStatus,
  ReviewCard,
  StudyFilter,
  TextMask,
} from "../../types";

export const api = {
  listDecks: () => invoke<Deck[]>("list_decks"),
  createDeck: (name: string) => invoke<Deck>("create_deck", { name }),
  updateDeck: (deckId: string, name: string) =>
    invoke<Deck>("update_deck", { deckId, name }),
  deleteDeck: (deckId: string) => invoke<void>("delete_deck", { deckId }),
  ensureDefaultDeck: () => invoke<Deck>("ensure_default_deck"),
  listCards: (deckId?: string, query?: string) =>
    invoke<Card[]>("list_cards", { deckId, query }),
  getCard: (cardId: string) => invoke<Card>("get_card", { cardId }),
  saveTextCard: (request: {
    deckId: string;
    content: string;
    masks: TextMask[];
    note?: string;
    sourceHint?: string;
  }) => invoke<Card>("save_text_card", { request }),
  saveQaCard: (request: {
    deckId: string;
    content: string;
    answer: string;
    masks: TextMask[];
    note?: string;
    sourceHint?: string;
  }) => invoke<Card>("save_qa_card", { request }),
  saveImageCards: (request: {
    deckId: string;
    imagePath: string;
    ocrText?: string;
    ocrData?: string;
    regions: ImageRegion[];
    sourceHint?: string;
  }) => invoke<Card[]>("save_image_cards", { request }),
  updateTextCard: (request: {
    cardId: string;
    deckId: string;
    content: string;
    masks: TextMask[];
    note?: string;
  }) => invoke<Card>("update_text_card", { request }),
  updateQaCard: (request: {
    cardId: string;
    deckId: string;
    content: string;
    answer: string;
    masks: TextMask[];
    note?: string;
  }) => invoke<Card>("update_qa_card", { request }),
  updateImageCard: (request: {
    cardId: string;
    deckId: string;
    masks: ImageMask[];
    note?: string;
    ocrText?: string;
    ocrData?: string;
  }) => invoke<Card>("update_image_card", { request }),
  openCardEditor: (cardId: string) =>
    invoke<void>("open_card_editor", { cardId }),
  deleteCard: (cardId: string) => invoke<void>("delete_card", { cardId }),
  toggleStar: (cardId: string) => invoke<Card>("toggle_star", { cardId }),
  duplicateCard: (cardId: string) => invoke<Card>("duplicate_card", { cardId }),
  resetCardProgress: (cardId: string) =>
    invoke<Card>("reset_card_progress", { cardId }),
  getDueCount: () => invoke<number>("get_due_count"),
  getDueCards: (deckId?: string, limit?: number) =>
    invoke<ReviewCard[]>("get_due_cards", { deckId, limit }),
  getStudyCards: (filter: StudyFilter, deckId?: string, limit?: number) =>
    invoke<ReviewCard[]>("get_study_cards", { filter, deckId, limit }),
  submitReview: (cardId: string, result: 0 | 1) =>
    invoke<number>("submit_review", { cardId, result }),
  exportDeck: (deckId: string) => invoke<DeckExport>("export_deck", { deckId }),
  importDeck: (exportData: DeckExport) =>
    invoke<Deck>("import_deck", { export: exportData }),
  getLastUsedDeckId: () => invoke<string | null>("get_last_used_deck_id"),
  getEditorInit: (windowLabel: string) =>
    invoke<EditorInitPayload | null>("get_editor_init", { windowLabel }),
  clearEditorInit: (windowLabel: string) =>
    invoke<void>("clear_editor_init", { windowLabel }),
  checkPermissions: () => invoke<PermissionStatus>("check_permissions"),
  openAccessibilitySettings: () => invoke<void>("open_accessibility_settings"),
  openScreenRecordingSettings: () =>
    invoke<void>("open_screen_recording_settings"),
  resolveImageUrl: (relativePath: string) =>
    invoke<string>("resolve_image_url", { relativePath }),
  runOcr: (relativePath: string) =>
    invoke<OcrResult>("run_ocr", { relativePath }),
  cropImageRegion: (
    relativePath: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) =>
    invoke<string>("crop_image_region", {
      relativePath,
      x,
      y,
      w,
      h,
    }),
};

export function parseTextMasks(raw: string): TextMask[] {
  return JSON.parse(raw) as TextMask[];
}

export function parseImageMasks(raw: string): ImageMask[] {
  return JSON.parse(raw) as ImageMask[];
}
