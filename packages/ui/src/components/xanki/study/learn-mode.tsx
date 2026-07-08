import { useCallback, useEffect, useState } from "react";
import { buildStudyCardContext } from "@xanki/shared";
import { copy } from "../../../copy";
import { useAppApi } from "../../../context/app-api-context";
import type { ReviewGrade } from "../../../types";
import {
  StudyEmpty,
  StudyFlipCard,
  StudyProgress,
  useStudyQueue,
} from "./shared";
import { StudyAiPanel } from "./study-ai-panel";
import { Button } from "../../ui/button";

interface Props {
  deckId?: string | null;
  shuffle?: boolean;
}

const GRADES: { result: ReviewGrade; label: string; className: string }[] = [
  { result: 0, label: copy.leitnerStudy.gradeAgain, className: "ghost-button" },
  { result: 1, label: copy.leitnerStudy.gradeHard, className: "ghost-button" },
  { result: 2, label: copy.leitnerStudy.gradeGood, className: "accent-button" },
  { result: 3, label: copy.leitnerStudy.gradeEasy, className: "accent-button" },
];

export function LearnMode({ deckId, shuffle = false }: Props) {
  const api = useAppApi();
  const { queue, index, current, progress, loadQueue, next } = useStudyQueue(
    deckId,
    "due",
    shuffle,
  );
  const [revealed, setRevealed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setAiOpen(false);
  }, [current]);

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
    return (
      <StudyEmpty
        eyebrow={copy.leitnerStudy.emptyEyebrow}
        title={copy.leitnerStudy.completeTitle}
        copy={copy.leitnerStudy.completeHint}
        onReload={() => void loadQueue()}
      />
    );
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
