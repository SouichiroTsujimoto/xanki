import { and, eq, isNull } from "drizzle-orm";
import type { R2Bucket } from "@cloudflare/workers-types";
import type { Db } from "../db/index";
import { blobs, cards } from "../db/schema";
import { nowMs } from "../utils";

function blobKey(userId: string, hash: string): string {
  return `blobs/${userId}/${hash}`;
}

export async function prepareBlob(
  db: Db,
  userId: string,
  hash: string,
): Promise<{ status: "exists" } | { status: "upload"; upload_path: string }> {
  const existing = await db
    .select()
    .from(blobs)
    .where(and(eq(blobs.userId, userId), eq(blobs.hash, hash)))
    .get();

  if (existing) {
    return { status: "exists" };
  }

  return { status: "upload", upload_path: `/api/blobs/${hash}/upload` };
}

export async function uploadBlob(
  r2: R2Bucket,
  userId: string,
  hash: string,
  body: ArrayBuffer,
  mime: string,
): Promise<number> {
  const key = blobKey(userId, hash);
  await r2.put(key, body, {
    httpMetadata: { contentType: mime },
  });
  return body.byteLength;
}

export async function commitBlob(
  db: Db,
  r2: R2Bucket,
  userId: string,
  hash: string,
  mime = "image/webp",
): Promise<void> {
  const key = blobKey(userId, hash);
  const head = await r2.head(key);
  if (!head) {
    throw new Error("blob_not_found");
  }

  const now = nowMs();
  await db
    .insert(blobs)
    .values({
      userId,
      hash,
      size: head.size,
      mime,
      createdAt: now,
      lastReferencedAt: now,
    })
    .onConflictDoUpdate({
      target: [blobs.userId, blobs.hash],
      set: { size: head.size, lastReferencedAt: now },
    });
}

export async function touchBlobReference(db: Db, userId: string, hash: string): Promise<void> {
  const now = nowMs();
  await db
    .update(blobs)
    .set({ lastReferencedAt: now })
    .where(and(eq(blobs.userId, userId), eq(blobs.hash, hash)));
}

export async function getBlobObject(
  r2: R2Bucket,
  userId: string,
  hash: string,
) {
  return r2.get(blobKey(userId, hash));
}

export async function gcStaleBlobs(db: Db, r2: R2Bucket): Promise<number> {
  const cutoff = nowMs() - 30 * 24 * 60 * 60 * 1000;
  const all = await db.select().from(blobs).all();
  let removed = 0;

  for (const blob of all) {
    if (blob.lastReferencedAt >= cutoff) continue;

    const referenced = await db
      .select({ id: cards.id })
      .from(cards)
      .where(
        and(
          eq(cards.userId, blob.userId),
          eq(cards.imageHash, blob.hash),
          isNull(cards.deletedAt),
        ),
      )
      .get();

    if (referenced) {
      await touchBlobReference(db, blob.userId, blob.hash);
      continue;
    }

    await r2.delete(blobKey(blob.userId, blob.hash));
    await db
      .delete(blobs)
      .where(and(eq(blobs.userId, blob.userId), eq(blobs.hash, blob.hash)));
    removed += 1;
  }
  return removed;
}
