export type Plan = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    storageLimit: 1_073_741_824,
    aiCreditsMonth: 0,
  },
  pro: {
    storageLimit: 10_737_418_240,
    aiCreditsMonth: 100,
  },
} as const;

export interface Entitlement {
  userId: string;
  plan: Plan;
  storageLimit: number;
  aiCreditsMonth: number;
  aiCreditsRemaining: number;
  validUntil: number | null;
  updatedAt: number;
}

export function defaultEntitlement(userId: string, nowMs: number): Entitlement {
  return {
    userId,
    plan: "free",
    storageLimit: PLAN_LIMITS.free.storageLimit,
    aiCreditsMonth: PLAN_LIMITS.free.aiCreditsMonth,
    aiCreditsRemaining: 0,
    validUntil: null,
    updatedAt: nowMs,
  };
}
