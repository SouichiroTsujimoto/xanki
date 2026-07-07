import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as authSchema from "./auth-schema";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema: { ...schema, ...authSchema } });
}

export type Db = ReturnType<typeof createDb>;
