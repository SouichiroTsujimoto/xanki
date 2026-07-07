import { copy } from "../../../copy";
import { useEffect, useMemo, useState } from "react";
import { useAppApi } from "../../../context/app-api-context";
import {
  extractMaskAnswers,
  pickDistractors,
  shuffleArray,
} from "../../../lib/maskAnswers";
import type { MaskAnswer } from "../../../types";
import { StudyEmpty } from "./shared";

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
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const cards = await api.listCards(deckId ?? undefined);
      const answers = extractMaskAnswers(cards);
      const built = answers.map((answer) => {
        const distractors = pickDistractors(answers, answer, 3);
        const choices = shuffleArray([answer.answer, ...distractors]).slice(0, 4);
        return { answer, choices };
      });
      setQuestions(shuffle ? shuffleArray(built) : built);
      setIndex(0);
      setSelected(null);
      setScore({ ok: 0, total: 0 });
      setDone(false);
    }
    void load();
  }, [deckId, shuffle, api]);

  const current = questions[index];
  const progress = questions.length > 0 ? ((index + 1) / questions.length) * 100 : 0;

  const feedback = useMemo(() => {
    if (!selected || !current) return null;
    return selected === current.answer.answer ? "ok" : "ng";
  }, [selected, current]);

  function choose(choice: string) {
    if (selected || !current) return;
    setSelected(choice);
    const ok = choice === current.answer.answer;
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
  }

  function nextQuestion() {
    setSelected(null);
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  }

  if (questions.length === 0) {
    return (
      <StudyEmpty
        title={copy.testMode.emptyTitle}
        copy={copy.testMode.emptyCopy}
      />
    );
  }

  if (done) {
    return (
      <div className="review-stage empty">
        <div className="review-complete">
          <p className="eyebrow">{copy.testMode.completeEyebrow}</p>
          <h2>
            {score.ok} / {score.total} 正解
          </h2>
          <button
            type="button"
            className="accent-button"
            onClick={() => {
              setDone(false);
              setIndex(0);
              setScore({ ok: 0, total: 0 });
              setQuestions(shuffle ? shuffleArray(questions) : [...questions]);
            }}
          >
            {copy.testMode.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-stage test-mode">
      <div className="review-progress">
        <div className="review-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="review-hint study-hint">正しい答えを選んでください</p>

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
          <button type="button" className="accent-button" onClick={nextQuestion}>
            {index + 1 < questions.length ? "次の問題" : "結果を見る"}
          </button>
        </div>
      )}
    </div>
  );
}
