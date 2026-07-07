import { defaultEntitlement } from "@xanki/shared";
import { createDb } from "./db/index";
import * as authSchema from "./db/auth-schema";
import { entitlements } from "./db/schema";
import type { Env } from "./env";
import { nowMs } from "./utils";

export async function createTestUserSession(env: Env, email?: string) {
  const db = createDb(env.DB);
  const now = nowMs();
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const userEmail = email ?? `test-${userId}@xanki.local`;

  await db.insert(authSchema.user).values({
    id: userId,
    name: "Test User",
    email: userEmail,
    emailVerified: true,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });

  const ent = defaultEntitlement(userId, now);
  await db
    .insert(entitlements)
    .values({
      userId,
      plan: ent.plan,
      storageLimit: ent.storageLimit,
      aiCreditsMonth: ent.aiCreditsMonth,
      aiCreditsRemaining: ent.aiCreditsRemaining,
      validUntil: ent.validUntil,
      updatedAt: ent.updatedAt,
    })
    .onConflictDoNothing();

  const expiresAt = now + 365 * 24 * 60 * 60 * 1000;
  await db.insert(authSchema.session).values({
    id: sessionId,
    token,
    userId,
    expiresAt: new Date(expiresAt),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });

  return { token, userId, email: userEmail };
}
