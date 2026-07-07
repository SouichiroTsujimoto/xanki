import { Hono } from "hono";
import { z } from "zod";
import { blobCommitRequestSchema, blobPrepareRequestSchema } from "@xanki/shared";
import type { Env } from "../env";
import { authMiddleware, type AppVars } from "../middleware/auth";
import { getEntitlement } from "../services/entitlements";
import { commitBlob, getBlobObject, prepareBlob, uploadBlob } from "../services/blobs";
import { getStorageUsed } from "../services/web-data";
import { nowMs } from "../utils";

export const blobRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();

blobRoutes.use("*", authMiddleware);

blobRoutes.post("/prepare", async (c) => {
  const body = blobPrepareRequestSchema.parse(await c.req.json());
  const user = c.get("user");
  const db = c.get("db");
  const ent = await getEntitlement(db, user.id);
  const used = await getStorageUsed(db, user.id);
  if (used + body.size > ent.storageLimit) {
    return c.json({ error: "storage_limit_exceeded" }, 402);
  }
  const result = await prepareBlob(db, user.id, body.hash);
  if (result.status === "exists") {
    return c.json({ status: "exists" });
  }
  return c.json({
    status: "upload",
    url: result.upload_path,
    expires_at: nowMs() + 10 * 60 * 1000,
  });
});

blobRoutes.post("/commit", async (c) => {
  const body = blobCommitRequestSchema.parse(await c.req.json());
  await commitBlob(c.get("db"), c.env.BLOBS, c.get("user").id, body.hash);
  return c.json({ ok: true });
});

blobRoutes.put("/:hash/upload", async (c) => {
  const hash = c.req.param("hash");
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    return c.json({ error: "invalid_hash" }, 400);
  }
  const body = await c.req.arrayBuffer();
  const mime = c.req.header("Content-Type") ?? "image/webp";
  await uploadBlob(c.env.BLOBS, c.get("user").id, hash, body, mime);
  return c.json({ ok: true, size: body.byteLength });
});

blobRoutes.get("/:hash", async (c) => {
  const hash = c.req.param("hash");
  const obj = await getBlobObject(c.env.BLOBS, c.get("user").id, hash);
  if (!obj) {
    return c.json({ error: "not_found" }, 404);
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=600");
  return new Response(obj.body, { headers });
});
