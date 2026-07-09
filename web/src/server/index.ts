import { Hono } from "hono";
import { createAuth } from "./auth";
import type { Env } from "./env";
import { createDb } from "./db/index";
import { accountRoutes, devRoutes, storageRoutes } from "./routes/account";
import { blobRoutes } from "./routes/blobs";
import { billingRoutes } from "./routes/billing";
import { aiRoutes } from "./routes/ai";
import { settingsRoutes } from "./routes/settings";
import { cardRoutes, deckRoutes, reviewRoutes } from "./routes/web-data";
import { studyRoutes } from "./routes/study";
import { eventRoutes } from "./routes/events";
import { gcStaleBlobs } from "./services/blobs";
import { UserSyncHub } from "./durable-objects/user-sync-hub";
import { authCallbackRoutes } from "./routes/auth-callback";

const app = new Hono<{ Bindings: Env }>();

const API_CORS_LOCAL_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost:5174",
  "http://localhost:8787",
  "http://localhost:1420",
]);

function resolveApiCorsOrigin(origin: string | null, appUrl: string): string | null {
  if (!origin) return null;
  if (origin === appUrl || API_CORS_LOCAL_ORIGINS.has(origin)) return origin;

  try {
    const parsed = new URL(origin);
    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

app.use(
  "/api/*",
  async (c, next) => {
    const origin = c.req.raw.headers.get("Origin");
    const allowedOrigin = resolveApiCorsOrigin(origin, c.env.APP_URL);
    if (allowedOrigin) {
      c.header("Access-Control-Allow-Origin", allowedOrigin);
    }
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Expose-Headers", "set-auth-token");
    c.header("Vary", "Origin", { append: true });

    if (c.req.method === "OPTIONS") {
      const allowPrivateNetwork =
        c.req.raw.headers.get("Access-Control-Request-Private-Network") ===
        "true";
      const headers = new Headers({
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
        "Access-Control-Allow-Headers":
          c.req.raw.headers.get("Access-Control-Request-Headers") ??
          "authorization, content-type",
        Vary:
          "Origin, Access-Control-Request-Headers, Access-Control-Request-Private-Network",
      });
      if (allowedOrigin) {
        headers.set("Access-Control-Allow-Origin", allowedOrigin);
      }
      if (allowPrivateNetwork) {
        headers.set("Access-Control-Allow-Private-Network", "true");
      }
      return new Response(null, { status: 204, headers });
    }

    await next();
  },
);

app.route("/api/me", accountRoutes);
app.route("/api/dev", devRoutes);
app.route("/api/account", storageRoutes);
app.route("/api/events", eventRoutes);
app.route("/api/blobs", blobRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/decks", deckRoutes);
app.route("/api/cards", cardRoutes);
app.route("/api/review", reviewRoutes);
app.route("/api/study", studyRoutes);
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
