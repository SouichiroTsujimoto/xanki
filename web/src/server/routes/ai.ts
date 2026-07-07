import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Env } from "../env";
import { entitlements } from "../db/schema";
import { authMiddleware, type AppVars } from "../middleware/auth";
import { getEntitlement } from "../services/entitlements";
import { nowMs } from "../utils";

async function checkRateLimit(env: Env, userId: string): Promise<boolean> {
  const key = `ai:${userId}:${Math.floor(nowMs() / 60_000)}`;
  const current = Number((await env.RATE_LIMIT.get(key)) ?? "0");
  if (current >= 30) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 120 });
  return true;
}

async function consumeCredit(db: ReturnType<typeof import("../db/index").createDb>, userId: string) {
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
  if (ent.plan !== "pro" || ent.aiCreditsRemaining <= 0) {
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

  if (!(await consumeCredit(db, user.id))) {
    return c.json({ error: "payment_required" }, 402);
  }

  const count = body.count ?? 3;
  const items = Array.from({ length: count }, (_, i) => ({
    question: `${body.text.slice(0, 120)} — 問題 ${i + 1}`,
    answer: `解答 ${i + 1}`,
    choices: body.kind === "choice" ? ["A", "B", "C", "D"] : undefined,
  }));

  if (c.env.AI_GATEWAY_URL && c.env.AI_GATEWAY_TOKEN) {
    try {
      const res = await fetch(c.env.AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.AI_GATEWAY_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: c.env.AI_MODEL ?? "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `Generate ${count} flashcard Q&A pairs from:\n${body.text}`,
            },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { items?: typeof items };
        if (data.items?.length) {
          return c.json({ items: data.items });
        }
      }
    } catch {
      // fallback below
    }
  }

  return c.json({ items });
});

aiRoutes.post("/ask", async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const ent = await getEntitlement(db, user.id);
  if (ent.plan !== "pro" || ent.aiCreditsRemaining <= 0) {
    return c.json({ error: "payment_required" }, 402);
  }
  if (!(await checkRateLimit(c.env, user.id))) {
    return c.json({ error: "rate_limited" }, 429);
  }
  const body = z
    .object({ cardContext: z.string(), question: z.string() })
    .parse(await c.req.json());

  if (!(await consumeCredit(db, user.id))) {
    return c.json({ error: "payment_required" }, 402);
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const chunk = `data: ${JSON.stringify({ text: `（デモ回答）${body.question} について: ${body.cardContext.slice(0, 200)}...` })}\n\n`;
      controller.enqueue(encoder.encode(chunk));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
