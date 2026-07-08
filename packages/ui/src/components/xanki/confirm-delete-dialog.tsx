import { NativeDialog } from "../ui/native-dialog";
import { Button } from "../ui/button";

interface Props {
  open?: boolean;
  title: string;
  message: string;
  error?: string | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  open = true,
  title,
  message,
  error,
  deleting,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <NativeDialog
      open={open}
      onClose={() => {
        if (!deleting) onCancel();
      }}
      titleId="confirm-delete-title"
      closedBy={deleting ? "none" : "any"}
    >
      <h3 id="confirm-delete-title">{title}</h3>
      <p>{message}</p>
      {error && <p className="confirm-dialog-error">{error}</p>}
      <div className="confirm-dialog-actions">
        <Button type="button" variant="ghost" disabled={deleting} onClick={onCancel}>
          キャンセル
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={deleting}
          onClick={onConfirm}
        >
          {deleting ? "削除中..." : "削除する"}
        </Button>
      </div>
    </NativeDialog>
  );
}
