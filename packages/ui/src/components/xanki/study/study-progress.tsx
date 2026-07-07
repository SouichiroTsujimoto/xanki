import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { copy as uiCopy } from "../../../copy";
import { useAppApi } from "../../../context/app-api-context";
import { springSnappy, transitionForReduced } from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";
import type { ReviewCard } from "../../../types";
export function StudyProgress({
  index,
  total,
  progress,
}: {
  index: number;
  total: number;
  progress: number;
}) {
  const reduced = useReducedMotion();

  return (
    <>
      <div className="review-progress">
        <motion.div
          className="review-progress-bar"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={transitionForReduced(reduced, springSnappy)}
        />
      </div>
      <div className="review-meta">
        <span>
          {index + 1} / {total}
        </span>
      </div>
    </>
  );
}

export function DeckStudySessionProgress({
  remaining,
  total,
  progress,
}: {
  remaining: number;
  total: number;
  progress: number;
}) {
  const reduced = useReducedMotion();

  return (
    <>
      <div className="review-progress">
        <motion.div
          className="review-progress-bar"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={transitionForReduced(reduced, springSnappy)}
        />
      </div>
      <div className="review-meta">
        <span>{uiCopy.deckStudy.sessionRemaining(remaining, total)}</span>
      </div>
    </>
  );
}

export function StudyEmpty({
  title,
  copy: bodyCopy,
  eyebrow,
  onReload,
  reloadLabel = "再読み込み",
}: {
  title: string;
  copy: string;
  eyebrow?: string;
  onReload?: () => void;
  reloadLabel?: string;
}) {
  return (
    <div className="review-stage empty">
      <div className="review-complete">
        <p className="eyebrow">{eyebrow ?? uiCopy.deckStudy.emptyEyebrow}</p>
        <h2>{title}</h2>
        <p>{bodyCopy}</p>
        {onReload && (
          <button type="button" className="accent-button" onClick={onReload}>
            {reloadLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function useStudyQueue(
  deckId: string | null | undefined,
  filter: "due" | "all",
  shuffle: boolean,
) {
  const api = useAppApi();
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [index, setIndex] = useState(0);

  const loadQueue = useCallback(async () => {
    const cards =
      filter === "due"
        ? await api.getDueCards(deckId ?? undefined)
        : await api.getStudyCards(filter, deckId ?? undefined);
    const ordered = shuffle
      ? [...cards].sort(() => Math.random() - 0.5)
      : cards;
    setQueue(ordered);
    setIndex(0);
  }, [deckId, filter, shuffle, api]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const current = queue[index];
  const progress =
    queue.length > 0 ? ((index + 1) / queue.length) * 100 : 0;

  function next() {
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    }
  }

  return { queue, index, current, progress, loadQueue, next, setIndex };
}
