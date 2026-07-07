import { Hono } from "hono";
import type { Env } from "../env";
import { authMiddleware, dbMiddleware, type AppVars } from "../middleware/auth";
import { handleStripeEvent } from "../services/billing/sync-entitlement";
import { verifyStripeWebhookSignature } from "../services/billing/stripe-webhook";

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
    client_reference_id: user.id,
    customer_email: user.email,
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
  if (!c.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: "webhook_not_configured" }, 503);
  }

  const payload = await c.req.text();
  const signature = c.req.header("Stripe-Signature");
  if (!signature) {
    return c.json({ error: "missing_signature" }, 400);
  }

  try {
    await verifyStripeWebhookSignature(payload, signature, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_signature";
    return c.json({ error: message }, 400);
  }

  const event = JSON.parse(payload) as {
    type: string;
    data: { object: Record<string, unknown> };
  };
  await handleStripeEvent(c.get("db"), c.env, event);
  return c.json({ received: true });
});
