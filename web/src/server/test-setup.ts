import { applyD1Migrations, env } from "cloudflare:test";
import type { Env } from "./env";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS?: Array<{ name: string; queries: string[] }>;
  }
}

if (env.TEST_MIGRATIONS) {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
}
