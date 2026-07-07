import type {
  ApiCard,
  ApiDeck,
  CreateCardRequest,
  CreateDeckRequest,
  UpdateCardRequest,
  UpdateDeckRequest,
} from "@xanki/shared";

export type StudyFilter = "due" | "all" | "starred";

export type StudyMode = "flashcards" | "learn" | "write" | "test" | "match";

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

export interface TextMask {
  type: "range";
  start: number;
  end: number;
}

export interface RectMask {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
}

export interface OcrMask {
  type: "ocr";
  wordIds: number[];
  color?: string;
}

export type ImageMask = RectMask | OcrMask;

export interface OcrWord {
  id: number;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrResult {
  words: OcrWord[];
  fullText: string;
}

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
  updateDeck(deckId: string, name: string): Promise<Deck>;
  deleteDeck(deckId: string): Promise<void>;
  getLastUsedDeckId(): Promise<string | null>;
  exportDeck(deckId: string): Promise<DeckExport>;
  importDeck(data: DeckExport): Promise<void>;
  listCards(deckId?: string, query?: string): Promise<Card[]>;
  getCard(cardId: string): Promise<Card>;
  deleteCard(cardId: string): Promise<void>;
  toggleStar(cardId: string): Promise<Card>;
  openCardEditor(cardId: string): Promise<void>;
  submitReview(cardId: string, result: 0 | 1): Promise<void>;
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
}

export type {
  ApiCard,
  ApiDeck,
  CreateCardRequest,
  CreateDeckRequest,
  UpdateCardRequest,
  UpdateDeckRequest,
};
