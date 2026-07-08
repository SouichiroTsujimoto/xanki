import { copy } from "../../../copy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppApi } from "../../../context/app-api-context";
import { useStudySessionRecorder } from "../../../hooks/use-study-session-recorder";
import {
  extractMaskAnswers,
  pickDistractors,
  shuffleArray,
} from "../../../lib/maskAnswers";
import type { MaskAnswer } from "../../../types";
import { DeckStudySessionProgress, StudyEmpty } from "./shared";
import { Button } from "../../ui/button";

interface Props {
  deckId?: string | null;
  shuffle: boolean;
}

interface TestQuestion {
  answer: MaskAnswer;
  choices: string[];
}

export function TestMode({ deckId, shuffle }: Props) {
  const api = useAppApi();
  const recorder = useStudySessionRecorder();
  const completeSentRef = useRef(false);
  const [remaining, setRemaining] = useState<TestQuestion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!deckId) {
        setRemaining([]);
        setTotalCount(0);
        return;
      }
      completeSentRef.current = false;
      recorder.resetSession();
      const cards = await api.listCards(deckId ?? undefined);
      const answers = extractMaskAnswers(cards);
      const built = answers.map((answer) => {
        const distractors = pickDistractors(answers, answer, 3);
        const choices = shuffleArray([answer.answer, ...distractors]).slice(0, 4);
        return { answer, choices };
      });
      const ordered = shuffle ? shuffleArray(built) : built;
      setRemaining(ordered);
      setTotalCount(ordered.length);
      setIndex(0);
      setSelected(null);
      if (ordered.length > 0) {
        await recorder.beginDeckSession({
          deckId,
          mode: "test",
          cardsTotal: ordered.length,
        });
      }
    }
    void load();
  }, [deckId, shuffle, api, recorder]);

  const current = remaining[index];
  const remainingCount = Math.max(remaining.length - index, 0);
  const progress =
    totalCount > 0 ? ((totalCount - remainingCount + 1) / totalCount) * 100 : 0;
  const isComplete = totalCount > 0 && index >= remaining.length;

  useEffect(() => {
    if (!isComplete || completeSentRef.current) return;
    completeSentRef.current = true;
    void recorder.completeSession();
  }, [isComplete, recorder]);

  const feedback = useMemo(() => {
    if (!selected || !current) return null;
    return selected === current.answer.answer ? "ok" : "ng";
  }, [selected, current]);

  function choose(choice: string) {
    if (selected || !current) return;
    setSelected(choice);
  }

  const markKnown = useCallback(() => {
    if (!current || !deckId) return;
    void recorder.recordDeckKnown(current.answer.cardId, deckId);
    setRemaining((prev) => prev.filter((_, i) => i !== index));
    setSelected(null);
  }, [current, deckId, index, recorder]);

  const markStill = useCallback(() => {
    if (!current || !deckId) return;
    void recorder.recordDeckStill(current.answer.cardId, deckId);
    setRemaining((prev) => {
      if (index >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.push(item);
      return next;
    });
    setSelected(null);
  }, [current, deckId, index, recorder]);

  if (remaining.length === 0 && totalCount === 0) {
    return (
      <StudyEmpty
        eyebrow={copy.deckStudy.emptyEyebrow}
        title={copy.testMode.emptyTitle}
        copy={copy.testMode.emptyCopy}
      />
    );
  }

  if (isComplete) {
    return (
      <StudyEmpty
        eyebrow={copy.deckStudy.emptyEyebrow}
        title={copy.deckStudy.sessionCompleteTitle}
        copy={copy.deckStudy.sessionCompleteCopy}
        onReload={() => {
          void (async () => {
            const cards = await api.listCards(deckId ?? undefined);
            const answers = extractMaskAnswers(cards);
            const built = answers.map((answer) => {
              const distractors = pickDistractors(answers, answer, 3);
              const choices = shuffleArray([answer.answer, ...distractors]).slice(0, 4);
              return { answer, choices };
            });
            const ordered = shuffle ? shuffleArray(built) : built;
            setRemaining(ordered);
            setTotalCount(ordered.length);
            setIndex(0);
          })();
        }}
        reloadLabel={copy.deckStudy.sessionRestart}
      />
    );
  }

  return (
    <div className="review-stage test-mode">
      <DeckStudySessionProgress
        remaining={remainingCount}
        total={totalCount}
        progress={progress}
      />
      <p className="review-hint study-hint">
        {selected ? "1 まだ · 2 覚えた" : "正しい答えを選んでください"}
      </p>

      <div className="write-prompt">
        <p className="eyebrow">{copy.testMode.questionEyebrow}</p>
        <pre>{current?.answer.prompt}</pre>
      </div>

      <div className="test-choices">
        {current?.choices.map((choice) => (
          <Button
            key={choice}
            type="button"
            className={`test-choice ${
              selected
                ? choice === current.answer.answer
                  ? "correct"
                  : choice === selected
                    ? "wrong"
                    : ""
                : ""
            }`}
            disabled={!!selected}
            onClick={() => choose(choice)}
          >
            {choice}
          </Button>
        ))}
      </div>

      {feedback && (
        <div className="test-footer">
          <p className={`write-feedback ${feedback}`}>
            {feedback === "ok" ? "正解!" : `正解: ${current?.answer.answer}`}
          </p>
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
        </div>
      )}
    </div>
  );
}
