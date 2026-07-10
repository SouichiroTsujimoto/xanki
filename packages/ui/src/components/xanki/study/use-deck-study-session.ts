import {
  advanceFlashcardRound,
  createFlashcardRoundState,
  currentFlashcardId,
  flashcardRoundProgress,
  flashcardRoundSummary,
  gradeFlashcardKnown,
  gradeFlashcardStill,
  reconcileFlashcardRoundState,
  shuffleIds,
  type DeckStudyMode,
  type FlashcardRoundState,
} from "@xanki/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { copy } from "../../../copy";
import { useAppApi } from "../../../context/app-api-context";
import { useStudySessionRecorder } from "../../../hooks/use-study-session-recorder";
import {
  clearFlashcardSessionDraft,
  draftToRoundState,
  loadFlashcardSessionDraft,
  saveFlashcardSessionDraft,
} from "../../../lib/flashcard-session-storage";
import type { ReviewCard } from "../../../types";

export function useDeckStudySession(
  deckId: string | null | undefined,
  shuffle: boolean,
  enabled: boolean,
  mode: DeckStudyMode = "flashcards",
) {
  const api = useAppApi();
  const {
    beginDeckSession,
    completeSession,
    recordDeckKnown,
    recordDeckStill,
  } = useStudySessionRecorder();
  const [cardsById, setCardsById] = useState<Map<string, ReviewCard>>(new Map());
  const [roundState, setRoundState] = useState<FlashcardRoundState>(() =>
    createFlashcardRoundState([]),
  );
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const completeSentRef = useRef(false);
  const roundStateRef = useRef(roundState);
  roundStateRef.current = roundState;

  const persistState = useCallback(
    (state: FlashcardRoundState) => {
      if (!deckId || mode !== "flashcards") return;
      if (state.phase === "complete") {
        clearFlashcardSessionDraft(deckId);
        return;
      }
      saveFlashcardSessionDraft(deckId, shuffle, state);
    },
    [deckId, mode, shuffle],
  );

  const loadSession = useCallback(
    async (options?: { forceNew?: boolean }) => {
      if (!deckId) {
        setCardsById(new Map());
        setRoundState(createFlashcardRoundState([]));
        setLoadError(null);
        setReady(true);
        return;
      }

      setReady(false);
      setLoadError(null);
      setCardsById(new Map());
      setRoundState(createFlashcardRoundState([]));

      try {
        try {
          await completeSession();
        } catch {
          // Prior metrics session cleanup is optional; keep deck study usable.
        }
        completeSentRef.current = false;
        const cards = await api.getStudyCards("all", deckId);
        const map = new Map(cards.map((card) => [card.card.id, card]));
        const allIds = cards.map((c) => c.card.id);
        const available = new Set(allIds);

        let nextState: FlashcardRoundState;
        const draft =
          !options?.forceNew && mode === "flashcards"
            ? loadFlashcardSessionDraft(deckId)
            : null;

        if (draft && draft.shuffle === shuffle) {
          nextState = reconcileFlashcardRoundState(draftToRoundState(draft), available);
          // If draft only had deleted cards and nothing known, fall back to fresh.
          if (
            nextState.phase === "complete" &&
            nextState.knownIds.length === 0 &&
            allIds.length > 0
          ) {
            const ids = shuffle ? shuffleIds(allIds) : allIds;
            nextState = createFlashcardRoundState(ids);
          }
        } else {
          if (options?.forceNew || (draft && draft.shuffle !== shuffle)) {
            clearFlashcardSessionDraft(deckId);
          }
          const ids = shuffle ? shuffleIds(allIds) : allIds;
          nextState = createFlashcardRoundState(ids);
        }

        if (allIds.length > 0 && nextState.phase !== "complete") {
          try {
            const remainingWork =
              nextState.phase === "roundSummary"
                ? nextState.roundStillIds.length
                : Math.max(nextState.roundIds.length - nextState.roundIndex, 0) +
                  nextState.roundStillIds.length;
            await beginDeckSession({
              deckId,
              mode,
              cardsTotal: Math.max(remainingWork, 1),
            });
          } catch {
            // Study metrics are optional; keep the deck session usable.
          }
        }

        setCardsById(map);
        setRoundState(nextState);
        persistState(nextState);
      } catch {
        setCardsById(new Map());
        setRoundState(createFlashcardRoundState([]));
        setLoadError(copy.deckStudy.loadError);
      } finally {
        setReady(true);
      }
    },
    [api, beginDeckSession, completeSession, deckId, mode, persistState, shuffle],
  );

  useEffect(() => {
    if (!enabled) return;
    void loadSession();
  }, [enabled, loadSession]);

  const applyState = useCallback(
    (next: FlashcardRoundState) => {
      setRoundState(next);
      persistState(next);
      if (next.phase === "complete" && !completeSentRef.current) {
        completeSentRef.current = true;
        void completeSession();
      }
    },
    [completeSession, persistState],
  );

  const markKnown = useCallback(async () => {
    if (!ready || !deckId) return;
    const currentId = currentFlashcardId(roundStateRef.current);
    if (!currentId) return;
    await recordDeckKnown(currentId, deckId);
    applyState(gradeFlashcardKnown(roundStateRef.current));
  }, [applyState, deckId, ready, recordDeckKnown]);

  const markStill = useCallback(async () => {
    if (!ready || !deckId) return;
    const currentId = currentFlashcardId(roundStateRef.current);
    if (!currentId) return;
    await recordDeckStill(currentId, deckId);
    applyState(gradeFlashcardStill(roundStateRef.current));
  }, [applyState, deckId, ready, recordDeckStill]);

  const continueRound = useCallback(() => {
    if (!ready) return;
    applyState(advanceFlashcardRound(roundStateRef.current, shuffle));
  }, [applyState, ready, shuffle]);

  const restart = useCallback(() => {
    if (deckId) clearFlashcardSessionDraft(deckId);
    void loadSession({ forceNew: true });
  }, [deckId, loadSession]);

  const currentId = currentFlashcardId(roundState);
  const current = currentId ? cardsById.get(currentId) : undefined;
  const progressInfo = flashcardRoundProgress(roundState);
  const summary = flashcardRoundSummary(roundState);

  const isComplete =
    ready && roundState.sessionTotal > 0 && roundState.phase === "complete";
  const isRoundSummary = ready && roundState.phase === "roundSummary";

  const sessionMeta = useMemo(
    () => ({
      remaining: Math.max(
        roundState.roundIds.length - roundState.roundIndex + roundState.roundStillIds.length,
        0,
      ),
      total: roundState.sessionTotal,
      /** Swipes completed in the current round (0 while viewing the first card). */
      swiped: progressInfo.swiped,
      roundTotal: progressInfo.roundTotal,
      progress: progressInfo.progress,
      isComplete,
      isRoundSummary,
      ready,
      loadError,
      knownThisRound: summary.knownThisRound,
      stillRemaining: summary.stillRemaining,
      knownTotal: summary.knownTotal,
      phase: roundState.phase,
    }),
    [
      isComplete,
      isRoundSummary,
      loadError,
      progressInfo.progress,
      progressInfo.roundTotal,
      progressInfo.swiped,
      ready,
      roundState.phase,
      roundState.roundIds.length,
      roundState.roundIndex,
      roundState.roundStillIds.length,
      roundState.sessionTotal,
      summary.knownThisRound,
      summary.knownTotal,
      summary.stillRemaining,
    ],
  );

  return {
    current,
    sessionMeta,
    markKnown,
    markStill,
    continueRound,
    restart,
    loadSession,
  };
}
