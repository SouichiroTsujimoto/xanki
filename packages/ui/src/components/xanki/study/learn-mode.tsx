import { useCallback, useEffect, useState } from "react";
import { buildStudyCardContext } from "@xanki/shared";
import { copy } from "../../../copy";
import { useAppApi } from "../../../context/app-api-context";
import type { ReviewGrade } from "../../../types";
import { LeitnerDeckSessionComplete } from "./leitner-deck-session-complete";
import { LeitnerDueCompletePanel } from "./leitner-due-complete-panel";
import {
  StudyFlipCard,
  StudyProgress,
  useStudyQueue,
} from "./shared";
import { StudyAiPanel } from "./study-ai-panel";
import { Button } from "../../ui/button";

interface Props {
  deckId?: string | null;
  shuffle?: boolean;
  onBackToHub?: () => void;
}

const GRADES: { result: ReviewGrade; label: string; className: string }[] = [
  { result: 0, label: copy.leitnerStudy.gradeAgain, className: "ghost-button" },
  { result: 1, label: copy.leitnerStudy.gradeHard, className: "ghost-button" },
  { result: 2, label: copy.leitnerStudy.gradeGood, className: "accent-button" },
  { result: 3, label: copy.leitnerStudy.gradeEasy, className: "accent-button" },
];

type CompletionState =
  | { kind: "none" }
  | { kind: "global" }
  | { kind: "deck"; remainingDueCount: number };

export function LearnMode({ deckId, shuffle = false, onBackToHub }: Props) {
  const api = useAppApi();
  const { queue, index, current, progress, queueReady, loadQueue, next } = useStudyQueue(
    deckId,
    "due",
    shuffle,
  );
  const [revealed, setRevealed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [completion, setCompletion] = useState<CompletionState>({ kind: "none" });

  const resolveCompletion = useCallback(async () => {
    const globalDue = await api.getDueCards();
    if (globalDue.length === 0) {
      setCompletion({ kind: "global" });
      return;
    }
    setCompletion({ kind: "deck", remainingDueCount: globalDue.length });
  }, [api]);

  useEffect(() => {
    setRevealed(false);
    setAiOpen(false);
  }, [current]);

  useEffect(() => {
    if (current) {
      setCompletion({ kind: "none" });
    }
  }, [current]);

  useEffect(() => {
    if (!queueReady) return;
    if (queue.length === 0 && !current) {
      void resolveCompletion();
    }
  }, [queueReady, queue.length, current, resolveCompletion]);

  const submit = useCallback(
    async (result: ReviewGrade) => {
      if (!current) return;
      await api.submitReview(current.card.id, result);
      setRevealed(false);
      if (index + 1 < queue.length) {
        next();
      } else {
        await loadQueue();
      }
    },
    [current, index, loadQueue, next, queue.length, api],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!current) return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed((v) => !v);
      }
      if (e.key === "1") void submit(0);
      if (e.key === "2") void submit(1);
      if (e.key === "3") void submit(2);
      if (e.key === "4") void submit(3);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, submit]);

  if (!current) {
    if (!queueReady) {
      return null;
    }

    if (completion.kind === "global") {
      return (
        <div className="review-stage empty leitner-review-stage">
          <LeitnerDueCompletePanel
            layout="session"
            onBackToHub={onBackToHub}
          />
        </div>
      );
    }

    if (completion.kind === "deck" && onBackToHub) {
      return (
        <LeitnerDeckSessionComplete
          remainingDueCount={completion.remainingDueCount}
          onBackToHub={onBackToHub}
        />
      );
    }

    return null;
  }

  return (
    <div className="review-stage leitner-review-stage" tabIndex={0}>
      <StudyProgress index={index} total={queue.length} progress={progress} />
      <p className="review-hint study-hint">{copy.leitnerStudy.hint}</p>
      <div className="study-flip-slot">
        <StudyFlipCard
          card={current}
          revealed={revealed}
          onRevealedChange={setRevealed}
          interactive
        />
      </div>
      <div className="review-actions leitner-grade-actions">
        <Button
          type="button"
          className="ghost-button study-ai-trigger"
          onClick={() => setAiOpen(true)}
        >
          {copy.ai.studyAskButton}
        </Button>
        {GRADES.map((grade, gradeIndex) => (
          <Button
            key={grade.result}
            type="button"
            className={grade.className}
            onClick={() => void submit(grade.result)}
          >
            <kbd>{gradeIndex + 1}</kbd>
            {grade.label}
          </Button>
        ))}
      </div>
      <StudyAiPanel
        open={aiOpen}
        cardContext={buildStudyCardContext(current.card)}
        onClose={() => setAiOpen(false)}
      />
    </div>
  );
}
