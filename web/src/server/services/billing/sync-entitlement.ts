import { eq, or } from "drizzle-orm";
import type { Db } from "../../db/index";
import { entitlements } from "../../db/schema";
import type { Env } from "../../env";
import { PLAN_LIMITS } from "@xanki/shared";
import { nowMs } from "../../utils";

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end: number;
};

type StripeCheckoutSession = {
  client_reference_id?: string | null;
  customer?: string | null;
  subscription?: string | null;
};

type StripeEvent = {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

function planFromSubscriptionStatus(status: string): "pro" | "free" {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
      return "pro";
    default:
      return "free";
  }
}

export async function fetchStripeSubscription(
  env: Env,
  subscriptionId: string,
): Promise<StripeSubscription | null> {
  if (!env.STRIPE_SECRET_KEY) return null;
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as StripeSubscription;
}

async function findUserIdByStripe(
  db: Db,
  opts: { customerId?: string | null; subscriptionId?: string | null },
): Promise<string | null> {
  const filters = [];
  if (opts.subscriptionId) {
    filters.push(eq(entitlements.stripeSubscriptionId, opts.subscriptionId));
  }
  if (opts.customerId) {
    filters.push(eq(entitlements.stripeCustomerId, opts.customerId));
  }
  if (filters.length === 0) return null;

  const row = await db
    .select({ userId: entitlements.userId })
    .from(entitlements)
    .where(filters.length === 1 ? filters[0] : or(...filters))
    .get();
  return row?.userId ?? null;
}

export async function upsertProEntitlement(
  db: Db,
  userId: string,
  opts: {
    customerId?: string | null;
    subscriptionId?: string | null;
    validUntilMs: number | null;
  },
): Promise<void> {
  const now = nowMs();
  await db
    .insert(entitlements)
    .values({
      userId,
      plan: "pro",
      storageLimit: PLAN_LIMITS.pro.storageLimit,
      aiCreditsMonth: PLAN_LIMITS.pro.aiCreditsMonth,
      aiCreditsRemaining: PLAN_LIMITS.pro.aiCreditsMonth,
      validUntil: opts.validUntilMs,
      stripeCustomerId: opts.customerId ?? null,
      stripeSubscriptionId: opts.subscriptionId ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: entitlements.userId,
      set: {
        plan: "pro",
        storageLimit: PLAN_LIMITS.pro.storageLimit,
        aiCreditsMonth: PLAN_LIMITS.pro.aiCreditsMonth,
        aiCreditsRemaining: PLAN_LIMITS.pro.aiCreditsMonth,
        validUntil: opts.validUntilMs,
        stripeCustomerId: opts.customerId ?? null,
        stripeSubscriptionId: opts.subscriptionId ?? null,
        updatedAt: now,
      },
    });
}

export async function downgradeEntitlement(db: Db, userId: string): Promise<void> {
  const now = nowMs();
  await db
    .update(entitlements)
    .set({
      plan: "free",
      storageLimit: PLAN_LIMITS.free.storageLimit,
      aiCreditsMonth: PLAN_LIMITS.free.aiCreditsMonth,
      aiCreditsRemaining: 0,
      validUntil: null,
      stripeSubscriptionId: null,
      updatedAt: now,
    })
    .where(eq(entitlements.userId, userId));
}

async function syncFromSubscription(
  db: Db,
  subscription: StripeSubscription,
  userIdHint?: string | null,
): Promise<void> {
  const userId =
    userIdHint ??
    (await findUserIdByStripe(db, {
      customerId: subscription.customer,
      subscriptionId: subscription.id,
    }));
  if (!userId) return;

  const plan = planFromSubscriptionStatus(subscription.status);
  if (plan === "pro") {
    await upsertProEntitlement(db, userId, {
      customerId: subscription.customer,
      subscriptionId: subscription.id,
      validUntilMs: subscription.current_period_end * 1000,
    });
    return;
  }
  await downgradeEntitlement(db, userId);
}

export async function handleStripeEvent(db: Db, env: Env, event: StripeEvent): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as StripeCheckoutSession;
      const userId = session.client_reference_id;
      if (!userId || !session.subscription) return;
      const subscription = await fetchStripeSubscription(env, session.subscription);
      if (!subscription) return;
      await syncFromSubscription(db, subscription, userId);
      return;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as StripeSubscription;
      await syncFromSubscription(db, subscription);
      return;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as StripeSubscription;
      const userId = await findUserIdByStripe(db, {
        customerId: subscription.customer,
        subscriptionId: subscription.id,
      });
      if (userId) await downgradeEntitlement(db, userId);
      return;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as {
        customer?: string | null;
        subscription?: string | null;
      };
      const userId = await findUserIdByStripe(db, {
        customerId: invoice.customer,
        subscriptionId: typeof invoice.subscription === "string" ? invoice.subscription : null,
      });
      if (!userId || !invoice.subscription || typeof invoice.subscription !== "string") return;
      const subscription = await fetchStripeSubscription(env, invoice.subscription);
      if (subscription) await syncFromSubscription(db, subscription, userId);
      return;
    }
    default:
      return;
  }
}
