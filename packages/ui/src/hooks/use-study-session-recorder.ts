import { getTzOffsetMinutes, type DeckStudyMode, type StudySessionMode } from "@xanki/shared";
import { useCallback, useEffect, useRef } from "react";
import { useAppApi } from "../context/app-api-context";

interface DeckSessionOptions {
  deckId: string;
  mode: DeckStudyMode;
  cardsTotal: number;
}

type PendingDeckEvent = {
  eventType: "deck_card_known" | "deck_card_still";
  cardId: string;
  deckId: string;
};

function countKnownEvents(events: PendingDeckEvent[]): number {
  return events.filter((event) => event.eventType === "deck_card_known").length;
}

export function useStudySessionRecorder() {
  const api = useAppApi();
  const sessionIdRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const cardsCompletedRef = useRef(0);
  const pendingEventsRef = useRef<PendingDeckEvent[]>([]);

  const flushPendingEvents = useCallback(
    async (sessionId: string) => {
      if (pendingEventsRef.current.length === 0) return;
      const events = pendingEventsRef.current;
      pendingEventsRef.current = [];
      await api.recordStudyEvents(sessionId, {
        tzOffsetMinutes: getTzOffsetMinutes(),
        events,
      });
      cardsCompletedRef.current += countKnownEvents(events);
    },
    [api],
  );

  const completeSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || completedRef.current) return;
    completedRef.current = true;
    await flushPendingEvents(sessionId);
    await api.completeStudySession(sessionId, {
      cardsCompleted: cardsCompletedRef.current,
      tzOffsetMinutes: getTzOffsetMinutes(),
    });
    sessionIdRef.current = null;
  }, [api, flushPendingEvents]);

  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
    completedRef.current = false;
    cardsCompletedRef.current = 0;
    pendingEventsRef.current = [];
  }, []);

  const beginDeckSession = useCallback(
    async ({ deckId, mode, cardsTotal }: DeckSessionOptions) => {
      await completeSession();
      completedRef.current = false;
      cardsCompletedRef.current = 0;
      if (cardsTotal <= 0) {
        sessionIdRef.current = null;
        pendingEventsRef.current = [];
        return;
      }
      const session = await api.startStudySession({
        track: "deck",
        deckId,
        mode,
        cardsTotal,
        tzOffsetMinutes: getTzOffsetMinutes(),
      });
      sessionIdRef.current = session.sessionId;
      await flushPendingEvents(session.sessionId);
    },
    [api, completeSession, flushPendingEvents],
  );

  const beginLeitnerSession = useCallback(
    async (deckId: string | null | undefined, cardsTotal: number) => {
      await completeSession();
      completedRef.current = false;
      cardsCompletedRef.current = 0;
      pendingEventsRef.current = [];
      if (cardsTotal <= 0) {
        sessionIdRef.current = null;
        return;
      }
      const session = await api.startStudySession({
        track: "leitner",
        deckId: deckId ?? undefined,
        mode: "learn" satisfies StudySessionMode,
        cardsTotal,
        tzOffsetMinutes: getTzOffsetMinutes(),
      });
      sessionIdRef.current = session.sessionId;
    },
    [api, completeSession],
  );

  const recordDeckEvents = useCallback(
    async (events: PendingDeckEvent[]) => {
      if (events.length === 0) return;

      const sessionId = sessionIdRef.current;
      if (!sessionId) {
        pendingEventsRef.current.push(...events);
        return;
      }

      await api.recordStudyEvents(sessionId, {
        tzOffsetMinutes: getTzOffsetMinutes(),
        events,
      });
      cardsCompletedRef.current += countKnownEvents(events);
    },
    [api],
  );

  const recordDeckKnown = useCallback(
    async (cardId: string, deckId: string) => {
      await recordDeckEvents([{ eventType: "deck_card_known", cardId, deckId }]);
    },
    [recordDeckEvents],
  );

  const recordDeckStill = useCallback(
    async (cardId: string, deckId: string) => {
      await recordDeckEvents([{ eventType: "deck_card_still", cardId, deckId }]);
    },
    [recordDeckEvents],
  );

  const noteCardCompleted = useCallback(() => {
    cardsCompletedRef.current += 1;
  }, []);

  useEffect(() => {
    return () => {
      if (sessionIdRef.current && !completedRef.current) {
        void completeSession();
      }
    };
  }, [completeSession]);

  return {
    beginDeckSession,
    beginLeitnerSession,
    recordDeckEvents,
    recordDeckKnown,
    recordDeckStill,
    noteCardCompleted,
    completeSession,
    resetSession,
  };
}
