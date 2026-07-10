import { copy } from "../../../copy";
import { useCallback, useEffect, useState } from "react";
import { buildStudyCardContext } from "@xanki/shared";
import {
  DeckStudySessionProgress,
  StudyEmpty,
  StudyFlipCard,
  useDeckStudySession,
} from "./shared";
import { FlashcardRoundSummary } from "./flashcard-round-summary";
import { SwipeableStudyCard } from "./swipeable-study-card";
import { StudyAiPanel } from "./study-ai-panel";
import { Button } from "../../ui/button";

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
  const {
    current,
    sessionMeta,
    markKnown,
    markStill,
    continueRound,
    restart,
  } = useDeckStudySession(deckId, shuffle, !isSingle);
  const [revealed, setRevealed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [grading, setGrading] = useState(false);

  const activeCard = isSingle ? singleCard : current;
  const activeSwiped = isSingle ? 0 : sessionMeta.swiped;
  const activeRoundTotal = isSingle ? 1 : sessionMeta.roundTotal;
  const activeProgress = isSingle ? 0 : sessionMeta.progress;

  useEffect(() => {
    setRevealed(false);
    setAiOpen(false);
    setGrading(false);
  }, [activeCard?.card.id]);

  const handleKnown = useCallback(async () => {
    if (isSingle) {
      onSingleExit?.();
      return;
    }
    if (grading) return;
    setGrading(true);
    setRevealed(false);
    try {
      await markKnown();
    } finally {
      setGrading(false);
    }
  }, [grading, isSingle, markKnown, onSingleExit]);

  const handleStill = useCallback(async () => {
    if (isSingle) return;
    if (grading) return;
    setGrading(true);
    setRevealed(false);
    try {
      await markStill();
    } finally {
      setGrading(false);
    }
  }, [grading, isSingle, markStill]);

  const handleSwipeGrade = useCallback(
    (grade: "known" | "still") => {
      if (grade === "known") void handleKnown();
      else void handleStill();
    },
    [handleKnown, handleStill],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!activeCard) return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed((v) => !v);
      }
      if (!revealed || isSingle) {
        if (isSingle && e.key === "Escape") {
          e.preventDefault();
          onSingleExit?.();
        }
        return;
      }
      if (e.key === "1") void handleStill();
      if (e.key === "2") void handleKnown();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCard, handleKnown, handleStill, isSingle, onSingleExit, revealed]);

  if (!isSingle && sessionMeta.ready && sessionMeta.isComplete) {
    return (
      <FlashcardRoundSummary
        knownThisRound={sessionMeta.knownTotal}
        stillRemaining={0}
        knownTotal={sessionMeta.knownTotal}
        sessionTotal={sessionMeta.total}
        isComplete
        onContinue={continueRound}
        onRestart={restart}
      />
    );
  }

  if (!isSingle && sessionMeta.ready && sessionMeta.isRoundSummary) {
    return (
      <FlashcardRoundSummary
        knownThisRound={sessionMeta.knownThisRound}
        stillRemaining={sessionMeta.stillRemaining}
        knownTotal={sessionMeta.knownTotal}
        sessionTotal={sessionMeta.total}
        onContinue={continueRound}
        onRestart={restart}
      />
    );
  }

  if (!isSingle && !sessionMeta.ready) {
    return (
      <StudyEmpty
        eyebrow={copy.deckStudy.emptyEyebrow}
        title={copy.deckStudy.loadingSession}
        copy=""
      />
    );
  }

  if (!isSingle && sessionMeta.loadError) {
    return (
      <StudyEmpty
        eyebrow={copy.deckStudy.emptyEyebrow}
        title={sessionMeta.loadError}
        copy={copy.flashcardsMode.emptyCopy}
        onReload={restart}
        reloadLabel={copy.deckStudy.retryLoad}
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

  const flipCard = (
    <StudyFlipCard
      card={activeCard}
      revealed={revealed}
      onRevealedChange={setRevealed}
      interactive
    />
  );

  return (
    <div className="review-stage" tabIndex={0}>
      <DeckStudySessionProgress
        remaining={isSingle ? 1 : sessionMeta.remaining}
        total={isSingle ? 1 : sessionMeta.total}
        progress={activeProgress}
        swiped={activeSwiped}
        roundTotal={activeRoundTotal}
      />
      <p className="review-hint study-hint">
        {isSingle
          ? "Space / クリック 答え · Esc または戻るで閉じる"
          : revealed
            ? copy.deckStudy.flashcardHintBack
            : copy.deckStudy.flashcardHintFront}
      </p>
      <div className="study-flip-slot">
        {isSingle ? (
          flipCard
        ) : (
          <SwipeableStudyCard
            cardKey={activeCard.card.id}
            enabled={revealed}
            locked={grading}
            onGrade={handleSwipeGrade}
          >
            {flipCard}
          </SwipeableStudyCard>
        )}
      </div>
      <div className="review-actions">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setAiOpen(true)}
        >
          {copy.ai.studyAskButton}
        </Button>
        {isSingle ? (
          <>
            <Button type="button" variant="ghost" onClick={() => setRevealed((v) => !v)}>
              {revealed ? "隠す" : "答えを見る"}
            </Button>
            <Button type="button" variant="accent" onClick={() => onSingleExit?.()}>
              閉じる
            </Button>
          </>
        ) : revealed ? (
          <>
            <Button type="button" variant="ghost" onClick={() => void handleStill()} disabled={grading}>
              <kbd>1</kbd>
              {copy.deckStudy.stillAgain}
            </Button>
            <Button type="button" variant="accent" onClick={() => void handleKnown()} disabled={grading}>
              <kbd>2</kbd>
              {copy.deckStudy.known}
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setRevealed(true)}>
            答えを見る
          </Button>
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
