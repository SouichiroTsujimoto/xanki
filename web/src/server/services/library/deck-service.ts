import { and, eq, isNull, sql } from "drizzle-orm";
import type { Env } from "../../env";
import type { Db } from "../../db/index";
import { cards, decks, reviewState } from "../../db/schema";
import { nowMs, randomId } from "../../utils";
import { purgeOrphanedCards } from "./card-service";
import { finishMutation } from "./mutation";

export const DEFAULT_DECK_NAME = "デフォルト";

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
  const deckCards = await db
    .select({ id: cards.id })
    .from(cards)
    .where(
      and(eq(cards.userId, userId), eq(cards.deckId, id), isNull(cards.deletedAt)),
    )
    .all();

  await db
    .update(decks)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(decks.userId, userId), eq(decks.id, id)));

  if (deckCards.length > 0) {
    await db
      .update(cards)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(cards.userId, userId), eq(cards.deckId, id), isNull(cards.deletedAt)),
      );

    for (const card of deckCards) {
      await db
        .delete(reviewState)
        .where(and(eq(reviewState.userId, userId), eq(reviewState.cardId, card.id)));
    }
  }

  await finishMutation(db, env, userId);
}
