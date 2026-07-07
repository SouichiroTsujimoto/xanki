import { eq } from "drizzle-orm";
import type { Db } from "../db/index";
import { entitlements } from "../db/schema";
import { defaultEntitlement, PLAN_LIMITS } from "@xanki/shared";
import { nowMs } from "../utils";

export async function getEntitlement(db: Db, userId: string) {
  const row = await db
    .select()
    .from(entitlements)
    .where(eq(entitlements.userId, userId))
    .get();
  if (row) return row;
  const ent = defaultEntitlement(userId, nowMs());
  await db.insert(entitlements).values({
    userId,
    plan: ent.plan,
    storageLimit: ent.storageLimit,
    aiCreditsMonth: ent.aiCreditsMonth,
    aiCreditsRemaining: ent.aiCreditsRemaining,
    validUntil: ent.validUntil,
    updatedAt: ent.updatedAt,
  });
  return {
    userId,
    plan: "free" as const,
    storageLimit: PLAN_LIMITS.free.storageLimit,
    aiCreditsMonth: PLAN_LIMITS.free.aiCreditsMonth,
    aiCreditsRemaining: 0,
    validUntil: null,
    updatedAt: nowMs(),
  };
}
