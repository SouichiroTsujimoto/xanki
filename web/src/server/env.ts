import type { D1Database, DurableObjectNamespace, Fetcher, KVNamespace, R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  BLOBS: R2Bucket;
  RATE_LIMIT: KVNamespace;
  ASSETS: Fetcher;
  USER_SYNC: DurableObjectNamespace;
  APP_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO?: string;
  CF_ACCOUNT_ID?: string;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_TOKEN?: string;
  AI_MODEL?: string;
  AI_MODEL_FAST?: string;
  AI_MODEL_THINKING?: string;
  TEST_MIGRATIONS?: Array<{ name: string; queries: string[] }>;
}

export interface AuthUser {
  id: string;
  email: string;
}
