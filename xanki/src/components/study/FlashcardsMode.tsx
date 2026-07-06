import { useEffect, useState } from "react";
import {
  StudyCardDisplay,
  StudyEmpty,
  StudyProgress,
  useStudyQueue,
} from "./shared";

interface Props {
  deckId?: string | null;
  shuffle: boolean;
}

export function FlashcardsMode({ deckId, shuffle }: Props) {
  const { queue, index, current, progress, loadQueue, next } = useStudyQueue(
    deckId,
    "all",
    shuffle,
  );
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [current]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!current) return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed((v) => !v);
      }
      if (e.key === "ArrowRight" && revealed) {
        next();
        setRevealed(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, revealed, next]);

  if (!current) {
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
      <StudyProgress index={index} total={queue.length} progress={progress} />
      <p className="review-hint study-hint">Space 答え · → 次へ</p>
      <StudyCardDisplay card={current} revealed={revealed} interactive />
      <div className="review-actions">
        <button
          type="button"
          className="ghost-button"
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? "隠す" : "答えを見る"}
        </button>
        <button
          type="button"
          className="accent-button"
          disabled={!revealed}
          onClick={() => {
            next();
            setRevealed(false);
          }}
        >
          次のカード
        </button>
      </div>
    </div>
  );
}
