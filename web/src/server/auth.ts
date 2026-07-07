import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { bearer } from "better-auth/plugins";
import { defaultEntitlement } from "@xanki/shared";
import { createDb } from "./db/index";
import * as authSchema from "./db/auth-schema";
import { entitlements } from "./db/schema";
import type { Env } from "./env";
import { nowMs } from "./utils";

const SESSION_EXPIRES_IN_SEC = 60 * 60 * 24 * 365;
const SESSION_UPDATE_AGE_SEC = 60 * 60 * 24;

export function createAuth(env: Env) {
  const db = createDb(env.DB);

  return betterAuth({
    baseURL: env.APP_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      env.APP_URL,
      "xanki://auth/callback",
      "http://localhost:1420",
    ],
    session: {
      expiresIn: SESSION_EXPIRES_IN_SEC,
      updateAge: SESSION_UPDATE_AGE_SEC,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
    }),
    plugins: [bearer()],
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
