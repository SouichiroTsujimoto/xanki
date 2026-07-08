import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createTestUserSession } from "./test-auth";

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
    const { token } = await createTestUserSession(env, email);
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

    const aiRes = await SELF.fetch("http://localhost/api/ai/qa-generate", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ text: "photosynthesis", kind: "qa", count: 1 }),
    });
    expect(aiRes.status).toBe(503);
    const ai = (await aiRes.json()) as { error?: string };
    expect(ai.error).toBe("ai_unavailable");

    const askRes = await SELF.fetch("http://localhost/api/ai/ask", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ cardContext: "種別: text\n本文: sample", question: "詳しく" }),
    });
    expect(askRes.status).toBe(503);
    const askBody = (await askRes.json()) as { error?: string };
    expect(askBody.error).toBe("ai_unavailable");
  });

  it("rejects card create when deck_id belongs to another user", async () => {
    const userA = await createTestUserSession(env);
    const userB = await createTestUserSession(env);
    const authA = { Authorization: `Bearer ${userA.token}` };
    const authB = { Authorization: `Bearer ${userB.token}` };

    const decksB = await json("/api/decks", { headers: authB });
    const foreignDeckId = decksB[0].id;

    const res = await SELF.fetch("http://localhost/api/cards", {
      method: "POST",
      headers: { ...authA, "Content-Type": "application/json" },
      body: JSON.stringify({
        deckId: foreignDeckId,
        kind: "text",
        content: "should fail",
        masks: JSON.stringify([{ type: "range", start: 0, end: 1 }]),
      }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("deck_not_found");
  });

  it("deleteDeck cascades logical delete to cards", async () => {
    const { token } = await createTestUserSession(env);
    const auth = { Authorization: `Bearer ${token}` };

    const deck = await json("/api/decks", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "Temp Deck" }),
    });

    await json("/api/cards", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        deckId: deck.id,
        kind: "text",
        content: "cascade test",
        masks: JSON.stringify([{ type: "range", start: 0, end: 1 }]),
      }),
    });

    await json(`/api/decks/${deck.id}`, { method: "DELETE", headers: auth });

    const cards = await json("/api/cards", { headers: auth });
    expect(cards.every((c: { deckId: string }) => c.deckId !== deck.id)).toBe(true);
  });

  it("study metrics records leitner review and deck study events", async () => {
    const { token } = await createTestUserSession(env);
    const auth = { Authorization: `Bearer ${token}` };

    const deck = await json("/api/decks", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "Metrics Deck" }),
    });

    const card = await json("/api/cards", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        deckId: deck.id,
        kind: "text",
        content: "metrics card",
        masks: JSON.stringify([{ type: "range", start: 0, end: 1 }]),
      }),
    });

    await json("/api/review/submit", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ cardId: card.id, result: 2, tzOffsetMinutes: 0 }),
    });

    const session = await json("/api/study/sessions", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        track: "deck",
        deckId: deck.id,
        mode: "flashcards",
        cardsTotal: 1,
      }),
    });

    await json(`/api/study/sessions/${session.sessionId}/events`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        tzOffsetMinutes: 0,
        events: [{ eventType: "deck_card_known", cardId: card.id, deckId: deck.id }],
      }),
    });

    await json(`/api/study/sessions/${session.sessionId}/complete`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ cardsCompleted: 1, tzOffsetMinutes: 0 }),
    });

    const metrics = await json("/api/study/metrics?deck_id=" + deck.id + "&tz_offset_minutes=0", {
      headers: auth,
    });

    expect(metrics.activity.todayStudyCount).toBeGreaterThanOrEqual(2);
    expect(metrics.activity.todayLeitnerCount).toBeGreaterThanOrEqual(1);
    expect(metrics.activity.todayDeckStudyCount).toBeGreaterThanOrEqual(1);
    expect(metrics.global.totalCards).toBeGreaterThanOrEqual(1);
    expect(metrics.deck?.deckId).toBe(deck.id);
    expect(typeof metrics.deck?.masteryPercent).toBe("number");
  });
});
