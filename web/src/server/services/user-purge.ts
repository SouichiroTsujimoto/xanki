import { eq } from "drizzle-orm";
import type { R2Bucket } from "@cloudflare/workers-types";
import * as authSchema from "../db/auth-schema";
import type { Db } from "../db/index";
import {
  blobs,
  cards,
  decks,
  entitlements,
  reviewLogs,
  reviewState,
  studyDailyStats,
  studyEvents,
  studySessions,
  userRevisions,
} from "../db/schema";
import type { Env } from "../env";

function blobKey(userId: string, hash: string): string {
  return `blobs/${userId}/${hash}`;
}

/** ユーザーと関連データを完全削除（dev / アカウント削除用） */
export async function purgeUserData(
  db: Db,
  userId: string,
  r2?: R2Bucket,
): Promise<void> {
  await db.delete(reviewLogs).where(eq(reviewLogs.userId, userId));
  await db.delete(studyEvents).where(eq(studyEvents.userId, userId));
  await db.delete(studySessions).where(eq(studySessions.userId, userId));
  await db.delete(studyDailyStats).where(eq(studyDailyStats.userId, userId));
  await db.delete(reviewState).where(eq(reviewState.userId, userId));
  await db.delete(cards).where(eq(cards.userId, userId));
  await db.delete(decks).where(eq(decks.userId, userId));

  const userBlobs = await db.select().from(blobs).where(eq(blobs.userId, userId)).all();
  if (r2) {
    for (const blob of userBlobs) {
      await r2.delete(blobKey(userId, blob.hash));
    }
  }
  await db.delete(blobs).where(eq(blobs.userId, userId));

  await db.delete(entitlements).where(eq(entitlements.userId, userId));
  await db.delete(userRevisions).where(eq(userRevisions.userId, userId));
  await db.delete(authSchema.session).where(eq(authSchema.session.userId, userId));
  await db.delete(authSchema.account).where(eq(authSchema.account.userId, userId));
  await db.delete(authSchema.user).where(eq(authSchema.user.id, userId));
}

export async function purgeUserByEmail(db: Db, env: Env, email: string): Promise<boolean> {
  const row = await db
    .select({ id: authSchema.user.id })
    .from(authSchema.user)
    .where(eq(authSchema.user.email, email))
    .get();
  if (!row) return false;

  await purgeUserData(db, row.id, env.BLOBS);
  await db
    .delete(authSchema.verification)
    .where(eq(authSchema.verification.identifier, email));
  return true;
}
