import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../db/index";
import { entitlements } from "../db/schema";
import { PLAN_LIMITS } from "@xanki/shared";
import { authMiddleware, dbMiddleware, type AppVars } from "../middleware/auth";
import { nowMs } from "../utils";

export const billingRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();

billingRoutes.post("/checkout", authMiddleware, async (c) => {
  if (!c.env.STRIPE_SECRET_KEY || !c.env.STRIPE_PRICE_PRO) {
    return c.json({ error: "billing_not_configured" }, 503);
  }
  const user = c.get("user");
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": c.env.STRIPE_PRICE_PRO,
    "line_items[0][quantity]": "1",
    success_url: `${c.env.APP_URL}/settings?checkout=success`,
    cancel_url: `${c.env.APP_URL}/settings?checkout=cancel`,
    "client_reference_id": user.id,
    "customer_email": user.email,
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = (await res.json()) as { url?: string; error?: { message: string } };
  if (!res.ok || !data.url) {
    return c.json({ error: data.error?.message ?? "checkout_failed" }, 502);
  }
  return c.json({ url: data.url });
});

billingRoutes.post("/webhook", dbMiddleware, async (c) => {
  const payload = await c.req.text();
  if (c.env.STRIPE_WEBHOOK_SECRET) {
    const signature = c.req.header("Stripe-Signature");
    if (!signature) return c.json({ error: "missing_signature" }, 400);
  }
  const event = JSON.parse(payload) as {
    type: string;
    data: { object: { client_reference_id?: string; customer_email?: string } };
  };
  if (event.type === "checkout.session.completed") {
    const userId = event.data.object.client_reference_id;
    if (userId) {
      const db = c.get("db");
      const now = nowMs();
      await db
        .insert(entitlements)
        .values({
          userId,
          plan: "pro",
          storageLimit: PLAN_LIMITS.pro.storageLimit,
          aiCreditsMonth: PLAN_LIMITS.pro.aiCreditsMonth,
          aiCreditsRemaining: PLAN_LIMITS.pro.aiCreditsMonth,
          validUntil: now + 30 * 24 * 60 * 60 * 1000,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: entitlements.userId,
          set: {
            plan: "pro",
            storageLimit: PLAN_LIMITS.pro.storageLimit,
            aiCreditsMonth: PLAN_LIMITS.pro.aiCreditsMonth,
            aiCreditsRemaining: PLAN_LIMITS.pro.aiCreditsMonth,
            validUntil: now + 30 * 24 * 60 * 60 * 1000,
            updatedAt: now,
          },
        });
    }
  }
  return c.json({ received: true });
});
