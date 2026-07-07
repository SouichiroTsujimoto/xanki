import { copy } from "../../../copy";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppApi } from "../../../context/app-api-context";
import {
  answersMatch,
  extractMaskAnswers,
  normalizeAnswer,
  shuffleArray,
} from "../../../lib/maskAnswers";
import type { MaskAnswer } from "../../../types";
import { DeckStudySessionProgress, StudyEmpty } from "./shared";

interface Props {
  deckId?: string | null;
  shuffle: boolean;
}

export function WriteMode({ deckId, shuffle }: Props) {
  const api = useAppApi();
  const [remaining, setRemaining] = useState<MaskAnswer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "ok" | "ng">("idle");

  useEffect(() => {
    async function load() {
      const cards = await api.listCards(deckId ?? undefined);
      const extracted = extractMaskAnswers(cards);
      const ordered = shuffle ? shuffleArray(extracted) : extracted;
      setRemaining(ordered);
      setTotalCount(ordered.length);
      setIndex(0);
      setInput("");
      setFeedback("idle");
    }
    void load();
  }, [deckId, shuffle, api]);

  const current = remaining[index];
  const remainingCount = Math.max(remaining.length - index, 0);
  const progress =
    totalCount > 0 ? ((totalCount - remainingCount + 1) / totalCount) * 100 : 0;
  const isComplete = totalCount > 0 && index >= remaining.length;

  const hint = useMemo(() => {
    if (!current) return "";
    return `${current.answer.length} 文字`;
  }, [current]);

  function checkAnswer() {
    if (!current) return;
    const ok = answersMatch(input, current.answer);
    setFeedback(ok ? "ok" : "ng");
  }

  const markKnown = useCallback(() => {
    if (!current) return;
    setRemaining((prev) => prev.filter((_, i) => i !== index));
    setInput("");
    setFeedback("idle");
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
    setInput("");
    setFeedback("idle");
  }, [current, index]);

  if (remaining.length === 0 && totalCount === 0) {
    return (
      <StudyEmpty
        eyebrow={copy.deckStudy.emptyEyebrow}
        title={copy.writeMode.emptyTitle}
        copy={copy.writeMode.emptyCopy}
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
            const extracted = extractMaskAnswers(cards);
            const ordered = shuffle ? shuffleArray(extracted) : extracted;
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
    <div className="review-stage write-mode">
      <DeckStudySessionProgress
        remaining={remainingCount}
        total={totalCount}
        progress={progress}
      />
      <p className="review-hint study-hint">
        {feedback === "idle"
          ? "隠された語句を入力 · Enter 確認"
          : "1 まだ · 2 覚えた"}
      </p>

      <div className="write-prompt">
        <p className="eyebrow">{copy.writeMode.promptEyebrow}</p>
        <pre>{current?.prompt}</pre>
        <span className="write-hint">{hint}</span>
      </div>

      <div className="write-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && feedback === "idle") checkAnswer();
            if (feedback !== "idle" && e.key === "1") markStill();
            if (feedback !== "idle" && e.key === "2") markKnown();
          }}
          placeholder={copy.writeMode.answerPlaceholder}
          disabled={feedback !== "idle"}
          autoFocus
        />
        {feedback === "idle" ? (
          <button type="button" className="accent-button" onClick={checkAnswer}>
            確認
          </button>
        ) : (
          <>
            <button type="button" className="ghost-button" onClick={markStill}>
              <kbd>1</kbd>
              {copy.deckStudy.still}
            </button>
            <button type="button" className="accent-button" onClick={markKnown}>
              <kbd>2</kbd>
              {copy.deckStudy.known}
            </button>
          </>
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
