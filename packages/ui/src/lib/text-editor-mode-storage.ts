export type TextEditorMode = "mask" | "qa";

const STORAGE_KEY = "xanki:text-editor-mode";

function isTextEditorMode(value: unknown): value is TextEditorMode {
  return value === "mask" || value === "qa";
}

/** Last user-selected mask / Q&A mode for new card creation. Default: mask. */
export function loadTextEditorMode(): TextEditorMode {
  if (typeof localStorage === "undefined") return "mask";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return "mask";
    if (isTextEditorMode(raw)) return raw;
    return "mask";
  } catch {
    return "mask";
  }
}

export function saveTextEditorMode(mode: TextEditorMode): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Quota / private mode — editor continues without persistence.
  }
}
