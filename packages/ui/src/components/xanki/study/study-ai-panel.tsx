import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { copy } from "../../../copy";
import { useStudyAiAsk } from "../../../hooks/use-study-ai-ask";
import {
  dialogBackdropVariants,
  dialogPanelVariants,
  transitionForReduced,
  tweenFast,
} from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";

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
  const reduced = useReducedMotion();
  const transition = transitionForReduced(reduced, tweenFast);
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
    <AnimatePresence>
      {open && (
        <motion.div
          className="confirm-backdrop study-ai-backdrop"
          role="presentation"
          variants={dialogBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          onClick={() => {
            if (!streaming) handleClose();
          }}
        >
          <motion.div
            className="confirm-dialog study-ai-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-ai-title"
            variants={dialogPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="study-ai-title">{copy.ai.studyTitle}</h3>
            <p>{copy.ai.studyHint}</p>

            <div className="study-ai-presets">
              {PRESET_QUESTIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="ghost-button study-ai-preset"
                  disabled={streaming}
                  onClick={() => {
                    setQuestion(preset);
                    submit(preset);
                  }}
                >
                  {preset}
                </button>
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
              {error && (
                <p className="confirm-dialog-error">{formatAiError(error)}</p>
              )}
            </div>

            <div className="confirm-dialog-actions study-ai-actions">
              <button
                type="button"
                className="ghost-button"
                disabled={streaming}
                onClick={handleClose}
              >
                {copy.common.cancel}
              </button>
              <button
                type="button"
                className="accent-button"
                disabled={streaming || !question.trim()}
                onClick={() => submit(question)}
              >
                {streaming ? copy.ai.studySending : copy.ai.studySend}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
