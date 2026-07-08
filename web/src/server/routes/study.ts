import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../env";
import { authMiddleware, type AppVars } from "../middleware/auth";
import {
  completeStudySession,
  getStudyMetrics,
  recordStudySessionEvents,
  startStudySession,
} from "../services/study/study-metrics-service";

const tzSchema = z.number().int().min(-840).max(840);

const studyTrackSchema = z.enum(["deck", "leitner"]);
const deckModeSchema = z.enum(["flashcards", "write", "test", "match", "learn"]);

const clientEventTypeSchema = z.enum(["deck_card_known", "deck_card_still"]);

export const studyRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();
studyRoutes.use("*", authMiddleware);

studyRoutes.get("/metrics", async (c) => {
  const deckId = c.req.query("deck_id") ?? undefined;
  const tzOffsetMinutes = tzSchema.parse(
    Number(c.req.query("tz_offset_minutes") ?? "0"),
  );
  const metrics = await getStudyMetrics(
    c.get("db"),
    c.get("user").id,
    tzOffsetMinutes,
    deckId,
  );
  return c.json(metrics);
});

studyRoutes.post("/sessions", async (c) => {
  const body = z
    .object({
      track: studyTrackSchema,
      deckId: z.string().nullish(),
      mode: deckModeSchema.nullish(),
      cardsTotal: z.number().int().min(0),
      tzOffsetMinutes: tzSchema.optional(),
    })
    .parse(await c.req.json());

  const session = await startStudySession(c.get("db"), c.get("user").id, {
    track: body.track,
    deckId: body.deckId,
    mode: body.mode,
    cardsTotal: body.cardsTotal,
  });
  return c.json(session);
});

studyRoutes.post("/sessions/:id/events", async (c) => {
  const body = z
    .object({
      tzOffsetMinutes: tzSchema,
      events: z
        .array(
          z.object({
            eventType: clientEventTypeSchema,
            cardId: z.string().nullish(),
            deckId: z.string().nullish(),
            grade: z.number().int().min(0).max(3).nullish(),
          }),
        )
        .min(1),
    })
    .parse(await c.req.json());

  try {
    await recordStudySessionEvents(
      c.get("db"),
      c.get("user").id,
      c.req.param("id"),
      body.events.map((event) => ({
        eventType: event.eventType,
        cardId: event.cardId,
        deckId: event.deckId,
        grade: event.grade,
        tzOffsetMinutes: body.tzOffsetMinutes,
      })),
      c.env,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "session_not_found") {
      return c.json({ error: "session_not_found" }, 404);
    }
    if (error instanceof Error && error.message === "invalid_event_type") {
      return c.json({ error: "invalid_event_type" }, 400);
    }
    throw error;
  }

  return c.json({ ok: true });
});

studyRoutes.post("/sessions/:id/complete", async (c) => {
  const body = z
    .object({
      cardsCompleted: z.number().int().min(0),
      tzOffsetMinutes: tzSchema,
    })
    .parse(await c.req.json());

  try {
    await completeStudySession(c.get("db"), c.get("user").id, c.req.param("id"), body, c.env);
  } catch (error) {
    if (error instanceof Error && error.message === "session_not_found") {
      return c.json({ error: "session_not_found" }, 404);
    }
    throw error;
  }

  return c.json({ ok: true });
});
