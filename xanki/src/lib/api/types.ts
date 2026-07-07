import type { Card, Deck, ReviewCard, StudyFilter, TextMask } from "../../types";

export interface AppApi {
  listDecks(): Promise<Deck[]>;
  listCards(deckId?: string, query?: string): Promise<Card[]>;
  submitReview(cardId: string, result: 0 | 1): Promise<void>;
  getStudyCards(deckId?: string, filter?: StudyFilter, limit?: number): Promise<ReviewCard[]>;
}

export interface AiApi {
  suggestMasks(content: string): Promise<TextMask[]>;
}
