import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "../lib/tauri/api";
import { remapTextMasks } from "../lib/remapTextMasks";
import {
  getTextareaPopupPosition,
  getTextareaSelectionOffsets,
} from "../lib/textSelection";
import type { Deck, TextMask } from "../types";

interface Props {
  initialContent: string;
  cardId?: string;
  initialDeckId?: string;
  initialMasks?: TextMask[];
  initialNote?: string;
}

export function TextMaskEditor({
  initialContent,
  cardId,
  initialDeckId,
  initialMasks = [],
  initialNote = "",
}: Props) {
  const [content, setContent] = useState(initialContent);
  const [masks, setMasks] = useState<TextMask[]>(initialMasks);
  const [note, setNote] = useState(initialNote);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(
    null,
  );
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(initialContent);

  useEffect(() => {
    async function init() {
      const [deckList, lastDeck] = await Promise.all([
        api.listDecks(),
        api.getLastUsedDeckId(),
      ]);
      setDecks(deckList);
      setDeckId(initialDeckId ?? lastDeck ?? deckList[0]?.id ?? "");
    }
    void init();
  }, [initialDeckId]);

  const handleSave = useCallback(async () => {
    if (!deckId || saving || masks.length === 0) return;
    setSaving(true);
    try {
      if (cardId) {
        await api.updateTextCard({ cardId, deckId, content, masks, note: note || undefined });
      } else {
        await api.saveTextCard({ deckId, content, masks, note: note || undefined });
      }
      await getCurrentWindow().close();
    } catch (error) {
      console.error("save failed", error);
    } finally {
      setSaving(false);
    }
  }, [cardId, content, deckId, masks, note, saving]);

  const captureSelection = useCallback(() => {
    const root = textRef.current;
    if (!root) return;

    const offsets = getTextareaSelectionOffsets(root);
    if (!offsets) {
      setSelection(null);
      setPopupPos(null);
      return;
    }

    setSelection(offsets);
    setPopupPos(getTextareaPopupPosition(root));
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        void getCurrentWindow().close();
      }
      if (e.key === "Enter" && e.metaKey && masks.length > 0) {
        e.preventDefault();
        void handleSave();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [handleSave, masks.length]);

  function handleContentChange(next: string) {
    const previous = contentRef.current;
    contentRef.current = next;
    setContent(next);
    setMasks((prev) => remapTextMasks(previous, next, prev));
    setSelection(null);
    setPopupPos(null);
  }

  function addMask() {
    if (!selection) return;
    const overlaps = masks.some(
      (mask) => selection.start < mask.end && selection.end > mask.start,
    );
    if (overlaps) return;

    setMasks((prev) => [...prev, { type: "range", ...selection }]);
    setSelection(null);
    setPopupPos(null);
    textRef.current?.focus();
  }

  function removeMask(index: number) {
    setMasks((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="editor-shell text-editor">
      <header className="editor-hero">
        <div>
          <p className="eyebrow">{cardId ? "Edit Text" : "暗記カード作成"}</p>
          <h1>{cardId ? "テキスト編集 ✦" : "暗記カード作成 ✦"}</h1>
        </div>
        <div className="editor-meta">
          <span className="meta-chip">{masks.length} masks</span>
          <span className="editor-hint">⌘Enter 保存 · Esc キャンセル</span>
        </div>
      </header>

      <div className="editor-toolbar">
        <label className="field-inline">
          <span>Deck</span>
          <select value={deckId} onChange={(e) => setDeckId(e.target.value)}>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-inline note-field">
          <span>メモ</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="任意"
          />
        </label>
      </div>

      <div className="editor-workspace text-workspace">
        <div className="text-surface" ref={surfaceRef}>
          <div className="text-edit-stack">
            <div className="text-edit-backdrop source-text" aria-hidden="true">
              {renderWithMasks(content, masks, removeMask)}
            </div>
            <textarea
              ref={textRef}
              className="source-text source-text-input"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onSelect={captureSelection}
              onMouseUp={captureSelection}
              onKeyUp={captureSelection}
              spellCheck={false}
            />
          </div>

          {selection && popupPos && (
            <button
              type="button"
              className="selection-popup accent-button"
              style={{ left: popupPos.x, top: popupPos.y }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={addMask}
            >
              + マスク
            </button>
          )}
        </div>
      </div>

      <footer className="editor-footer">
        <button type="button" className="ghost-button" onClick={() => void getCurrentWindow().close()}>
          キャンセル
        </button>
        <button
          type="button"
          className="accent-button"
          disabled={masks.length === 0 || saving}
          onClick={() => void handleSave()}
        >
          {saving ? "保存中..." : cardId ? `更新 ${masks.length} 件` : `保存 ${masks.length} 件`}
        </button>
      </footer>
    </div>
  );
}

function renderWithMasks(
  content: string,
  masks: TextMask[],
  onRemove: (index: number) => void,
) {
  if (masks.length === 0) return content;

  const sorted = masks
    .map((mask, index) => ({ mask, index }))
    .sort((a, b) => a.mask.start - b.mask.start);

  const parts: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach(({ mask, index }) => {
    if (cursor < mask.start) {
      parts.push(content.slice(cursor, mask.start));
    }
    parts.push(
      <mark
        key={`${mask.start}-${mask.end}`}
        className="mask-mark"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onRemove(index)}
        title="クリックで削除"
      >
        {content.slice(mask.start, mask.end)}
      </mark>,
    );
    cursor = mask.end;
  });

  if (cursor < content.length) {
    parts.push(content.slice(cursor));
  }

  return parts;
}
