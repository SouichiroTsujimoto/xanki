import type { ApiCard, ApiDeck } from "./api-types.js";
import {
  imageMasksSchema,
  textMasksSchema,
  type ImageMask,
  type TextMask,
} from "./masks.js";

export type StudyFilter = "due" | "all" | "starred";

export type MappedDeck = ApiDeck & { cardCount: number };

export type MappedCard = ApiCard & { imagePath?: string };

export function mapApiDeck(raw: {
  id: string;
  name: string;
  cardCount?: number;
  createdAt?: number;
  updatedAt?: number;
}): MappedDeck {
  return {
    id: raw.id,
    name: raw.name,
    cardCount: raw.cardCount ?? 0,
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? Date.now(),
  };
}

export function mapApiCard(raw: ApiCard, opts?: { imagePath?: string }): MappedCard {
  return {
    id: raw.id,
    deckId: raw.deckId,
    kind: raw.kind,
    content: raw.content ?? undefined,
    answer: raw.answer ?? undefined,
    imageHash: raw.imageHash ?? undefined,
    imagePath: opts?.imagePath,
    ocrText: raw.ocrText ?? undefined,
    ocrData: raw.ocrData ?? undefined,
    masks: raw.masks,
    note: raw.note ?? undefined,
    sourceHint: raw.sourceHint ?? undefined,
    starred: Boolean(raw.starred),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    boxNum: raw.boxNum,
    dueAt: raw.dueAt,
  };
}

export function mapApiCardWithImagePath(
  raw: ApiCard,
  imagePathForHash: (hash: string) => string,
): MappedCard {
  return mapApiCard(raw, {
    imagePath: raw.imageHash ? imagePathForHash(raw.imageHash) : undefined,
  });
}

export function filterStudyCards<T extends { deckId: string; dueAt?: number; starred?: boolean }>(
  cards: T[],
  filter: StudyFilter,
  deckId?: string,
): T[] {
  const now = Date.now();
  let filtered = cards;
  if (deckId) {
    filtered = filtered.filter((card) => card.deckId === deckId);
  }
  switch (filter) {
    case "due":
      return filtered.filter((card) => (card.dueAt ?? 0) <= now);
    case "starred":
      return filtered.filter((card) => card.starred);
    case "all":
      return filtered;
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

export function countDueCards<T extends { dueAt?: number }>(
  cards: T[],
  now = Date.now(),
): number {
  return cards.filter((card) => Number(card.dueAt ?? 0) <= now).length;
}

export function parseTextMasksJson(raw: string): TextMask[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = textMasksSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function parseImageMasksJson(raw: string): ImageMask[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = imageMasksSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
