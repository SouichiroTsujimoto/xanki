import { useCallback, useEffect, useState } from "react";
import { copy } from "../../../copy";
import { useStudyAiAsk } from "../../../hooks/use-study-ai-ask";
import { Button } from "../../ui/button";
import { NativeDialog } from "../../ui/native-dialog";

const PRESET_QUESTIONS = [
  copy.ai.studyPresetDetail,
  copy.ai.studyPresetExample,
] as const;

interface Props {
  open: boolean;
  cardContext: string;
  onClose: () => void;
}

function formatAiError(code: string): string {
  switch (code) {
    case "ai_unavailable":
      return copy.ai.errorUnavailable;
    case "ai_auth_failed":
      return copy.ai.errorAuthFailed;
    case "ai_provider_unavailable":
      return copy.ai.errorProviderUnavailable;
    case "payment_required":
      return copy.ai.errorPaymentRequired;
    case "rate_limited":
      return copy.ai.errorRateLimited;
    default:
      return copy.ai.errorGeneric;
  }
}

export function StudyAiPanel({ open, cardContext, onClose }: Props) {
  const { ask, cancel, reset, streaming, answer, error } = useStudyAiAsk();
  const [question, setQuestion] = useState("");

  useEffect(() => {
    if (!open) {
      cancel();
      reset();
      setQuestion("");
    }
  }, [cancel, open, reset]);

  const submit = useCallback(
    (value: string) => {
      void ask(cardContext, value);
    },
    [ask, cardContext],
  );

  const handleClose = useCallback(() => {
    cancel();
    onClose();
  }, [cancel, onClose]);

  return (
    <NativeDialog
      open={open}
      onClose={handleClose}
      titleId="study-ai-title"
      panelClassName="study-ai-panel"
      closedBy={streaming ? "none" : "any"}
    >
      <h3 id="study-ai-title">{copy.ai.studyTitle}</h3>
      <p>{copy.ai.studyHint}</p>

      <div className="study-ai-presets">
        {PRESET_QUESTIONS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant="ghost"
            className="study-ai-preset"
            disabled={streaming}
            onClick={() => {
              setQuestion(preset);
              submit(preset);
            }}
          >
            {preset}
          </Button>
        ))}
      </div>

      <label className="study-ai-question-field">
        <span className="study-ai-label">{copy.ai.studyQuestionLabel}</span>
        <textarea
          className="study-ai-question-input"
          value={question}
          disabled={streaming}
          placeholder={copy.ai.studyQuestionPlaceholder}
          rows={2}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit(question);
            }
          }}
        />
      </label>

      <div className="study-ai-answer" aria-live="polite">
        {streaming && !answer && <p className="study-ai-answer-loading">{copy.ai.studyLoading}</p>}
        {answer && <p className="study-ai-answer-text">{answer}</p>}
        {error && <p className="confirm-dialog-error">{formatAiError(error)}</p>}
      </div>

      <div className="confirm-dialog-actions study-ai-actions">
        <Button type="button" variant="ghost" disabled={streaming} onClick={handleClose}>
          {copy.common.cancel}
        </Button>
        <Button
          type="button"
          variant="accent"
          disabled={streaming || !question.trim()}
          onClick={() => submit(question)}
        >
          {streaming ? copy.ai.studySending : copy.ai.studySend}
        </Button>
      </div>
    </NativeDialog>
  );
}
