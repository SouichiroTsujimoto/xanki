import { Hono } from "hono";
import { z } from "zod";
import { parseDeckSchedulerConfig } from "@xanki/shared";
import type { Env } from "../env";
import { authMiddleware, type AppVars } from "../middleware/auth";
import {
  deleteDeck,
  listCards,
  listDecks,
  submitReview,
  upsertCard,
  upsertDeck,
} from "../services/web-data";
import { nowMs, randomId } from "../utils";

export const deckRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();
deckRoutes.use("*", authMiddleware);

deckRoutes.get("/", async (c) => {
  return c.json(await listDecks(c.get("db"), c.get("user").id, c.env));
});

deckRoutes.post("/", async (c) => {
  const body = z.object({ name: z.string().min(1) }).parse(await c.req.json());
  const id = randomId();
  const row = await upsertDeck(c.get("db"), c.get("user").id, id, { name: body.name }, c.env);
  return c.json({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    schedulerConfig: row.schedulerConfig,
    cardCount: 0,
  });
});

const updateDeckBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    schedulerConfig: z.unknown().optional(),
  })
  .refine((body) => body.name !== undefined || body.schedulerConfig !== undefined, {
    message: "name or schedulerConfig required",
  });

deckRoutes.patch("/:id", async (c) => {
  const body = updateDeckBodySchema.parse(await c.req.json());
  let schedulerConfig: ReturnType<typeof parseDeckSchedulerConfig> | undefined;
  if (body.schedulerConfig !== undefined) {
    schedulerConfig = parseDeckSchedulerConfig(body.schedulerConfig);
    if (!schedulerConfig) {
      return c.json({ error: "invalid_scheduler_config" }, 400);
    }
  }
  const row = await upsertDeck(
    c.get("db"),
    c.get("user").id,
    c.req.param("id"),
    {
      name: body.name,
      schedulerConfig,
    },
    c.env,
  );
  return c.json({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    schedulerConfig: row.schedulerConfig,
  });
});

deckRoutes.delete("/:id", async (c) => {
  await deleteDeck(c.get("db"), c.get("user").id, c.req.param("id"), c.env);
  return c.json({ ok: true });
});

export const cardRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();
cardRoutes.use("*", authMiddleware);

cardRoutes.get("/", async (c) => {
  const deckId = c.req.query("deck_id") ?? undefined;
  const q = c.req.query("q") ?? undefined;
  return c.json(await listCards(c.get("db"), c.get("user").id, deckId, q));
});

cardRoutes.get("/:id", async (c) => {
  const cards = await listCards(c.get("db"), c.get("user").id);
  const card = cards.find((item) => item.id === c.req.param("id"));
  if (!card) return c.json({ error: "not_found" }, 404);
  return c.json(card);
});

const optionalString = z.string().nullish();

cardRoutes.post("/", async (c) => {
  const body = z
    .object({
      deckId: z.string(),
      kind: z.enum(["text", "image", "qa"]),
      content: optionalString,
      answer: optionalString,
      imageHash: optionalString,
      ocrText: optionalString,
      ocrData: optionalString,
      masks: z.string(),
      note: optionalString,
      sourceHint: optionalString,
    })
    .parse(await c.req.json());
  const now = nowMs();
  const id = randomId();
  try {
    await upsertCard(
      c.get("db"),
      c.get("user").id,
      {
        id,
        deck_id: body.deckId,
        kind: body.kind,
        content: body.content ?? null,
        answer: body.answer ?? null,
        image_hash: body.imageHash ?? null,
        ocr_text: body.ocrText ?? null,
        ocr_data: body.ocrData ?? null,
        masks: body.masks,
        note: body.note ?? null,
        source_hint: body.sourceHint ?? null,
        starred: 0,
        created_at: now,
        updated_at: now,
      },
      c.env,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "deck_not_found") {
      return c.json({ error: "deck_not_found" }, 404);
    }
    throw error;
  }
  const cards = await listCards(c.get("db"), c.get("user").id);
  return c.json(cards.find((item) => item.id === id));
});

cardRoutes.patch("/:id", async (c) => {
  const body = z
    .object({
      deckId: z.string().optional(),
      content: optionalString,
      answer: optionalString,
      imageHash: optionalString,
      ocrText: optionalString,
      ocrData: optionalString,
      masks: z.string().optional(),
      note: optionalString,
      starred: z.boolean().optional(),
    })
    .parse(await c.req.json());
  const cards = await listCards(c.get("db"), c.get("user").id);
  const existing = cards.find((item) => item.id === c.req.param("id"));
  if (!existing) return c.json({ error: "not_found" }, 404);
  const now = nowMs();
  await upsertCard(
    c.get("db"),
    c.get("user").id,
    {
      id: existing.id,
      deck_id: body.deckId ?? existing.deckId,
      kind: existing.kind,
      content: body.content ?? existing.content ?? null,
      answer: body.answer ?? existing.answer ?? null,
      image_hash: body.imageHash ?? existing.imageHash ?? null,
      ocr_text: body.ocrText ?? existing.ocrText ?? null,
      ocr_data: body.ocrData ?? existing.ocrData ?? null,
      masks: body.masks ?? existing.masks,
      note: body.note ?? existing.note ?? null,
      source_hint: existing.sourceHint ?? null,
      starred: body.starred === undefined ? (existing.starred ? 1 : 0) : body.starred ? 1 : 0,
      created_at: existing.createdAt,
      updated_at: now,
    },
    c.env,
  );
  const updated = await listCards(c.get("db"), c.get("user").id);
  return c.json(updated.find((item) => item.id === existing.id));
});

cardRoutes.delete("/:id", async (c) => {
  const cards = await listCards(c.get("db"), c.get("user").id);
  const existing = cards.find((item) => item.id === c.req.param("id"));
  if (!existing) return c.json({ error: "not_found" }, 404);
  const now = nowMs();
  await upsertCard(
    c.get("db"),
    c.get("user").id,
    {
      id: existing.id,
      deck_id: existing.deckId,
      kind: existing.kind,
      content: existing.content ?? null,
      answer: existing.answer ?? null,
      image_hash: existing.imageHash ?? null,
      ocr_text: existing.ocrText ?? null,
      ocr_data: existing.ocrData ?? null,
      masks: existing.masks,
      note: existing.note ?? null,
      source_hint: existing.sourceHint ?? null,
      starred: existing.starred ? 1 : 0,
      created_at: existing.createdAt,
      updated_at: now,
      deleted_at: now,
    },
    c.env,
  );
  return c.json({ ok: true });
});

export const reviewRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();
reviewRoutes.use("*", authMiddleware);

reviewRoutes.post("/submit", async (c) => {
  const body = z
    .object({
      cardId: z.string(),
      result: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      tzOffsetMinutes: z.number().int().min(-840).max(840).optional(),
    })
    .parse(await c.req.json());
  await submitReview(
    c.get("db"),
    c.get("user").id,
    body.cardId,
    body.result,
    c.env,
    body.tzOffsetMinutes ?? 0,
  );
  return c.json({ ok: true });
});
