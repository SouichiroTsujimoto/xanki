import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/index";
import { blobs } from "../db/schema";

export {
  DEFAULT_DECK_NAME,
  deleteDeck,
  ensureDefaultDeck,
  listDecks,
  upsertDeck,
} from "./library/deck-service";
export {
  getCard,
  listCards,
  purgeOrphanedCards,
  reorderCards,
  upsertCard,
  type CardInput,
} from "./library/card-service";
export { submitReview } from "./study/review-service";

export async function getStorageUsed(db: Db, userId: string): Promise<number> {
  const row = await db
    .select({ total: sql<number>`coalesce(sum(${blobs.size}), 0)`.mapWith(Number) })
    .from(blobs)
    .where(eq(blobs.userId, userId))
    .get();
  return row?.total ?? 0;
}
