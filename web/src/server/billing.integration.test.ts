import { env, SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "./db/index";
import { entitlements } from "./db/schema";
import { signStripeWebhookPayload } from "./services/billing/stripe-webhook";
import { createTestUserSession } from "./test-auth";

const WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET ?? "whsec_dGVzdF93ZWJob29rX3NlY3JldA==";

async function postWebhook(payload: object) {
  const body = JSON.stringify(payload);
  const signature = await signStripeWebhookPayload(body, WEBHOOK_SECRET);
  return SELF.fetch("http://localhost/api/billing/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body,
  });
}

describe("billing webhook", () => {
  it("rejects missing signature", async () => {
    const res = await SELF.fetch("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ping" }),
    });
    expect(res.status).toBe(400);
  });

  it("updates pro entitlement on customer.subscription.updated", async () => {
    const { userId } = await createTestUserSession(env);
    const db = createDb(env.DB);
    const periodEnd = Math.floor(Date.now() / 1000) + 86_400;
    await db
      .update(entitlements)
      .set({
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
      })
      .where(eq(entitlements.userId, userId));

    const res = await postWebhook({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test_123",
          customer: "cus_test_123",
          status: "active",
          current_period_end: periodEnd,
        },
      },
    });
    expect(res.status).toBe(200);

    const row = await db
      .select()
      .from(entitlements)
      .where(eq(entitlements.userId, userId))
      .get();
    expect(row?.plan).toBe("pro");
    expect(row?.validUntil).toBe(periodEnd * 1000);
    expect(row?.aiCreditsRemaining).toBe(100);
  });

  it("downgrades user on customer.subscription.deleted", async () => {
    const { userId } = await createTestUserSession(env);
    const db = createDb(env.DB);
    await db
      .update(entitlements)
      .set({
        plan: "pro",
        stripeCustomerId: "cus_delete_me",
        stripeSubscriptionId: "sub_delete_me",
        validUntil: Date.now() + 86_400_000,
      })
      .where(eq(entitlements.userId, userId));

    const res = await postWebhook({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_delete_me",
          customer: "cus_delete_me",
          status: "canceled",
          current_period_end: Math.floor(Date.now() / 1000),
        },
      },
    });
    expect(res.status).toBe(200);

    const row = await db
      .select()
      .from(entitlements)
      .where(eq(entitlements.userId, userId))
      .get();
    expect(row?.plan).toBe("free");
    expect(row?.stripeSubscriptionId).toBeNull();
  });
});
