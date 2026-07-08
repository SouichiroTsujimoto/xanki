import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import type { Env } from "./env";
import { createDb } from "./db/index";
import { accountRoutes, devRoutes, storageRoutes } from "./routes/account";
import { blobRoutes } from "./routes/blobs";
import { billingRoutes } from "./routes/billing";
import { aiRoutes } from "./routes/ai";
import { cardRoutes, deckRoutes, reviewRoutes } from "./routes/web-data";
import { eventRoutes } from "./routes/events";
import { gcStaleBlobs } from "./services/blobs";
import { UserSyncHub } from "./durable-objects/user-sync-hub";
import { authCallbackRoutes } from "./routes/auth-callback";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
    exposeHeaders: ["set-auth-token"],
  }),
);

app.route("/api/me", accountRoutes);
app.route("/api/dev", devRoutes);
app.route("/api/account", storageRoutes);
app.route("/api/events", eventRoutes);
app.route("/api/blobs", blobRoutes);
app.route("/api/decks", deckRoutes);
app.route("/api/cards", cardRoutes);
app.route("/api/review", reviewRoutes);
app.route("/api/billing", billingRoutes);
app.route("/api/ai", aiRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

app.all("/api/auth/*", async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

app.route("/auth", authCallbackRoutes);

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) => {
    const db = createDb(env.DB);
    await gcStaleBlobs(db, env.BLOBS);
  },
};

export { UserSyncHub };
