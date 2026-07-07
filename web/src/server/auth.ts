import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { bearer, emailOTP, testUtils } from "better-auth/plugins";
import { defaultEntitlement } from "@xanki/shared";
import { createDb } from "./db/index";
import * as authSchema from "./db/auth-schema";
import { entitlements } from "./db/schema";
import type { Env } from "./env";
import { nowMs } from "./utils";

export function createAuth(env: Env) {
  const db = createDb(env.DB);
  const isLocalDev = !env.RESEND_API_KEY;

  return betterAuth({
    baseURL: env.APP_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
    }),
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp }) {
          if (env.RESEND_API_KEY) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "xanki <noreply@xanki.app>",
                to: email,
                subject: "xanki ログインコード",
                text: `ログインコード: ${otp}\n\n10分間有効です。`,
              }),
            });
            return;
          }
          console.log(`[dev OTP] ${email}: ${otp}`);
        },
      }),
      bearer(),
      ...(isLocalDev ? [testUtils({ captureOTP: true })] : []),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const now = nowMs();
            const ent = defaultEntitlement(user.id, now);
            await db
              .insert(entitlements)
              .values({
                userId: user.id,
                plan: ent.plan,
                storageLimit: ent.storageLimit,
                aiCreditsMonth: ent.aiCreditsMonth,
                aiCreditsRemaining: ent.aiCreditsRemaining,
                validUntil: ent.validUntil,
                updatedAt: ent.updatedAt,
              })
              .onConflictDoNothing();
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
