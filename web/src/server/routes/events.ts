import { Hono } from "hono";
import type { Env } from "../env";
import { authMiddleware, type AppVars } from "../middleware/auth";

export const eventRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();

eventRoutes.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  const id = c.env.USER_SYNC.idFromName(user.id);
  const stub = c.env.USER_SYNC.get(id);
  return stub.fetch(new Request("https://do/stream", { method: "GET" }));
});
