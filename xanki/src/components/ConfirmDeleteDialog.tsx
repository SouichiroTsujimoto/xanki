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
  return (
    <div
      className="confirm-backdrop"
      role="presentation"
      onClick={() => {
        if (!deleting) onCancel();
      }}
    >
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
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
      </div>
    </div>
  );
}
