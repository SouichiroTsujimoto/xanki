import { and, eq, isNull, like, or, sql } from "drizzle-orm";
import { leitnerScheduler } from "@xanki/shared";
import type { Env } from "../env";
import type { Db } from "../db/index";
import { blobs, cards, decks, reviewLogs, reviewState } from "../db/schema";
import { nowMs, randomId } from "../utils";
import { bumpRevision } from "./revision";
import { notifyRevision } from "./notify";

export const DEFAULT_DECK_NAME = "デフォルト";

async function finishMutation(db: Db, env: Env | undefined, userId: string): Promise<void> {
  const rev = await bumpRevision(db, userId);
  if (env) {
    await notifyRevision(env, userId, rev);
  }
}

async function requireDeckOwnedByUser(db: Db, userId: string, deckId: string): Promise<void> {
  const deck = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.id, deckId), isNull(decks.deletedAt)))
    .get();
  if (!deck) throw new Error("deck_not_found");
}

/**
 * deck_id が自ユーザーの deck に属さないカードを論理削除する。
 * 再発防止は requireDeckOwnedByUser（書き込み検証）が担う。本関数は不正状態の残骸処理のみ。
 */
export async function purgeOrphanedCards(db: Db, userId: string, env?: Env): Promise<number> {
  const ownedDecks = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.userId, userId), isNull(decks.deletedAt)))
    .all();
  const ownedIds = new Set(ownedDecks.map((d) => d.id));

  const cardRows = await db
    .select({ id: cards.id, deckId: cards.deckId })
    .from(cards)
    .where(and(eq(cards.userId, userId), isNull(cards.deletedAt)))
    .all();

  const orphaned = cardRows.filter((c) => !ownedIds.has(c.deckId));
  if (orphaned.length === 0) return 0;

  const now = nowMs();
  for (const card of orphaned) {
    await db
      .update(cards)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(cards.userId, userId), eq(cards.id, card.id)));
    await db
      .delete(reviewState)
      .where(and(eq(reviewState.userId, userId), eq(reviewState.cardId, card.id)));
  }
  await finishMutation(db, env, userId);
  return orphaned.length;
}

export async function ensureDefaultDeck(db: Db, userId: string, env?: Env) {
  const existing = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.userId, userId), isNull(decks.deletedAt)))
    .limit(1)
    .get();
  if (existing) return;

  await upsertDeck(db, userId, randomId(), DEFAULT_DECK_NAME, env);
}

export async function listDecks(db: Db, userId: string, env?: Env) {
  await ensureDefaultDeck(db, userId, env);
  await purgeOrphanedCards(db, userId, env);

  const deckRows = await db
    .select()
    .from(decks)
    .where(and(eq(decks.userId, userId), isNull(decks.deletedAt)))
    .all();

  const countRows = await db
    .select({
      deckId: cards.deckId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(cards)
    .innerJoin(
      decks,
      and(eq(cards.deckId, decks.id), eq(decks.userId, userId), isNull(decks.deletedAt)),
    )
    .where(and(eq(cards.userId, userId), isNull(cards.deletedAt)))
    .groupBy(cards.deckId)
    .all();

  const counts = new Map(countRows.map((r) => [r.deckId, r.count]));

  return deckRows.map((d) => ({
    id: d.id,
    name: d.name,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    cardCount: counts.get(d.id) ?? 0,
  }));
}

export async function upsertDeck(
  db: Db,
  userId: string,
  id: string,
  name: string,
  env?: Env,
) {
  const now = nowMs();
  const existing = await db
    .select()
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.id, id)))
    .get();

  if (existing) {
    await db
      .update(decks)
      .set({ name, updatedAt: now })
      .where(and(eq(decks.userId, userId), eq(decks.id, id)));
  } else {
    await db.insert(decks).values({
      userId,
      id,
      name,
      createdAt: now,
      updatedAt: now,
    });
  }

  await finishMutation(db, env, userId);
  return {
    id,
    name,
    created_at: existing?.createdAt ?? now,
    updated_at: now,
  };
}

export async function deleteDeck(db: Db, userId: string, id: string, env?: Env) {
  const existing = await db
    .select()
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.id, id), isNull(decks.deletedAt)))
    .get();
  if (!existing) throw new Error("not_found");
  const now = nowMs();
  await db
    .update(decks)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(decks.userId, userId), eq(decks.id, id)));
  await finishMutation(db, env, userId);
}

export async function listCards(db: Db, userId: string, deckId?: string, q?: string) {
  await purgeOrphanedCards(db, userId);

  const conditions = [
    eq(cards.userId, userId),
    isNull(cards.deletedAt),
    eq(decks.userId, userId),
    isNull(decks.deletedAt),
  ];
  if (deckId) {
    conditions.push(eq(cards.deckId, deckId));
  }
  if (q) {
    const needle = `%${q.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${cards.content})`, needle),
        like(sql`lower(${cards.answer})`, needle),
        like(sql`lower(${cards.ocrText})`, needle),
      )!,
    );
  }

  const cardRows = await db
    .select({
      id: cards.id,
      deckId: cards.deckId,
      kind: cards.kind,
      content: cards.content,
      answer: cards.answer,
      imageHash: cards.imageHash,
      ocrText: cards.ocrText,
      ocrData: cards.ocrData,
      masks: cards.masks,
      note: cards.note,
      sourceHint: cards.sourceHint,
      starred: cards.starred,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(...conditions))
    .all();

  const reviewRows = await db
    .select()
    .from(reviewState)
    .where(eq(reviewState.userId, userId))
    .all();

  const reviewMap = new Map(reviewRows.map((r) => [r.cardId, r]));

  return cardRows.map((card) => {
    const rs = reviewMap.get(card.id);
    return {
      id: card.id,
      deckId: card.deckId,
      kind: card.kind as "text" | "image" | "qa",
      content: card.content,
      answer: card.answer,
      imageHash: card.imageHash,
      ocrText: card.ocrText,
      ocrData: card.ocrData,
      masks: card.masks,
      note: card.note,
      sourceHint: card.sourceHint,
      starred: card.starred === 1,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      boxNum: rs?.box,
      dueAt: rs?.dueAt,
      lastResult: rs?.lastResult,
    };
  });
}

export async function getCard(db: Db, userId: string, cardId: string) {
  const cardsList = await listCards(db, userId);
  return cardsList.find((c) => c.id === cardId) ?? null;
}

interface CardInput {
  id: string;
  deck_id: string;
  kind: "text" | "image" | "qa";
  content?: string | null;
  answer?: string | null;
  image_hash?: string | null;
  ocr_text?: string | null;
  ocr_data?: string | null;
  masks: string;
  note?: string | null;
  source_hint?: string | null;
  starred?: number;
  created_at: number;
  updated_at: number;
  deleted_at?: number | null;
}

export async function upsertCard(db: Db, userId: string, card: CardInput, env?: Env) {
  await requireDeckOwnedByUser(db, userId, card.deck_id);

  const existing = await db
    .select()
    .from(cards)
    .where(and(eq(cards.userId, userId), eq(cards.id, card.id)))
    .get();

  if (existing) {
    await db
      .update(cards)
      .set({
        deckId: card.deck_id,
        kind: card.kind,
        content: card.content ?? null,
        answer: card.answer ?? null,
        imageHash: card.image_hash ?? null,
        ocrText: card.ocr_text ?? null,
        ocrData: card.ocr_data ?? null,
        masks: card.masks,
        note: card.note ?? null,
        sourceHint: card.source_hint ?? null,
        starred: card.starred ?? existing.starred,
        updatedAt: card.updated_at,
        deletedAt: card.deleted_at ?? null,
      })
      .where(and(eq(cards.userId, userId), eq(cards.id, card.id)));
  } else {
    await db.insert(cards).values({
      userId,
      id: card.id,
      deckId: card.deck_id,
      kind: card.kind,
      content: card.content ?? null,
      answer: card.answer ?? null,
      imageHash: card.image_hash ?? null,
      ocrText: card.ocr_text ?? null,
      ocrData: card.ocr_data ?? null,
      masks: card.masks,
      note: card.note ?? null,
      sourceHint: card.source_hint ?? null,
      starred: card.starred ?? 0,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      deletedAt: card.deleted_at ?? null,
    });

    const rsExisting = await db
      .select()
      .from(reviewState)
      .where(and(eq(reviewState.userId, userId), eq(reviewState.cardId, card.id)))
      .get();

    if (!rsExisting) {
      await db.insert(reviewState).values({
        userId,
        cardId: card.id,
        box: 1,
        dueAt: leitnerScheduler.dueAtForBox(1, card.created_at),
        lastResult: null,
        updatedAt: card.updated_at,
      });
    }
  }

  await finishMutation(db, env, userId);
}

export async function submitReview(
  db: Db,
  userId: string,
  cardId: string,
  result: 0 | 1 | 2 | 3,
  env?: Env,
) {
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

  await finishMutation(db, env, userId);
}

export async function getStorageUsed(db: Db, userId: string): Promise<number> {
  const row = await db
    .select({ total: sql<number>`coalesce(sum(${blobs.size}), 0)`.mapWith(Number) })
    .from(blobs)
    .where(eq(blobs.userId, userId))
    .get();
  return row?.total ?? 0;
}
