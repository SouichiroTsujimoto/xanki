import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/index";
import { userRevisions } from "../db/schema";

export async function getRevision(db: Db, userId: string): Promise<number> {
  const row = await db
    .select()
    .from(userRevisions)
    .where(eq(userRevisions.userId, userId))
    .get();
  return row?.rev ?? 0;
}

export async function bumpRevision(db: Db, userId: string): Promise<number> {
  await db
    .insert(userRevisions)
    .values({ userId, rev: 0 })
    .onConflictDoNothing();
  await db
    .update(userRevisions)
    .set({ rev: sql`${userRevisions.rev} + 1` })
    .where(eq(userRevisions.userId, userId));
  return getRevision(db, userId);
}
