import { and, eq, isNull } from "drizzle-orm";
import {
  initialReviewState,
  normalizeReviewState,
  resolveDeckSchedulerConfig,
  submitReviewGrade,
  type ReviewPhase,
} from "@xanki/shared";
import type { Env } from "../../env";
import type { Db } from "../../db/index";
import { cards, reviewLogs, reviewState } from "../../db/schema";
import { nowMs, randomId } from "../../utils";
import { finishMutation } from "../library/mutation";
import { getDeckSchedulerConfig } from "../library/deck-service";
import { recordStudyEvent } from "./study-metrics-service";

function parseReviewPhase(value: string | null | undefined): ReviewPhase {
  if (value === "learning" || value === "review" || value === "relearning") {
    return value;
  }
  return "review";
}

export async function submitReview(
  db: Db,
  userId: string,
  cardId: string,
  result: 0 | 1 | 2 | 3,
  env?: Env,
  tzOffsetMinutes = 0,
) {
  const card = await db
    .select({ deckId: cards.deckId })
    .from(cards)
    .where(and(eq(cards.userId, userId), eq(cards.id, cardId), isNull(cards.deletedAt)))
    .get();
  if (!card) throw new Error("card_not_found");

  const deckConfig = await getDeckSchedulerConfig(db, userId, card.deckId);
  const config = resolveDeckSchedulerConfig(deckConfig);

  const existing = await db
    .select()
    .from(reviewState)
    .where(and(eq(reviewState.userId, userId), eq(reviewState.cardId, cardId)))
    .get();
  const now = nowMs();
  const state = existing
    ? normalizeReviewState({
        phase: parseReviewPhase(existing.phase),
        step: existing.step ?? 0,
        box: existing.box ?? 1,
      })
    : normalizeReviewState({ phase: "learning", step: 0, box: 1 });

  const next = submitReviewGrade(state, result, now, config);

  if (existing) {
    await db
      .update(reviewState)
      .set({
        box: next.box,
        phase: next.phase,
        step: next.step,
        dueAt: next.dueAt,
        lastResult: result,
        updatedAt: now,
      })
      .where(and(eq(reviewState.userId, userId), eq(reviewState.cardId, cardId)));
  } else {
    await db.insert(reviewState).values({
      userId,
      cardId,
      box: next.box,
      phase: next.phase,
      step: next.step,
      dueAt: next.dueAt,
      lastResult: result,
      updatedAt: now,
    });
  }

  await db
    .insert(reviewLogs)
    .values({
      userId,
      id: randomId(),
      cardId,
      result,
      reviewedAt: now,
    })
    .onConflictDoNothing();

  await recordStudyEvent(db, userId, {
    eventType: "leitner_review",
    deckId: card.deckId,
    cardId,
    grade: result,
    tzOffsetMinutes,
    occurredAt: now,
  });

  await finishMutation(db, env, userId);
}

export { initialReviewState };
