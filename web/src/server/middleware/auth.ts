import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";
import { createDb } from "../db/index";
import type { Env } from "../env";

export type AppVars = {
  user: { id: string; email: string };
  db: ReturnType<typeof createDb>;
};

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: AppVars }>(
  async (c, next) => {
    const db = createDb(c.env.DB);
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "unauthorized" }, 401);
    }
    c.set("user", { id: session.user.id, email: session.user.email });
    c.set("db", db);
    await next();
  },
);

export const dbMiddleware = createMiddleware<{ Bindings: Env; Variables: AppVars }>(
  async (c, next) => {
    c.set("db", createDb(c.env.DB));
    await next();
  },
);
