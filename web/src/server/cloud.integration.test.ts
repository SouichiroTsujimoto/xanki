import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createAuth } from "./auth";

async function bearerFor(email: string): Promise<string> {
  const auth = createAuth(env);
  const ctx = await auth.$context;

  await auth.api.sendVerificationOTP({
    body: { email, type: "sign-in" },
  });
  const otp = ctx.test.getOTP(email);
  if (!otp) throw new Error("otp_not_captured");

  const res = await auth.api.signInEmailOTP({
    body: { email, otp },
    asResponse: true,
  });
  const token = res.headers.get("set-auth-token");
  if (!token) throw new Error("bearer_missing");
  return token;
}

async function json(path: string, init: RequestInit = {}) {
  const res = await SELF.fetch(`http://localhost${path}`, {
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

describe("cloud API smoke", () => {
  it("health → auth → me → CRUD → storage → AI", async () => {
    await json("/api/health");

    const email = `smoke-${Date.now()}@xanki.local`;
    const token = await bearerFor(email);
    const auth = { Authorization: `Bearer ${token}` };

    const me = await json("/api/me", { headers: auth });
    expect(me.email).toBe(email);

    const initialDecks = await json("/api/decks", { headers: auth });
    expect(initialDecks).toHaveLength(1);
    expect(initialDecks[0].name).toBe("デフォルト");

    await json("/api/dev/promote-pro", { method: "POST", headers: auth });

    const deck = await json("/api/decks", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "Smoke Deck" }),
    });
    expect(deck.id).toBeTruthy();

    const card = await json("/api/cards", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        deckId: deck.id,
        kind: "text",
        content: "smoke test card",
        masks: JSON.stringify([{ type: "range", start: 0, end: 5 }]),
      }),
    });
    expect(card.id).toBeTruthy();

    const imageCard = await json("/api/cards", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        deckId: deck.id,
        kind: "image",
        imageHash: "a".repeat(64),
        masks: JSON.stringify([{ type: "rect", x: 0, y: 0, w: 10, h: 10, color: "green" }]),
        ocrText: null,
        ocrData: null,
        note: null,
        sourceHint: null,
      }),
    });
    expect(imageCard.id).toBeTruthy();

    const storage = await json("/api/account/storage", { headers: auth });
    expect(storage.rev).toBeGreaterThan(0);
    expect(typeof storage.storageUsed).toBe("number");

    const decks = await json("/api/decks", { headers: auth });
    expect(decks.some((d: { id: string }) => d.id === deck.id)).toBe(true);

    const ai = await json("/api/ai/qa-generate", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ text: "photosynthesis", kind: "qa", count: 1 }),
    });
    expect(ai.items?.length).toBeGreaterThanOrEqual(1);
  });
});
