import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../../db/index";
import { decks } from "../../db/schema";

export async function requireDeckOwnedByUser(
  db: Db,
  userId: string,
  deckId: string,
): Promise<void> {
  const deck = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.id, deckId), isNull(decks.deletedAt)))
    .get();
  if (!deck) throw new Error("deck_not_found");
}
