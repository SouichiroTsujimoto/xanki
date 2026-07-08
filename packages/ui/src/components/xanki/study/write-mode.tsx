import { copy } from "../../../copy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppApi } from "../../../context/app-api-context";
import { useStudySessionRecorder } from "../../../hooks/use-study-session-recorder";
import {
  answersMatch,
  extractMaskAnswers,
  normalizeAnswer,
  shuffleArray,
} from "../../../lib/maskAnswers";
import type { MaskAnswer } from "../../../types";
import { DeckStudySessionProgress, StudyEmpty } from "./shared";
import { Button } from "../../ui/button";

interface Props {
  deckId?: string | null;
  shuffle: boolean;
}

export function WriteMode({ deckId, shuffle }: Props) {
  const api = useAppApi();
  const {
    beginDeckSession,
    completeSession,
    recordDeckKnown,
    recordDeckStill,
  } = useStudySessionRecorder();
  const completeSentRef = useRef(false);
  const [remaining, setRemaining] = useState<MaskAnswer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "ok" | "ng">("idle");

  useEffect(() => {
    async function load() {
      if (!deckId) {
        setRemaining([]);
        setTotalCount(0);
        return;
      }
      completeSentRef.current = false;
      await completeSession();
      const cards = await api.listCards(deckId ?? undefined);
      const extracted = extractMaskAnswers(cards);
      const ordered = shuffle ? shuffleArray(extracted) : extracted;
      if (ordered.length > 0) {
        await beginDeckSession({
          deckId,
          mode: "write",
          cardsTotal: ordered.length,
        });
      }
      setRemaining(ordered);
      setTotalCount(ordered.length);
      setIndex(0);
      setInput("");
      setFeedback("idle");
    }
    void load();
  }, [api, beginDeckSession, completeSession, deckId, shuffle]);

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

  const markKnown = useCallback(async () => {
    if (!current || !deckId) return;
    await recordDeckKnown(current.cardId, deckId);
    const nextRemaining = remaining.filter((_, i) => i !== index);
    setRemaining(nextRemaining);
    setInput("");
    setFeedback("idle");
    if (index >= nextRemaining.length && !completeSentRef.current) {
      completeSentRef.current = true;
      await completeSession();
    }
  }, [completeSession, current, deckId, index, recordDeckKnown, remaining]);

  const markStill = useCallback(async () => {
    if (!current || !deckId) return;
    await recordDeckStill(current.cardId, deckId);
    setRemaining((prev) => {
      if (index >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.push(item);
      return next;
    });
    setInput("");
    setFeedback("idle");
  }, [current, deckId, index, recordDeckStill]);

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
            if (!deckId) return;
            completeSentRef.current = false;
            await completeSession();
            const cards = await api.listCards(deckId ?? undefined);
            const extracted = extractMaskAnswers(cards);
            const ordered = shuffle ? shuffleArray(extracted) : extracted;
            if (ordered.length > 0) {
              await beginDeckSession({
                deckId,
                mode: "write",
                cardsTotal: ordered.length,
              });
            }
            setRemaining(ordered);
            setTotalCount(ordered.length);
            setIndex(0);
            setInput("");
            setFeedback("idle");
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
          <Button type="button" variant="accent" onClick={checkAnswer}>
            確認
          </Button>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={markStill}>
              <kbd>1</kbd>
              {copy.deckStudy.still}
            </Button>
            <Button type="button" variant="accent" onClick={markKnown}>
              <kbd>2</kbd>
              {copy.deckStudy.known}
            </Button>
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
