export type LeitnerBox = 1 | 2 | 3 | 4 | 5;

export type BoxDistribution = Record<LeitnerBox, number>;

export const EMPTY_BOX_DISTRIBUTION: BoxDistribution = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

type StudyEventType =
  | "leitner_review"
  | "deck_card_known"
  | "deck_card_still"
  | "session_complete";

export function clampBox(boxNum: number | undefined | null): LeitnerBox {
  const value = boxNum ?? 1;
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return value as LeitnerBox;
}

export function boxToScore(boxNum: number | undefined | null): number {
  return ((clampBox(boxNum) - 1) / 4) * 100;
}

export function computeMasteryPercent(cards: { boxNum?: number | null }[]): number {
  if (cards.length === 0) return 0;
  const total = cards.reduce((sum, card) => sum + boxToScore(card.boxNum), 0);
  return Math.round(total / cards.length);
}

export function computeBoxDistribution(
  cards: { boxNum?: number | null }[],
): BoxDistribution {
  const distribution: BoxDistribution = { ...EMPTY_BOX_DISTRIBUTION };
  for (const card of cards) {
    const box = clampBox(card.boxNum);
    distribution[box] += 1;
  }
  return distribution;
}

/** Client tz offset in minutes east of UTC (JS Date.getTimezoneOffset() * -1). */
export function localDateKey(
  occurredAtMs: number,
  tzOffsetMinutes: number,
): string {
  const localMs = occurredAtMs + tzOffsetMinutes * 60_000;
  const date = new Date(localMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function countDueCardsForDeck<T extends { deckId: string; dueAt?: number | null }>(
  cards: T[],
  deckId: string,
  now = Date.now(),
): number {
  return cards.filter(
    (card) => card.deckId === deckId && Number(card.dueAt ?? 0) <= now,
  ).length;
}

export function computeStreakDays(
  activeLocalDates: string[],
  tzOffsetMinutes: number,
  nowMs = Date.now(),
): number {
  if (activeLocalDates.length === 0) return 0;

  const active = new Set(activeLocalDates);
  let streak = 0;
  let cursor = localDateKey(nowMs, tzOffsetMinutes);

  while (active.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDate(cursor, -1);
  }

  if (streak > 0) return streak;

  cursor = shiftLocalDate(localDateKey(nowMs, tzOffsetMinutes), -1);
  while (active.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDate(cursor, -1);
  }

  return streak;
}

function shiftLocalDate(localDate: string, deltaDays: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const utcMs = Date.UTC(year, month - 1, day) + deltaDays * 86_400_000;
  const shifted = new Date(utcMs);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isDeckStudyEvent(eventType: StudyEventType): boolean {
  switch (eventType) {
    case "deck_card_known":
    case "deck_card_still":
      return true;
    case "leitner_review":
    case "session_complete":
      return false;
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}
