import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/tauri/api";
import {
  answersMatch,
  extractMaskAnswers,
  normalizeAnswer,
  shuffleArray,
} from "../../lib/maskAnswers";
import type { MaskAnswer } from "../../types";
import { StudyEmpty } from "./shared";

interface Props {
  deckId?: string | null;
  shuffle: boolean;
}

export function WriteMode({ deckId, shuffle }: Props) {
  const [answers, setAnswers] = useState<MaskAnswer[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "ok" | "ng">("idle");
  const [score, setScore] = useState({ ok: 0, total: 0 });

  useEffect(() => {
    async function load() {
      const cards = await api.listCards(deckId ?? undefined);
      const extracted = extractMaskAnswers(cards);
      setAnswers(shuffle ? shuffleArray(extracted) : extracted);
      setIndex(0);
      setInput("");
      setFeedback("idle");
      setScore({ ok: 0, total: 0 });
    }
    void load();
  }, [deckId, shuffle]);

  const current = answers[index];
  const progress = answers.length > 0 ? ((index + 1) / answers.length) * 100 : 0;

  const hint = useMemo(() => {
    if (!current) return "";
    const len = current.answer.length;
    return `${len} 文字`;
  }, [current]);

  function checkAnswer() {
    if (!current) return;
    const ok = answersMatch(input, current.answer);
    setFeedback(ok ? "ok" : "ng");
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
  }

  function nextQuestion() {
    setInput("");
    setFeedback("idle");
    if (index + 1 < answers.length) {
      setIndex((i) => i + 1);
    }
  }

  if (answers.length === 0) {
    return (
      <StudyEmpty
        title="書く問題がありません"
        copy="テキストカードにマスクを追加すると、書くモードで出題されます。"
      />
    );
  }

  if (index >= answers.length && score.total > 0) {
    return (
      <div className="review-stage empty">
        <div className="review-complete">
          <p className="eyebrow">Write</p>
          <h2>
            {score.ok} / {score.total} 正解
          </h2>
          <button
            type="button"
            className="accent-button"
            onClick={() => {
              setIndex(0);
              setScore({ ok: 0, total: 0 });
              setAnswers(shuffle ? shuffleArray(answers) : [...answers]);
            }}
          >
            もう一度
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-stage write-mode">
      <div className="review-progress">
        <div className="review-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="review-hint study-hint">隠された語句を入力 · Enter 確認</p>

      <div className="write-prompt">
        <p className="eyebrow">Prompt</p>
        <pre>{current?.prompt}</pre>
        <span className="write-hint">{hint}</span>
      </div>

      <div className="write-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && feedback === "idle") checkAnswer();
            if (e.key === "Enter" && feedback !== "idle") nextQuestion();
          }}
          placeholder="答えを入力..."
          disabled={feedback !== "idle"}
          autoFocus
        />
        {feedback === "idle" ? (
          <button type="button" className="accent-button" onClick={checkAnswer}>
            確認
          </button>
        ) : (
          <button type="button" className="accent-button" onClick={nextQuestion}>
            次へ
          </button>
        )}
      </div>

      {feedback === "ok" && <p className="write-feedback ok">正解!</p>}
      {feedback === "ng" && (
        <p className="write-feedback ng">
          正解: {current?.answer}（入力: {normalizeAnswer(input) || "—"}）
        </p>
      )}
    </div>
  );
}
