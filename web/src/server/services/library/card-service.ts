import { and, eq, isNull, like, or, sql } from "drizzle-orm";
import type { Env } from "../../env";
import type { Db } from "../../db/index";
import { cards, decks, reviewState } from "../../db/schema";
import { nowMs } from "../../utils";
import { requireDeckOwnedByUser } from "./invariants";
import { finishMutation } from "./mutation";

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

export interface CardInput {
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
        dueAt: card.created_at,
        lastResult: null,
        updatedAt: card.updated_at,
      });
    }
  }

  await finishMutation(db, env, userId);
}
