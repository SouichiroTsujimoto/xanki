import { copy } from "../../../copy";
import { useCallback, useEffect, useState } from "react";
import { buildStudyCardContext } from "@xanki/shared";
import {
  DeckStudySessionProgress,
  StudyEmpty,
  StudyFlipCard,
  useDeckStudySession,
} from "./shared";
import { StudyAiPanel } from "./study-ai-panel";

interface Props {
  deckId?: string | null;
  shuffle: boolean;
  singleCard?: import("../../../types").ReviewCard | null;
  onSingleExit?: () => void;
}

export function FlashcardsMode({
  deckId,
  shuffle,
  singleCard = null,
  onSingleExit,
}: Props) {
  const isSingle = singleCard != null;
  const { current, sessionMeta, markKnown, markStill, restart } = useDeckStudySession(
    deckId,
    shuffle,
    !isSingle,
  );
  const [revealed, setRevealed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const activeCard = isSingle ? singleCard : current;
  const activeRemaining = isSingle ? 1 : sessionMeta.remaining;
  const activeTotal = isSingle ? 1 : sessionMeta.total;
  const activeProgress = isSingle ? 100 : sessionMeta.progress;

  useEffect(() => {
    setRevealed(false);
    setAiOpen(false);
  }, [activeCard]);

  const handleKnown = useCallback(() => {
    if (isSingle) {
      onSingleExit?.();
      return;
    }
    setRevealed(false);
    markKnown();
  }, [isSingle, markKnown, onSingleExit]);

  const handleStill = useCallback(() => {
    if (isSingle) return;
    setRevealed(false);
    markStill();
  }, [isSingle, markStill]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!activeCard) return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed((v) => !v);
      }
      if (!revealed) return;
      if (e.key === "1") handleStill();
      if (e.key === "2") handleKnown();
      if (isSingle && e.key === "Escape") {
        e.preventDefault();
        onSingleExit?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCard, handleKnown, handleStill, isSingle, onSingleExit, revealed]);

  if (!isSingle && sessionMeta.ready && sessionMeta.isComplete) {
    return (
      <StudyEmpty
        eyebrow={copy.deckStudy.emptyEyebrow}
        title={copy.deckStudy.sessionCompleteTitle}
        copy={copy.deckStudy.sessionCompleteCopy}
        onReload={restart}
        reloadLabel={copy.deckStudy.sessionRestart}
      />
    );
  }

  if (!activeCard) {
    return (
      <StudyEmpty
        eyebrow={copy.deckStudy.emptyEyebrow}
        title={copy.flashcardsMode.emptyTitle}
        copy={copy.flashcardsMode.emptyCopy}
        onReload={restart}
      />
    );
  }

  return (
    <div className="review-stage" tabIndex={0}>
      <DeckStudySessionProgress
        remaining={activeRemaining}
        total={activeTotal}
        progress={activeProgress}
      />
      <p className="review-hint study-hint">
        {isSingle
          ? "Space / クリック 答え · Esc または戻るで閉じる"
          : revealed
            ? "1 まだ · 2 覚えた"
            : "Space / クリック 答え"}
      </p>
      <div className="study-flip-slot">
        <StudyFlipCard
          card={activeCard}
          revealed={revealed}
          onRevealedChange={setRevealed}
          interactive
        />
      </div>
      <div className="review-actions">
        <button
          type="button"
          className="ghost-button"
          onClick={() => setAiOpen(true)}
        >
          {copy.ai.studyAskButton}
        </button>
        {isSingle ? (
          <>
            <button type="button" className="ghost-button" onClick={() => setRevealed((v) => !v)}>
              {revealed ? "隠す" : "答えを見る"}
            </button>
            <button type="button" className="accent-button" onClick={() => onSingleExit?.()}>
              閉じる
            </button>
          </>
        ) : revealed ? (
          <>
            <button type="button" className="ghost-button" onClick={handleStill}>
              <kbd>1</kbd>
              {copy.deckStudy.still}
            </button>
            <button type="button" className="accent-button" onClick={handleKnown}>
              <kbd>2</kbd>
              {copy.deckStudy.known}
            </button>
          </>
        ) : (
          <button type="button" className="ghost-button" onClick={() => setRevealed(true)}>
            答えを見る
          </button>
        )}
      </div>
      <StudyAiPanel
        open={aiOpen}
        cardContext={buildStudyCardContext(activeCard.card)}
        onClose={() => setAiOpen(false)}
      />
    </div>
  );
}
