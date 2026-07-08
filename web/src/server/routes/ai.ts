import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Env } from "../env";
import { entitlements } from "../db/schema";
import { authMiddleware, type AppVars } from "../middleware/auth";
import { getEntitlement } from "../services/entitlements";
import {
  AiUnavailableError,
  canUseAi,
  createAskResponseStream,
  generateQaItems,
  isAiAuthError,
  isAiProviderError,
  isDevAiBypass,
} from "../services/ai/llm";
import { nowMs } from "../utils";

async function checkRateLimit(env: Env, userId: string): Promise<boolean> {
  const key = `ai:${userId}:${Math.floor(nowMs() / 60_000)}`;
  const current = Number((await env.RATE_LIMIT.get(key)) ?? "0");
  if (current >= 30) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 120 });
  return true;
}

async function consumeCredit(
  env: Env,
  db: ReturnType<typeof import("../db/index").createDb>,
  userId: string,
): Promise<boolean> {
  if (isDevAiBypass(env)) return true;

  const ent = await getEntitlement(db, userId);
  if (ent.plan !== "pro" || ent.aiCreditsRemaining <= 0) {
    return false;
  }
  await db
    .update(entitlements)
    .set({ aiCreditsRemaining: sql`${entitlements.aiCreditsRemaining} - 1`, updatedAt: nowMs() })
    .where(eq(entitlements.userId, userId));
  return true;
}

export const aiRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();
aiRoutes.use("*", authMiddleware);

aiRoutes.post("/qa-generate", async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const ent = await getEntitlement(db, user.id);
  if (!canUseAi(c.env, ent)) {
    return c.json({ error: "payment_required" }, 402);
  }
  if (!(await checkRateLimit(c.env, user.id))) {
    return c.json({ error: "rate_limited" }, 429);
  }
  const body = z
    .object({
      text: z.string().min(1),
      count: z.number().int().min(1).max(10).optional(),
      kind: z.enum(["qa", "choice"]),
    })
    .parse(await c.req.json());

  if (!(await consumeCredit(c.env, db, user.id))) {
    return c.json({ error: "payment_required" }, 402);
  }

  try {
    const result = await generateQaItems(c.env, {
      text: body.text,
      count: body.count ?? 3,
      kind: body.kind,
    });
    return c.json(result);
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return c.json({ error: "ai_unavailable" }, 503);
    }
    if (isAiAuthError(error)) {
      console.error("qa-generate auth failed", error);
      return c.json({ error: "ai_auth_failed" }, 502);
    }
    if (isAiProviderError(error)) {
      console.error("qa-generate provider failed", error);
      return c.json({ error: "ai_provider_unavailable" }, 502);
    }
    console.error("qa-generate failed", error);
    return c.json({ error: "ai_failed" }, 502);
  }
});

aiRoutes.post("/ask", async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const ent = await getEntitlement(db, user.id);
  if (!canUseAi(c.env, ent)) {
    return c.json({ error: "payment_required" }, 402);
  }
  if (!(await checkRateLimit(c.env, user.id))) {
    return c.json({ error: "rate_limited" }, 429);
  }
  const body = z
    .object({ cardContext: z.string().min(1), question: z.string().min(1) })
    .parse(await c.req.json());

  if (!(await consumeCredit(c.env, db, user.id))) {
    return c.json({ error: "payment_required" }, 402);
  }

  try {
    return createAskResponseStream(c.env, body);
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return c.json({ error: "ai_unavailable" }, 503);
    }
    if (isAiAuthError(error)) {
      console.error("ask auth failed", error);
      return c.json({ error: "ai_auth_failed" }, 502);
    }
    if (isAiProviderError(error)) {
      console.error("ask provider failed", error);
      return c.json({ error: "ai_provider_unavailable" }, 502);
    }
    console.error("ask failed", error);
    return c.json({ error: "ai_failed" }, 502);
  }
});
