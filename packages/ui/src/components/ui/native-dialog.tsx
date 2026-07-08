import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { useDialogMotion } from "../../lib/use-dialog-motion";

export interface NativeDialogProps {
  open: boolean;
  onClose: () => void;
  titleId?: string;
  className?: string;
  panelClassName?: string;
  closedBy?: "any" | "closerequest" | "none";
  children: ReactNode;
  lightDismiss?: boolean;
}

function syncDialogOpen(dialog: HTMLDialogElement | null, open: boolean) {
  if (!dialog) return;
  if (open && !dialog.open) {
    dialog.showModal();
    return;
  }
  if (!open && dialog.open) {
    dialog.close();
  }
}

export function NativeDialog({
  open,
  onClose,
  titleId,
  className,
  panelClassName,
  closedBy = "any",
  children,
  lightDismiss = true,
}: NativeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fallbackTitleId = useId();
  const resolvedTitleId = titleId ?? fallbackTitleId;
  const { useNativeAnimation, backdropVariants, panelVariants, transition } =
    useDialogMotion();

  useEffect(() => {
    if (useNativeAnimation) {
      syncDialogOpen(dialogRef.current, open);
    }
  }, [open, useNativeAnimation]);

  const handleCancel = useCallback(
    (event: Event) => {
      event.preventDefault();
      onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!useNativeAnimation) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [handleCancel, useNativeAnimation]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      if (closedBy === "any") return;
      if (!lightDismiss) return;
      if (event.target === dialogRef.current) {
        onClose();
      }
    },
    [closedBy, lightDismiss, onClose],
  );

  if (useNativeAnimation) {
    return (
      <dialog
        ref={dialogRef}
        className={cn("native-dialog", className)}
        closedby={closedBy}
        aria-labelledby={resolvedTitleId}
        onClick={handleBackdropClick}
      >
        <div className={cn("native-dialog-panel confirm-dialog", panelClassName)}>
          {children}
        </div>
      </dialog>
    );
  }

  if (!open) return null;

  return (
    <motion.div
      className="confirm-backdrop"
      role="presentation"
      variants={backdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      onClick={() => onClose()}
    >
      <motion.div
        className={cn("confirm-dialog", panelClassName)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
