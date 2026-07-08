import { copy } from "../../../copy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppApi } from "../../../context/app-api-context";
import { useStudySessionRecorder } from "../../../hooks/use-study-session-recorder";
import { extractMaskAnswers, shuffleArray } from "../../../lib/maskAnswers";
import type { MaskAnswer } from "../../../types";
import { DeckStudySessionProgress, StudyEmpty } from "./shared";
import { Button } from "../../ui/button";

interface Props {
  deckId?: string | null;
  shuffle: boolean;
}

interface MatchTile {
  id: string;
  text: string;
  pairId: string;
  side: "prompt" | "answer";
}

const BATCH_SIZE = 6;

function buildTiles(answers: MaskAnswer[]): MatchTile[] {
  const built: MatchTile[] = [];
  answers.forEach((answer, i) => {
    const pairId = `p-${i}`;
    built.push({
      id: `${pairId}-prompt`,
      text: answer.prompt.slice(0, 60),
      pairId,
      side: "prompt",
    });
    built.push({
      id: `${pairId}-answer`,
      text: answer.answer,
      pairId,
      side: "answer",
    });
  });
  return shuffleArray(built);
}

export function MatchMode({ deckId, shuffle }: Props) {
  const api = useAppApi();
  const recorder = useStudySessionRecorder();
  const completeSentRef = useRef(false);
  const [remaining, setRemaining] = useState<MaskAnswer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [roundComplete, setRoundComplete] = useState(false);

  const loadSession = useCallback(async () => {
    if (!deckId) {
      setRemaining([]);
      setTotalCount(0);
      return;
    }
    completeSentRef.current = false;
    await recorder.completeSession();
    const cards = await api.listCards(deckId ?? undefined);
    const extracted = extractMaskAnswers(cards);
    const ordered = shuffle ? shuffleArray(extracted) : extracted;
    if (ordered.length > 0) {
      await recorder.beginDeckSession({
        deckId,
        mode: "match",
        cardsTotal: ordered.length,
      });
    }
    setRemaining(ordered);
    setTotalCount(ordered.length);
    setRoundComplete(false);
  }, [api, deckId, shuffle, recorder]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const batch = useMemo(
    () => remaining.slice(0, Math.min(BATCH_SIZE, remaining.length)),
    [remaining],
  );

  useEffect(() => {
    if (batch.length === 0) {
      setTiles([]);
      setSelected(null);
      setMatched(new Set());
      setWrong(null);
      setRoundComplete(false);
      return;
    }
    setTiles(buildTiles(batch));
    setSelected(null);
    setMatched(new Set());
    setWrong(null);
    setRoundComplete(false);
  }, [batch]);

  const totalPairs = tiles.length / 2;
  const matchedPairs = matched.size / 2;
  const allPairsMatched =
    tiles.length > 0 && matchedPairs >= totalPairs && totalPairs > 0;

  useEffect(() => {
    if (allPairsMatched && !roundComplete) {
      setRoundComplete(true);
    }
  }, [allPairsMatched, roundComplete]);

  function handlePick(id: string) {
    if (roundComplete || matched.has(id)) return;

    if (!selected) {
      setSelected(id);
      return;
    }

    if (selected === id) {
      setSelected(null);
      return;
    }

    const first = tiles.find((t) => t.id === selected);
    const second = tiles.find((t) => t.id === id);
    if (!first || !second) return;

    if (first.pairId === second.pairId && first.side !== second.side) {
      setMatched((prev) => new Set([...prev, first.id, second.id]));
      setSelected(null);
      setWrong(null);
    } else {
      setWrong(id);
      window.setTimeout(() => {
        setSelected(null);
        setWrong(null);
      }, 600);
    }
  }

  const remainingCount = remaining.length;
  const progress =
    totalCount > 0 ? ((totalCount - remainingCount + 1) / totalCount) * 100 : 0;
  const isComplete = totalCount > 0 && remainingCount === 0;

  useEffect(() => {
    if (!isComplete || completeSentRef.current) return;
    completeSentRef.current = true;
    void recorder.completeSession();
  }, [isComplete, recorder]);

  const markKnown = useCallback(() => {
    if (batch.length === 0 || !deckId) return;
    void recorder.recordDeckEvents(
      batch.map((answer) => ({
        eventType: "deck_card_known" as const,
        cardId: answer.cardId,
        deckId,
      })),
    );
    setRemaining((prev) => prev.slice(batch.length));
    setRoundComplete(false);
  }, [batch, deckId, recorder]);

  const markStill = useCallback(() => {
    if (batch.length === 0 || !deckId) return;
    void recorder.recordDeckEvents(
      batch.map((answer) => ({
        eventType: "deck_card_still" as const,
        cardId: answer.cardId,
        deckId,
      })),
    );
    setRemaining((prev) => {
      const next = [...prev];
      const chunk = next.splice(0, batch.length);
      next.push(...chunk);
      return next;
    });
    setRoundComplete(false);
  }, [batch, deckId, recorder]);

  useEffect(() => {
    if (!roundComplete) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "1") markStill();
      if (e.key === "2") markKnown();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [markKnown, markStill, roundComplete]);

  if (remainingCount === 0 && totalCount === 0) {
    return (
      <StudyEmpty
        eyebrow={copy.deckStudy.emptyEyebrow}
        title={copy.matchMode.emptyTitle}
        copy={copy.matchMode.emptyCopy}
      />
    );
  }

  if (isComplete) {
    return (
      <StudyEmpty
        eyebrow={copy.deckStudy.emptyEyebrow}
        title={copy.deckStudy.sessionCompleteTitle}
        copy={copy.deckStudy.sessionCompleteCopy}
        onReload={() => void loadSession()}
        reloadLabel={copy.deckStudy.sessionRestart}
      />
    );
  }

  return (
    <div className="review-stage match-mode">
      <DeckStudySessionProgress
        remaining={remainingCount}
        total={totalCount}
        progress={progress}
      />
      <p className="review-hint study-hint">
        {roundComplete
          ? "1 まだ · 2 覚えた"
          : `問題と答えのペアを選んでください · ${matchedPairs}/${totalPairs}`}
      </p>
      <div className="match-grid">
        {tiles.map((tile) => (
          <Button
            key={tile.id}
            type="button"
            className={`match-tile ${tile.side} ${
              matched.has(tile.id) ? "matched" : ""
            } ${selected === tile.id ? "selected" : ""} ${
              wrong === tile.id ? "wrong" : ""
            }`}
            onClick={() => handlePick(tile.id)}
            disabled={matched.has(tile.id) || roundComplete}
          >
            {tile.text}
          </Button>
        ))}
      </div>
      {roundComplete && (
        <div className="review-actions">
          <Button type="button" variant="ghost" onClick={markStill}>
            <kbd>1</kbd>
            {copy.deckStudy.still}
          </Button>
          <Button type="button" variant="accent" onClick={markKnown}>
            <kbd>2</kbd>
            {copy.deckStudy.known}
          </Button>
        </div>
      )}
    </div>
  );
}
