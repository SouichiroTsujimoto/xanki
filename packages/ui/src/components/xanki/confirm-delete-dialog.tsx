import { motion } from "motion/react";
import {
  dialogBackdropVariants,
  dialogPanelVariants,
  transitionForReduced,
  tweenFast,
} from "../../lib/motion-presets";
import { useReducedMotion } from "../../lib/use-reduced-motion";

interface Props {
  title: string;
  message: string;
  error?: string | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  title,
  message,
  error,
  deleting,
  onCancel,
  onConfirm,
}: Props) {
  const reduced = useReducedMotion();
  const transition = transitionForReduced(reduced, tweenFast);

  return (
    <motion.div
      className="confirm-backdrop"
      role="presentation"
      variants={dialogBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      onClick={() => {
        if (!deleting) onCancel();
      }}
    >
      <motion.div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        variants={dialogPanelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-delete-title">{title}</h3>
        <p>{message}</p>
        {error && <p className="confirm-dialog-error">{error}</p>}
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={deleting}
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="accent-button danger-button"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "削除中..." : "削除する"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
