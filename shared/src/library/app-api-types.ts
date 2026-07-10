import type {
  AiCardsGenerateRequest,
  AiCardsGenerateResponse,
  AiQaGenerateResponse,
  ApiCard,
  ApiDeck,
  CompleteStudySessionRequest,
  RecordStudyEventsRequest,
  StartStudySessionRequest,
  StudyEventType,
  StudyMetrics,
  StudySessionMode,
  StudyTrack,
  UpdateDeckRequest,
  UpdateSchedulerConfigRequest,
} from "./api-types.js";
import type { ImageMask, OcrData, TextMask } from "../masks/masks.js";
import type { StudyFilter } from "./cloud-mappers.js";
import type { DeckSchedulerConfig, ReviewGrade } from "../study/scheduler.js";

export type { StudyFilter } from "./cloud-mappers.js";
export type { StudyEventType, StudyMetrics, StudySessionMode, StudyTrack } from "./api-types.js";
export type { ImageMask, OcrData, OcrWord, TextMask } from "../masks/masks.js";

export type StudyMode = "flashcards" | "learn" | "write" | "test" | "match";
export type DeckStudyMode = Exclude<StudyMode, "learn">;

export type Card = ApiCard & {
  imagePath?: string | null;
  boxNum?: number;
};

export type Deck = ApiDeck & {
  cardCount: number;
};

export interface ReviewCard {
  card: Card;
  imageUrl?: string;
}

export interface DeckExport {
  deck: Deck;
  cards: Card[];
}

export interface MaskAnswer {
  cardId: string;
  prompt: string;
  answer: string;
  kind: "text" | "image" | "qa";
}

export interface PermissionStatus {
  accessibility: boolean;
  screenRecording: boolean;
}

export type OcrResult = OcrData;

export interface ImageRegion {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  masks: ImageMask[];
  note?: string;
}

export interface EditorInitPayload {
  mode: "text" | "qa" | "image";
  content?: string;
  answer?: string;
  imagePath?: string;
  cardId?: string;
  deckId?: string;
  masks?: string;
  note?: string;
  ocrText?: string;
  ocrData?: string;
}

export interface AppApi {
  listDecks(): Promise<Deck[]>;
  createDeck(name: string): Promise<Deck>;
  updateDeck(deckId: string, patch: UpdateDeckRequest): Promise<Deck>;
  getSchedulerConfig(): Promise<DeckSchedulerConfig>;
  updateSchedulerConfig(config: DeckSchedulerConfig): Promise<DeckSchedulerConfig>;
  deleteDeck(deckId: string): Promise<void>;
  getLastUsedDeckId(): Promise<string | null>;
  exportDeck(deckId: string): Promise<DeckExport>;
  importDeck(data: DeckExport): Promise<void>;
  listCards(deckId?: string, query?: string): Promise<Card[]>;
  getCard(cardId: string): Promise<Card>;
  /** Persist full deck card order (gapless). IDs must match all non-deleted cards in the deck. */
  reorderCards(deckId: string, cardIds: string[]): Promise<void>;
  deleteCard(cardId: string): Promise<void>;
  openCardEditor(cardId: string): Promise<void>;
  submitReview(cardId: string, result: ReviewGrade): Promise<void>;
  getStudyMetrics(deckId?: string, tzOffsetMinutes?: number): Promise<StudyMetrics>;
  startStudySession(request: StartStudySessionRequest): Promise<{ sessionId: string }>;
  recordStudyEvents(sessionId: string, payload: RecordStudyEventsRequest): Promise<void>;
  completeStudySession(
    sessionId: string,
    payload: CompleteStudySessionRequest,
  ): Promise<void>;
  getDueCount(): Promise<number>;
  getDueCards(deckId?: string, limit?: number): Promise<ReviewCard[]>;
  getStudyCards(filter: StudyFilter, deckId?: string, limit?: number): Promise<ReviewCard[]>;
  subscribeLibraryChanged?(callback: () => void): () => void;
  resolveImageUrl(imagePath: string): Promise<string>;
  parseTextMasks(json: string): TextMask[];
  parseImageMasks(json: string): ImageMask[];
  saveTextCard(request: {
    deckId: string;
    content: string;
    masks: TextMask[];
    note?: string;
    sourceHint?: string;
  }): Promise<Card>;
  saveQaCard(request: {
    deckId: string;
    content: string;
    answer: string;
    masks: TextMask[];
    note?: string;
    sourceHint?: string;
  }): Promise<Card>;
  saveQaCards(request: {
    deckId: string;
    cards: Array<{
      content: string;
      answer: string;
      masks: TextMask[];
      note?: string;
      sourceHint?: string;
    }>;
  }): Promise<Card[]>;
  updateTextCard(request: {
    cardId: string;
    deckId: string;
    content: string;
    masks: TextMask[];
    note?: string;
  }): Promise<Card>;
  updateQaCard(request: {
    cardId: string;
    deckId: string;
    content: string;
    answer: string;
    masks: TextMask[];
    note?: string;
  }): Promise<Card>;
  saveImageCards(request: {
    deckId: string;
    imagePath: string;
    ocrText?: string;
    ocrData?: string;
    regions: ImageRegion[];
    sourceHint?: string;
  }): Promise<Card[]>;
  updateImageCard(request: {
    cardId: string;
    deckId: string;
    masks: ImageMask[];
    note?: string;
    ocrText?: string;
    ocrData?: string;
  }): Promise<Card>;
  runOcr(imagePath: string): Promise<OcrResult>;
  getEditorInit(windowLabel: string): Promise<EditorInitPayload | null>;
  openAccessibilitySettings(): Promise<void>;
  openScreenRecordingSettings(): Promise<void>;
  triggerTextCapture?: (deckId?: string) => Promise<void>;
  triggerScreenshotCapture?: (deckId?: string) => Promise<void>;
  openNewCardEditor?: (request: {
    deckId: string;
    mode: "text" | "qa" | "image";
  }) => Promise<void>;
  qaGenerate(
    text: string,
    kind: "qa" | "choice",
    count?: number,
  ): Promise<AiQaGenerateResponse>;
  cardsGenerate(request: AiCardsGenerateRequest): Promise<AiCardsGenerateResponse>;
  getAccount(): Promise<{ plan: string; aiCreditsRemaining: number }>;
  uploadImageBlob(data: ArrayBuffer, mime: string): Promise<string>;
  askAi(
    cardContext: string,
    question: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown>;
}
