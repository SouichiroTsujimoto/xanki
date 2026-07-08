import { shuffleIds } from "@xanki/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeckStudyMode } from "@xanki/shared";
import { copy } from "../../../copy";
import { useAppApi } from "../../../context/app-api-context";
import { useStudySessionRecorder } from "../../../hooks/use-study-session-recorder";
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
  const [remainingIds, setRemainingIds] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const completeSentRef = useRef(false);

  const loadSession = useCallback(async () => {
    if (!deckId) {
      setCardsById(new Map());
      setRemainingIds([]);
      setTotalCount(0);
      setIndex(0);
      setLoadError(null);
      setReady(true);
      return;
    }

    setReady(false);
    setLoadError(null);
    setCardsById(new Map());
    setRemainingIds([]);
    setTotalCount(0);
    setIndex(0);

    try {
      try {
        await completeSession();
      } catch {
        // Prior metrics session cleanup is optional; keep deck study usable.
      }
      completeSentRef.current = false;
      const cards = await api.getStudyCards("all", deckId);
      const map = new Map(cards.map((card) => [card.card.id, card]));
      const ids = shuffle
        ? shuffleIds(cards.map((c) => c.card.id))
        : cards.map((c) => c.card.id);
      if (ids.length > 0) {
        try {
          await beginDeckSession({ deckId, mode, cardsTotal: ids.length });
        } catch {
          // Study metrics are optional; keep the deck session usable.
        }
      }
      setCardsById(map);
      setRemainingIds(ids);
      setTotalCount(ids.length);
      setIndex(0);
    } catch {
      setCardsById(new Map());
      setRemainingIds([]);
      setTotalCount(0);
      setIndex(0);
      setLoadError(copy.deckStudy.loadError);
    } finally {
      setReady(true);
    }
  }, [api, beginDeckSession, completeSession, deckId, mode, shuffle]);

  useEffect(() => {
    if (!enabled) return;
    void loadSession();
  }, [enabled, loadSession]);

  const currentId = remainingIds[index] ?? null;
  const current = currentId ? cardsById.get(currentId) : undefined;
  const remaining = Math.max(remainingIds.length - index, 0);
  const progress =
    totalCount > 0 ? ((totalCount - remaining + 1) / totalCount) * 100 : 0;
  const isComplete = ready && totalCount > 0 && index >= remainingIds.length;

  const markKnown = useCallback(async () => {
    if (!ready || !currentId || !deckId) return;
    await recordDeckKnown(currentId, deckId);
    const nextRemaining = remainingIds.filter((id) => id !== currentId);
    setRemainingIds(nextRemaining);
    const willComplete =
      nextRemaining.length === 0 || index >= nextRemaining.length;
    if (willComplete && !completeSentRef.current) {
      completeSentRef.current = true;
      await completeSession();
    }
  }, [completeSession, currentId, deckId, index, ready, recordDeckKnown, remainingIds]);

  const markStill = useCallback(async () => {
    if (!ready || !currentId || !deckId) return;
    await recordDeckStill(currentId, deckId);
    setRemainingIds((prev) => {
      if (index >= prev.length) return prev;
      const next = [...prev];
      const [id] = next.splice(index, 1);
      next.push(id);
      return next;
    });
  }, [currentId, deckId, index, ready, recordDeckStill]);

  const restart = useCallback(() => {
    void loadSession();
  }, [loadSession]);

  const sessionMeta = useMemo(
    () => ({
      remaining,
      total: totalCount,
      progress,
      isComplete,
      ready,
      loadError,
    }),
    [isComplete, loadError, progress, ready, remaining, totalCount],
  );

  return {
    current,
    sessionMeta,
    markKnown,
    markStill,
    restart,
    loadSession,
  };
}
