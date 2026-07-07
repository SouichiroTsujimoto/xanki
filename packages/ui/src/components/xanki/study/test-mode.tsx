import { copy } from "../../../copy";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppApi } from "../../../context/app-api-context";
import {
  extractMaskAnswers,
  pickDistractors,
  shuffleArray,
} from "../../../lib/maskAnswers";
import type { MaskAnswer } from "../../../types";
import { DeckStudySessionProgress, StudyEmpty } from "./shared";

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
  const [remaining, setRemaining] = useState<TestQuestion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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
    }
    void load();
  }, [deckId, shuffle, api]);

  const current = remaining[index];
  const remainingCount = Math.max(remaining.length - index, 0);
  const progress =
    totalCount > 0 ? ((totalCount - remainingCount + 1) / totalCount) * 100 : 0;
  const isComplete = totalCount > 0 && index >= remaining.length;

  const feedback = useMemo(() => {
    if (!selected || !current) return null;
    return selected === current.answer.answer ? "ok" : "ng";
  }, [selected, current]);

  function choose(choice: string) {
    if (selected || !current) return;
    setSelected(choice);
  }

  const markKnown = useCallback(() => {
    if (!current) return;
    setRemaining((prev) => prev.filter((_, i) => i !== index));
    setSelected(null);
  }, [current, index]);

  const markStill = useCallback(() => {
    if (!current) return;
    setRemaining((prev) => {
      if (index >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.push(item);
      return next;
    });
    setSelected(null);
  }, [current, index]);

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
          <button
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
          </button>
        ))}
      </div>

      {feedback && (
        <div className="test-footer">
          <p className={`write-feedback ${feedback}`}>
            {feedback === "ok" ? "正解!" : `正解: ${current?.answer.answer}`}
          </p>
          <div className="review-actions">
            <button type="button" className="ghost-button" onClick={markStill}>
              <kbd>1</kbd>
              {copy.deckStudy.still}
            </button>
            <button type="button" className="accent-button" onClick={markKnown}>
              <kbd>2</kbd>
              {copy.deckStudy.known}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
