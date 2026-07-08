import { shuffleIds } from "@xanki/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeckStudyMode } from "@xanki/shared";
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
  const recorder = useStudySessionRecorder();
  const [cardsById, setCardsById] = useState<Map<string, ReviewCard>>(new Map());
  const [remainingIds, setRemainingIds] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const completeSentRef = useRef(false);

  const loadSession = useCallback(async () => {
    if (!deckId) {
      setCardsById(new Map());
      setRemainingIds([]);
      setTotalCount(0);
      setIndex(0);
      setReady(true);
      return;
    }

    setReady(false);
    completeSentRef.current = false;
    recorder.resetSession();
    const cards = await api.getStudyCards("all", deckId);
    const map = new Map(cards.map((card) => [card.card.id, card]));
    const ids = shuffle ? shuffleIds(cards.map((c) => c.card.id)) : cards.map((c) => c.card.id);
    setCardsById(map);
    setRemainingIds(ids);
    setTotalCount(ids.length);
    setIndex(0);
    if (ids.length > 0) {
      await recorder.beginDeckSession({ deckId, mode, cardsTotal: ids.length });
    }
    setReady(true);
  }, [api, deckId, mode, recorder, shuffle]);

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

  useEffect(() => {
    if (!isComplete || completeSentRef.current) return;
    completeSentRef.current = true;
    void recorder.completeSession();
  }, [isComplete, recorder]);

  const markKnown = useCallback(() => {
    if (!currentId || !deckId) return;
    void recorder.recordDeckKnown(currentId, deckId);
    setRemainingIds((prev) => prev.filter((id) => id !== currentId));
  }, [currentId, deckId, recorder]);

  const markStill = useCallback(() => {
    if (!currentId || !deckId) return;
    void recorder.recordDeckStill(currentId, deckId);
    setRemainingIds((prev) => {
      if (index >= prev.length) return prev;
      const next = [...prev];
      const [id] = next.splice(index, 1);
      next.push(id);
      return next;
    });
  }, [currentId, deckId, index, recorder]);

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
    }),
    [isComplete, progress, ready, remaining, totalCount],
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
