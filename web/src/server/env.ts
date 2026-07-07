import type { D1Database, DurableObjectNamespace, Fetcher, KVNamespace, R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  BLOBS: R2Bucket;
  RATE_LIMIT: KVNamespace;
  ASSETS: Fetcher;
  USER_SYNC: DurableObjectNamespace;
  APP_URL: string;
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO?: string;
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  AI_MODEL?: string;
  TEST_MIGRATIONS?: Array<{ name: string; queries: string[] }>;
}

export interface AuthUser {
  id: string;
  email: string;
}
