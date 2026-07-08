import { getTzOffsetMinutes, type DeckStudyMode, type StudySessionMode } from "@xanki/shared";
import { useCallback, useEffect, useRef } from "react";
import { useAppApi } from "../context/app-api-context";

interface DeckSessionOptions {
  deckId: string;
  mode: DeckStudyMode;
  cardsTotal: number;
}

export function useStudySessionRecorder() {
  const api = useAppApi();
  const sessionIdRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const cardsCompletedRef = useRef(0);

  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
    completedRef.current = false;
    cardsCompletedRef.current = 0;
  }, []);

  const beginDeckSession = useCallback(
    async ({ deckId, mode, cardsTotal }: DeckSessionOptions) => {
      resetSession();
      if (cardsTotal <= 0) return;
      const session = await api.startStudySession({
        track: "deck",
        deckId,
        mode,
        cardsTotal,
        tzOffsetMinutes: getTzOffsetMinutes(),
      });
      sessionIdRef.current = session.sessionId;
    },
    [api, resetSession],
  );

  const beginLeitnerSession = useCallback(
    async (deckId: string | null | undefined, cardsTotal: number) => {
      resetSession();
      if (cardsTotal <= 0) return;
      const session = await api.startStudySession({
        track: "leitner",
        deckId: deckId ?? undefined,
        mode: "learn" satisfies StudySessionMode,
        cardsTotal,
        tzOffsetMinutes: getTzOffsetMinutes(),
      });
      sessionIdRef.current = session.sessionId;
    },
    [api, resetSession],
  );

  const recordDeckKnown = useCallback(
    async (cardId: string, deckId: string) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      cardsCompletedRef.current += 1;
      await api.recordStudyEvents(sessionId, {
        tzOffsetMinutes: getTzOffsetMinutes(),
        events: [
          {
            eventType: "deck_card_known",
            cardId,
            deckId,
          },
        ],
      });
    },
    [api],
  );

  const recordDeckStill = useCallback(
    async (cardId: string, deckId: string) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      await api.recordStudyEvents(sessionId, {
        tzOffsetMinutes: getTzOffsetMinutes(),
        events: [
          {
            eventType: "deck_card_still",
            cardId,
            deckId,
          },
        ],
      });
    },
    [api],
  );

  const completeSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || completedRef.current) return;
    completedRef.current = true;
    await api.completeStudySession(sessionId, {
      cardsCompleted: cardsCompletedRef.current,
      tzOffsetMinutes: getTzOffsetMinutes(),
    });
  }, [api]);

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
    recordDeckKnown,
    recordDeckStill,
    noteCardCompleted,
    completeSession,
    resetSession,
  };
}
