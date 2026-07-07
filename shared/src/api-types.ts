import type { CardKind } from "./sync.js";

export interface ApiDeck {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  cardCount?: number;
  deletedAt?: number | null;
}

export interface ApiCard {
  id: string;
  deckId: string;
  kind: CardKind;
  content?: string | null;
  answer?: string | null;
  imageHash?: string | null;
  ocrText?: string | null;
  ocrData?: string | null;
  masks: string;
  note?: string | null;
  sourceHint?: string | null;
  starred?: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
  boxNum?: number;
  dueAt?: number;
  lastResult?: number | null;
}

export interface ApiReviewState {
  cardId: string;
  box: number;
  dueAt: number;
  lastResult?: number | null;
  updatedAt: number;
}

export interface CreateDeckRequest {
  name: string;
}

export interface UpdateDeckRequest {
  name: string;
}

export interface CreateCardRequest {
  deckId: string;
  kind: CardKind;
  content?: string;
  answer?: string;
  imageHash?: string;
  ocrText?: string;
  ocrData?: string;
  masks: string;
  note?: string;
  sourceHint?: string;
}

export interface UpdateCardRequest {
  deckId?: string;
  content?: string;
  answer?: string;
  imageHash?: string;
  ocrText?: string;
  ocrData?: string;
  masks?: string;
  note?: string;
  starred?: boolean;
}

export interface SubmitReviewRequest {
  cardId: string;
  result: 0 | 1;
}

export interface AiQaGenerateRequest {
  text: string;
  count?: number;
  kind: "qa" | "choice";
}

export interface AiQaItem {
  question: string;
  answer: string;
  choices?: string[];
}

export interface AiQaGenerateResponse {
  items: AiQaItem[];
}

export interface AiAskRequest {
  cardContext: string;
  question: string;
}

export interface BillingCheckoutResponse {
  url: string;
}
