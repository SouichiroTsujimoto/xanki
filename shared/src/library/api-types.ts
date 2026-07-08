import type { CardKind } from "../sync/sync.js";
import type { DeckSchedulerConfig } from "../study/scheduler.js";

export interface ApiDeck {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  cardCount?: number;
  deletedAt?: number | null;
  schedulerConfig?: DeckSchedulerConfig | null;
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
  name?: string;
  schedulerConfig?: DeckSchedulerConfig;
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
  result: 0 | 1 | 2 | 3;
  tzOffsetMinutes?: number;
}

export type StudyTrack = "deck" | "leitner";

export type StudySessionMode = "flashcards" | "write" | "test" | "match" | "learn";

export type StudyEventType =
  | "leitner_review"
  | "deck_card_known"
  | "deck_card_still"
  | "session_complete";

export interface StudyMetrics {
  activity: {
    todayStudyCount: number;
    todayLeitnerCount: number;
    todayDeckStudyCount: number;
    streakDays: number;
    totalStudyCount: number;
  };
  global: {
    masteryPercent: number;
    boxDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
    totalCards: number;
  };
  deck?: {
    deckId: string;
    masteryPercent: number;
    boxDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
    dueCount: number;
    cardCount: number;
  };
}

export interface StartStudySessionRequest {
  track: StudyTrack;
  deckId?: string | null;
  mode?: StudySessionMode | null;
  cardsTotal: number;
  tzOffsetMinutes?: number;
}

export interface StartStudySessionResponse {
  sessionId: string;
}

export interface RecordStudyEventsRequest {
  tzOffsetMinutes: number;
  events: Array<{
    eventType: StudyEventType;
    cardId?: string | null;
    deckId?: string | null;
    grade?: number | null;
  }>;
}

export interface CompleteStudySessionRequest {
  cardsCompleted: number;
  tzOffsetMinutes: number;
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
