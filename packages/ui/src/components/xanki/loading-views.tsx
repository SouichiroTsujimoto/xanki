import type { ReactNode } from "react";

export function BootstrapLoading({ message = "読み込み中…" }: { message?: string }) {
  return (
    <div className="app-bootstrap">
      <div className="empty-panel">
        <p className="empty-title">{message}</p>
      </div>
    </div>
  );
}

export function EditorLoading({
  message = "読み込み中…",
  children,
}: {
  message?: string;
  children?: ReactNode;
}) {
  return (
    <div className="editor-shell">
      <div className="editor-loading-state empty-panel">
        {children ?? <p className="empty-title">{message}</p>}
      </div>
    </div>
  );
}
