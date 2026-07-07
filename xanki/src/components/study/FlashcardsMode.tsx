import { useCallback, useEffect, useState } from "react";
import {
  StudyEmpty,
  StudyFlipCard,
  StudyProgress,
  useStudyQueue,
} from "./shared";
import type { ReviewCard } from "../../types";

interface Props {
  deckId?: string | null;
  shuffle: boolean;
  singleCard?: ReviewCard | null;
  onSingleExit?: () => void;
}

export function FlashcardsMode({
  deckId,
  shuffle,
  singleCard = null,
  onSingleExit,
}: Props) {
  const isSingle = singleCard != null;
  const { queue, index, current, progress, loadQueue, next } = useStudyQueue(
    deckId,
    "all",
    shuffle,
  );
  const [revealed, setRevealed] = useState(false);

  const activeCard = isSingle ? singleCard : current;
  const activeIndex = isSingle ? 0 : index;
  const activeTotal = isSingle ? 1 : queue.length;
  const activeProgress = isSingle ? 100 : progress;

  useEffect(() => {
    setRevealed(false);
  }, [activeCard]);

  const handleAdvance = useCallback(() => {
    if (isSingle) {
      onSingleExit?.();
      return;
    }
    next();
    setRevealed(false);
  }, [isSingle, next, onSingleExit]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!activeCard) return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed((v) => !v);
      }
      if (e.key === "ArrowRight") {
        handleAdvance();
      }
      if (isSingle && e.key === "Escape") {
        e.preventDefault();
        onSingleExit?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeCard, handleAdvance, isSingle, onSingleExit]);

  if (!activeCard) {
    return (
      <StudyEmpty
        title="カードがありません"
        copy="ライブラリにカードを追加するか、別のデッキを選んでください。"
        onReload={() => void loadQueue()}
      />
    );
  }

  return (
    <div className="review-stage" tabIndex={0}>
      <StudyProgress
        index={activeIndex}
        total={activeTotal}
        progress={activeProgress}
      />
      <p className="review-hint study-hint">
        {isSingle
          ? "Space / クリック 答え · Esc または戻るで閉じる"
          : "Space / クリック 答え · → 次へ"}
      </p>
      <StudyFlipCard
        card={activeCard}
        revealed={revealed}
        onRevealedChange={setRevealed}
        interactive
      />
      <div className="review-actions">
        <button
          type="button"
          className="ghost-button"
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? "隠す" : "答えを見る"}
        </button>
        <button type="button" className="accent-button" onClick={handleAdvance}>
          {isSingle ? "閉じる" : "次のカード"}
        </button>
      </div>
    </div>
  );
}
