import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildStudyCardContext,
  normalizeReviewState,
  previewReviewGrade,
  resolveDeckSchedulerConfig,
} from "@xanki/shared";
import { copy } from "../../../copy";
import { useAppApi } from "../../../context/app-api-context";
import { useStudySessionRecorder } from "../../../hooks/use-study-session-recorder";
import type { Deck, ReviewGrade } from "../../../types";
import { LeitnerDeckSessionComplete } from "./leitner-deck-session-complete";
import { LeitnerDueCompletePanel } from "./leitner-due-complete-panel";
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
  decks: Deck[];
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
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "global" }
  | { kind: "deck"; remainingDueCount: number }
  | { kind: "error" };

export function LearnMode({ deckId, decks, shuffle = false, onBackToHub }: Props) {
  const api = useAppApi();
  const recorder = useStudySessionRecorder();
  const sessionStartedRef = useRef(false);
  const {
    queue,
    index,
    current,
    progress,
    queueReady,
    queueError,
    loadQueue,
    next,
  } = useStudyQueue(deckId, "due", shuffle);
  const [revealed, setRevealed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [completion, setCompletion] = useState<CompletionState>({ kind: "idle" });
  const [previewNow, setPreviewNow] = useState(() => Date.now());

  const resolveCompletion = useCallback(async () => {
    setCompletion({ kind: "pending" });
    try {
      const remainingDueCount = await api.getDueCount();
      if (remainingDueCount === 0) {
        setCompletion({ kind: "global" });
        return;
      }
      setCompletion({ kind: "deck", remainingDueCount });
    } catch {
      setCompletion({ kind: "error" });
    }
  }, [api]);

  useEffect(() => {
    if (queue.length === 0) {
      if (sessionStartedRef.current) {
        void recorder.completeSession().finally(() => {
          sessionStartedRef.current = false;
        });
      }
      return;
    }
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    void recorder.beginLeitnerSession(deckId, queue.length);
  }, [deckId, queue.length, recorder]);

  const deckConfigById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveDeckSchedulerConfig>>();
    for (const deck of decks) {
      map.set(deck.id, resolveDeckSchedulerConfig(deck.schedulerConfig));
    }
    return map;
  }, [decks]);

  const currentSchedulerConfig = useMemo(() => {
    if (!current) return resolveDeckSchedulerConfig(null);
    return (
      deckConfigById.get(current.card.deckId) ?? resolveDeckSchedulerConfig(null)
    );
  }, [current, deckConfigById]);

  const reviewState = useMemo(() => {
    if (!current) {
      return normalizeReviewState({ phase: "learning", step: 0, box: 1 });
    }
    return normalizeReviewState({
      phase: current.card.reviewPhase,
      step: current.card.reviewStep,
      box: current.card.boxNum ?? 1,
    });
  }, [current]);

  const gradePreviews = useMemo(() => {
    return GRADES.map((grade) =>
      previewReviewGrade(reviewState, grade.result, currentSchedulerConfig, previewNow)
        .label,
    );
  }, [reviewState, currentSchedulerConfig, previewNow]);

  useEffect(() => {
    setPreviewNow(Date.now());
  }, [current, currentSchedulerConfig]);

  useEffect(() => {
    setRevealed(false);
    setAiOpen(false);
  }, [current]);

  useEffect(() => {
    if (current) {
      setCompletion({ kind: "idle" });
    }
  }, [current]);

  useEffect(() => {
    if (!queueReady || queueError) return;
    if (queue.length === 0 && !current) {
      void resolveCompletion();
    }
  }, [queueReady, queueError, queue.length, current, resolveCompletion]);

  const submit = useCallback(
    async (result: ReviewGrade) => {
      if (!current) return;
      await api.submitReview(current.card.id, result);
      recorder.noteCardCompleted();
      setRevealed(false);
      if (index + 1 < queue.length) {
        next();
      } else {
        await loadQueue();
      }
    },
    [current, index, loadQueue, next, queue.length, api, recorder],
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
      return (
        <StudyEmpty
          eyebrow={copy.leitnerStudy.emptyEyebrow}
          title={copy.leitnerStudy.loadingQueue}
          copy=""
        />
      );
    }

    if (queueError) {
      return (
        <StudyEmpty
          eyebrow={copy.leitnerStudy.emptyEyebrow}
          title={queueError}
          copy={copy.leitnerStudy.hint}
          onReload={() => void loadQueue()}
          reloadLabel={copy.leitnerStudy.retryLoad}
        />
      );
    }

    if (completion.kind === "pending" || completion.kind === "idle") {
      return (
        <StudyEmpty
          eyebrow={copy.leitnerStudy.emptyEyebrow}
          title={copy.leitnerStudy.loadingQueue}
          copy=""
        />
      );
    }

    if (completion.kind === "error") {
      return (
        <StudyEmpty
          eyebrow={copy.leitnerStudy.emptyEyebrow}
          title={copy.leitnerStudy.completionCheckError}
          copy={copy.leitnerStudy.hint}
          onReload={() => void resolveCompletion()}
          reloadLabel={copy.leitnerStudy.retryLoad}
        />
      );
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

    return (
      <StudyEmpty
        eyebrow={copy.leitnerStudy.emptyEyebrow}
        title={copy.leitnerStudy.completionCheckError}
        copy={copy.leitnerStudy.hint}
        onReload={() => void resolveCompletion()}
        reloadLabel={copy.leitnerStudy.retryLoad}
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
            <span className="leitner-grade-label">{grade.label}</span>
            <span className="leitner-grade-interval">{gradePreviews[gradeIndex]}</span>
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
