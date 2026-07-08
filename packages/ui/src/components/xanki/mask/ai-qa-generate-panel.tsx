import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useAppApi } from "../../../context/app-api-context";
import { copy } from "../../../copy";
import {
  dialogBackdropVariants,
  dialogPanelVariants,
  transitionForReduced,
  tweenFast,
} from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";
import type { AiQaItem } from "../../../types";

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

interface Props {
  open: boolean;
  sourceText: string;
  onClose: () => void;
  onApply: (item: AiQaItem) => void;
}

export function AiQaGeneratePanel({ open, sourceText, onClose, onApply }: Props) {
  const api = useAppApi();
  const reduced = useReducedMotion();
  const transition = transitionForReduced(reduced, tweenFast);
  const [text, setText] = useState(sourceText);
  const [items, setItems] = useState<AiQaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText(sourceText);
      setItems([]);
      setError(null);
    }
  }, [open, sourceText]);

  const handleGenerate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const result = await api.qaGenerate(trimmed, "qa", 3);
      setItems(result.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "ai_failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [api, text]);

  const handleApply = useCallback(
    (item: AiQaItem) => {
      onApply(item);
      onClose();
    },
    [onApply, onClose],
  );

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
            if (!loading) onClose();
          }}
        >
          <motion.div
            className="confirm-dialog study-ai-panel ai-qa-generate-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-qa-generate-title"
            variants={dialogPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="ai-qa-generate-title">{copy.ai.generateTitle}</h3>
            <p>{copy.ai.generateHint}</p>

            <label className="study-ai-question-field">
              <span className="study-ai-label">{copy.ai.generateSourceLabel}</span>
              <textarea
                className="study-ai-question-input"
                value={text}
                disabled={loading}
                rows={5}
                onChange={(event) => setText(event.target.value)}
              />
            </label>

            {error && <p className="confirm-dialog-error">{formatAiError(error)}</p>}

            {items.length > 0 && (
              <ul className="ai-qa-generate-results">
                {items.map((item, index) => (
                  <li key={`${item.question}-${index}`} className="ai-qa-generate-result">
                    <p className="ai-qa-generate-question">{item.question}</p>
                    <p className="ai-qa-generate-answer">{item.answer}</p>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleApply(item)}
                    >
                      {copy.ai.generateApply}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="confirm-dialog-actions study-ai-actions">
              <button
                type="button"
                className="ghost-button"
                disabled={loading}
                onClick={onClose}
              >
                {copy.common.cancel}
              </button>
              <button
                type="button"
                className="accent-button"
                disabled={loading || !text.trim()}
                onClick={() => void handleGenerate()}
              >
                {loading ? copy.ai.generateLoading : copy.ai.generateAction}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
