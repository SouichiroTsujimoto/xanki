import { and, eq, isNull } from "drizzle-orm";
import { leitnerScheduler } from "@xanki/shared";
import type { Env } from "../../env";
import type { Db } from "../../db/index";
import { cards, reviewLogs, reviewState } from "../../db/schema";
import { nowMs, randomId } from "../../utils";
import { finishMutation } from "../library/mutation";
import { recordStudyEvent } from "./study-metrics-service";

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

  const existing = await db
    .select()
    .from(reviewState)
    .where(and(eq(reviewState.userId, userId), eq(reviewState.cardId, cardId)))
    .get();
  const now = nowMs();
  const box = existing?.box ?? 1;
  const next = leitnerScheduler.submitReviewGrade(box, result, now);

  if (existing) {
    await db
      .update(reviewState)
      .set({
        box: next.box,
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
    deckId: card?.deckId ?? null,
    cardId,
    grade: result,
    tzOffsetMinutes,
    occurredAt: now,
  });

  await finishMutation(db, env, userId);
}
