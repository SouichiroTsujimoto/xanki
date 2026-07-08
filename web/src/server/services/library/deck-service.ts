import { and, eq, isNull, sql } from "drizzle-orm";
import {
  parseDeckSchedulerConfig,
  type DeckSchedulerConfig,
} from "@xanki/shared";
import type { Env } from "../../env";
import type { Db } from "../../db/index";
import { cards, decks, reviewState } from "../../db/schema";
import { nowMs, randomId } from "../../utils";
import { purgeOrphanedCards } from "./card-service";
import { finishMutation } from "./mutation";

export const DEFAULT_DECK_NAME = "デフォルト";

function readDeckSchedulerConfig(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    return parseDeckSchedulerConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

function serializeDeckSchedulerConfig(config: DeckSchedulerConfig | null | undefined) {
  return config ? JSON.stringify(config) : null;
}

export function mapDeckRow(d: {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  schedulerConfig?: string | null;
  cardCount?: number;
}) {
  return {
    id: d.id,
    name: d.name,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    cardCount: d.cardCount,
    schedulerConfig: readDeckSchedulerConfig(d.schedulerConfig),
  };
}

export async function getDeckSchedulerConfig(
  db: Db,
  userId: string,
  deckId: string,
): Promise<DeckSchedulerConfig | null> {
  const row = await db
    .select({ schedulerConfig: decks.schedulerConfig })
    .from(decks)
    .where(
      and(eq(decks.userId, userId), eq(decks.id, deckId), isNull(decks.deletedAt)),
    )
    .get();
  return readDeckSchedulerConfig(row?.schedulerConfig);
}

export async function ensureDefaultDeck(db: Db, userId: string, env?: Env) {
  const existing = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.userId, userId), isNull(decks.deletedAt)))
    .limit(1)
    .get();
  if (existing) return;

  await upsertDeck(db, userId, randomId(), { name: DEFAULT_DECK_NAME }, env);
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

  return deckRows.map((d) =>
    mapDeckRow({
      id: d.id,
      name: d.name,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      schedulerConfig: d.schedulerConfig,
      cardCount: counts.get(d.id) ?? 0,
    }),
  );
}

export interface UpsertDeckPatch {
  name?: string;
  schedulerConfig?: DeckSchedulerConfig | null;
}

export async function upsertDeck(
  db: Db,
  userId: string,
  id: string,
  patch: UpsertDeckPatch | string,
  env?: Env,
) {
  const resolvedPatch: UpsertDeckPatch =
    typeof patch === "string" ? { name: patch } : patch;
  const now = nowMs();
  const existing = await db
    .select()
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.id, id)))
    .get();

  if (existing) {
    const nextName = resolvedPatch.name ?? existing.name;
    const nextSchedulerConfig =
      resolvedPatch.schedulerConfig === undefined
        ? existing.schedulerConfig
        : serializeDeckSchedulerConfig(resolvedPatch.schedulerConfig);
    await db
      .update(decks)
      .set({
        name: nextName,
        schedulerConfig: nextSchedulerConfig,
        updatedAt: now,
      })
      .where(and(eq(decks.userId, userId), eq(decks.id, id)));
  } else {
    if (!resolvedPatch.name) {
      throw new Error("deck_name_required");
    }
    await db.insert(decks).values({
      userId,
      id,
      name: resolvedPatch.name,
      schedulerConfig: serializeDeckSchedulerConfig(resolvedPatch.schedulerConfig),
      createdAt: now,
      updatedAt: now,
    });
  }

  await finishMutation(db, env, userId);
  const row = await db
    .select()
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.id, id)))
    .get();
  if (!row) throw new Error("deck_not_found");
  return mapDeckRow(row);
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
