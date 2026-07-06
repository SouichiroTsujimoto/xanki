import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/tauri/api";
import {
  StudyCardDisplay,
  StudyEmpty,
  StudyProgress,
  useStudyQueue,
} from "./shared";

interface Props {
  deckId?: string | null;
}

export function LearnMode({ deckId }: Props) {
  const { queue, index, current, progress, loadQueue, next } = useStudyQueue(
    deckId,
    "due",
    false,
  );
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [current]);

  const submit = useCallback(
    async (result: 0 | 1) => {
      if (!current) return;
      await api.submitReview(current.card.id, result);
      setRevealed(false);
      if (index + 1 < queue.length) {
        next();
      } else {
        await loadQueue();
      }
    },
    [current, index, loadQueue, next, queue.length],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!current) return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed((v) => !v);
      }
      if (e.key === "1" && revealed) void submit(0);
      if (e.key === "2" && revealed) void submit(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, revealed, submit]);

  if (!current) {
    return (
      <StudyEmpty
        title="今日の復習は完了です"
        copy="⌥⌘M / ⌥⌘S で新しいカードを追加できます。"
        onReload={() => void loadQueue()}
      />
    );
  }

  return (
    <div className="review-stage" tabIndex={0}>
      <StudyProgress index={index} total={queue.length} progress={progress} />
      <p className="review-hint study-hint">Space 答え · 1 できない · 2 できた</p>
      <StudyCardDisplay card={current} revealed={revealed} interactive />
      <div className="review-actions">
        <button
          type="button"
          className="ghost-button"
          disabled={!revealed}
          onClick={() => void submit(0)}
        >
          <kbd>1</kbd>
          できなかった
        </button>
        <button
          type="button"
          className="accent-button"
          disabled={!revealed}
          onClick={() => void submit(1)}
        >
          <kbd>2</kbd>
          できた
        </button>
      </div>
    </div>
  );
}
