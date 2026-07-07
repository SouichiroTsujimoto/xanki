import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../env";
import { createDb } from "../db/index";
import { entitlements } from "../db/schema";
import { authMiddleware, type AppVars } from "../middleware/auth";
import { getEntitlement } from "../services/entitlements";
import { getRevision } from "../services/revision";
import { getStorageUsed } from "../services/web-data";
import { purgeUserByEmail } from "../services/user-purge";
import { PLAN_LIMITS } from "@xanki/shared";
import { nowMs } from "../utils";

export const accountRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();

accountRoutes.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  const ent = await getEntitlement(c.get("db"), user.id);
  return c.json({
    id: user.id,
    email: user.email,
    plan: ent.plan,
    storageLimit: ent.storageLimit,
    aiCreditsRemaining: ent.aiCreditsRemaining,
  });
});

export const storageRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();

storageRoutes.get("/storage", authMiddleware, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const ent = await getEntitlement(db, user.id);
  const rev = await getRevision(db, user.id);
  const storageUsed = await getStorageUsed(db, user.id);
  return c.json({
    rev,
    storageUsed,
    storageLimit: ent.storageLimit,
    plan: ent.plan,
    aiCreditsRemaining: ent.aiCreditsRemaining,
  });
});

export const devRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();

/** ローカル開発専用: Stripe なしで Pro を試す */
devRoutes.post("/promote-pro", authMiddleware, async (c) => {
  if (!c.env.APP_URL.startsWith("http://localhost")) {
    return c.json({ error: "disabled" }, 404);
  }
  const user = c.get("user");
  const now = nowMs();
  await c
    .get("db")
    .update(entitlements)
    .set({
      plan: "pro",
      storageLimit: PLAN_LIMITS.pro.storageLimit,
      aiCreditsMonth: PLAN_LIMITS.pro.aiCreditsMonth,
      aiCreditsRemaining: PLAN_LIMITS.pro.aiCreditsMonth,
      validUntil: now + 30 * 24 * 60 * 60 * 1000,
      updatedAt: now,
    })
    .where(eq(entitlements.userId, user.id));
  return c.json({ ok: true, plan: "pro" });
});

/** ローカル開発専用: 指定メールのユーザーと全関連データを削除 */
devRoutes.post("/purge-user", async (c) => {
  if (!c.env.APP_URL.startsWith("http://localhost")) {
    return c.json({ error: "disabled" }, 404);
  }
  const body = z.object({ email: z.string().email() }).parse(await c.req.json());
  const db = createDb(c.env.DB);
  const removed = await purgeUserByEmail(db, c.env, body.email);
  if (!removed) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true, email: body.email });
});
