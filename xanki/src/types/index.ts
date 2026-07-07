export interface Deck {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  cardCount: number;
}

export interface Card {
  id: string;
  deckId: string;
  kind: "text" | "image" | "qa";
  content?: string;
  answer?: string;
  imagePath?: string;
  imageHash?: string;
  ocrText?: string;
  ocrData?: string;
  masks: string;
  note?: string;
  sourceHint?: string;
  createdAt: number;
  updatedAt: number;
  boxNum?: number;
  dueAt?: number;
  starred?: boolean;
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

export interface ReviewCard {
  card: Card;
  imageUrl?: string;
}

export interface PermissionStatus {
  accessibility: boolean;
  screenRecording: boolean;
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

export type StudyFilter = "due" | "all" | "starred";

export type StudyMode = "flashcards" | "learn" | "write" | "test" | "match";

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

export interface MaskSuggester {
  suggest(_content: string): Promise<TextMask[]>;
}

export class NoOpMaskSuggester implements MaskSuggester {
  async suggest(): Promise<TextMask[]> {
    return [];
  }
}
