import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  computeMasteryPercent,
  computeBoxDistribution,
  computeStreakDays,
  isDeckStudyEvent,
  localDateKey,
} from "@xanki/shared";
import type { StudyEventType } from "@xanki/shared";
import type { Env } from "../../env";
import type { Db } from "../../db/index";
import {
  cards,
  decks,
  reviewState,
  studyDailyStats,
  studyEvents,
  studySessions,
} from "../../db/schema";
import { nowMs, randomId } from "../../utils";
import { finishMutation } from "../library/mutation";

export interface RecordStudyEventInput {
  sessionId?: string | null;
  eventType: StudyEventType;
  deckId?: string | null;
  cardId?: string | null;
  grade?: number | null;
  tzOffsetMinutes: number;
  occurredAt?: number;
}

export async function bumpDailyStats(
  db: Db,
  userId: string,
  localDate: string,
  eventType: StudyEventType,
  occurredAt: number,
): Promise<void> {
  const existing = await db
    .select()
    .from(studyDailyStats)
    .where(and(eq(studyDailyStats.userId, userId), eq(studyDailyStats.localDate, localDate)))
    .get();

  const leitnerDelta = eventType === "leitner_review" ? 1 : 0;
  const deckDelta = isDeckStudyEvent(eventType) ? 1 : 0;

  if (existing) {
    await db
      .update(studyDailyStats)
      .set({
        leitnerCount: existing.leitnerCount + leitnerDelta,
        deckStudyCount: existing.deckStudyCount + deckDelta,
        totalCount: existing.totalCount + (leitnerDelta + deckDelta),
        updatedAt: occurredAt,
      })
      .where(
        and(eq(studyDailyStats.userId, userId), eq(studyDailyStats.localDate, localDate)),
      );
    return;
  }

  await db.insert(studyDailyStats).values({
    userId,
    localDate,
    leitnerCount: leitnerDelta,
    deckStudyCount: deckDelta,
    totalCount: leitnerDelta + deckDelta,
    updatedAt: occurredAt,
  });
}

export async function recordStudyEvent(
  db: Db,
  userId: string,
  input: RecordStudyEventInput,
): Promise<void> {
  const occurredAt = input.occurredAt ?? nowMs();
  const localDate = localDateKey(occurredAt, input.tzOffsetMinutes);

  await db.insert(studyEvents).values({
    userId,
    id: randomId(),
    sessionId: input.sessionId ?? null,
    eventType: input.eventType,
    deckId: input.deckId ?? null,
    cardId: input.cardId ?? null,
    grade: input.grade ?? null,
    occurredAt,
    localDate,
  });

  if (input.eventType !== "session_complete") {
    await bumpDailyStats(db, userId, localDate, input.eventType, occurredAt);
  }
}

export async function startStudySession(
  db: Db,
  userId: string,
  input: {
    track: "deck" | "leitner";
    deckId?: string | null;
    mode?: string | null;
    cardsTotal: number;
  },
): Promise<{ sessionId: string }> {
  const sessionId = randomId();
  await db.insert(studySessions).values({
    userId,
    id: sessionId,
    track: input.track,
    deckId: input.deckId ?? null,
    mode: input.mode ?? null,
    startedAt: nowMs(),
    endedAt: null,
    cardsTotal: input.cardsTotal,
    cardsCompleted: 0,
  });
  return { sessionId };
}

export async function recordStudySessionEvents(
  db: Db,
  userId: string,
  sessionId: string,
  events: Omit<RecordStudyEventInput, "sessionId">[],
  env?: Env,
): Promise<void> {
  const session = await db
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), eq(studySessions.id, sessionId)))
    .get();
  if (!session) {
    throw new Error("session_not_found");
  }

  for (const event of events) {
    if (event.eventType === "leitner_review" || event.eventType === "session_complete") {
      throw new Error("invalid_event_type");
    }
    await recordStudyEvent(db, userId, { ...event, sessionId });
  }

  await finishMutation(db, env, userId);
}

export async function completeStudySession(
  db: Db,
  userId: string,
  sessionId: string,
  input: { cardsCompleted: number; tzOffsetMinutes: number },
  env?: Env,
): Promise<void> {
  const session = await db
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), eq(studySessions.id, sessionId)))
    .get();
  if (!session) {
    throw new Error("session_not_found");
  }

  const endedAt = nowMs();
  await db
    .update(studySessions)
    .set({
      endedAt,
      cardsCompleted: input.cardsCompleted,
    })
    .where(and(eq(studySessions.userId, userId), eq(studySessions.id, sessionId)));

  await recordStudyEvent(db, userId, {
    sessionId,
    eventType: "session_complete",
    deckId: session.deckId,
    tzOffsetMinutes: input.tzOffsetMinutes,
    occurredAt: endedAt,
  });

  await finishMutation(db, env, userId);
}

export async function getStudyMetrics(
  db: Db,
  userId: string,
  tzOffsetMinutes: number,
  deckId?: string,
) {
  const today = localDateKey(nowMs(), tzOffsetMinutes);
  const todayRow = await db
    .select()
    .from(studyDailyStats)
    .where(and(eq(studyDailyStats.userId, userId), eq(studyDailyStats.localDate, today)))
    .get();

  const activeDays = await db
    .select({ localDate: studyDailyStats.localDate })
    .from(studyDailyStats)
    .where(and(eq(studyDailyStats.userId, userId), gt(studyDailyStats.totalCount, 0)))
    .all();

  const totals = await db
    .select({
      totalStudyCount: sql<number>`coalesce(sum(${studyDailyStats.totalCount}), 0)`,
    })
    .from(studyDailyStats)
    .where(eq(studyDailyStats.userId, userId))
    .get();

  const cardRows = await db
    .select({
      deckId: cards.deckId,
      boxNum: reviewState.box,
      dueAt: reviewState.dueAt,
    })
    .from(cards)
    .innerJoin(decks, and(eq(cards.deckId, decks.id), eq(cards.userId, decks.userId)))
    .leftJoin(reviewState, and(eq(reviewState.cardId, cards.id), eq(reviewState.userId, userId)))
    .where(
      and(eq(cards.userId, userId), isNull(cards.deletedAt), isNull(decks.deletedAt)),
    )
    .all();

  const globalCards = cardRows.map((row) => ({ boxNum: row.boxNum ?? 1 }));
  const now = nowMs();

  const deckMetrics =
    deckId && cardRows.some((row) => row.deckId === deckId)
      ? (() => {
          const deckCards = cardRows.filter((row) => row.deckId === deckId);
          return {
            deckId,
            masteryPercent: computeMasteryPercent(
              deckCards.map((row) => ({ boxNum: row.boxNum ?? 1 })),
            ),
            boxDistribution: computeBoxDistribution(
              deckCards.map((row) => ({ boxNum: row.boxNum ?? 1 })),
            ),
            dueCount: deckCards.filter((row) => Number(row.dueAt ?? 0) <= now).length,
            cardCount: deckCards.length,
          };
        })()
      : undefined;

  return {
    activity: {
      todayStudyCount: todayRow?.totalCount ?? 0,
      todayLeitnerCount: todayRow?.leitnerCount ?? 0,
      todayDeckStudyCount: todayRow?.deckStudyCount ?? 0,
      streakDays: computeStreakDays(
        activeDays.map((row) => row.localDate),
        tzOffsetMinutes,
      ),
      totalStudyCount: Number(totals?.totalStudyCount ?? 0),
    },
    global: {
      masteryPercent: computeMasteryPercent(globalCards),
      boxDistribution: computeBoxDistribution(globalCards),
      totalCards: globalCards.length,
    },
    deck: deckMetrics,
  };
}
