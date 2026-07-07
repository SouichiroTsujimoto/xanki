import { useCallback, useEffect, useRef, useState, type ReactNode, type WheelEvent } from "react";
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
  initialAnswer?: string;
  initialQaMode?: boolean;
}

export function TextMaskEditor({
  initialContent,
  cardId,
  initialDeckId,
  initialMasks = [],
  initialNote = "",
  initialAnswer = "",
  initialQaMode = false,
}: Props) {
  const [content, setContent] = useState(initialContent);
  const [answer, setAnswer] = useState(initialAnswer);
  const [qaMode, setQaMode] = useState(initialQaMode);
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
  const backdropRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(initialContent);

  const syncQuestionScroll = useCallback(() => {
    const textarea = textRef.current;
    const backdrop = backdropRef.current;
    if (!textarea || !backdrop) return;
    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }, []);

  const handleQuestionWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      const textarea = textRef.current;
      if (!textarea || event.target === textarea) return;
      textarea.scrollTop += event.deltaY;
      textarea.scrollLeft += event.deltaX;
      syncQuestionScroll();
      event.preventDefault();
    },
    [syncQuestionScroll],
  );

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

  useEffect(() => {
    if (cardId) {
      setContent(initialContent);
      setAnswer(initialAnswer);
      setQaMode(initialQaMode);
      setMasks(initialMasks);
      contentRef.current = initialContent;
    }
  }, [cardId, initialAnswer, initialContent, initialMasks, initialQaMode]);

  const canSave = qaMode
    ? content.trim().length > 0 && answer.trim().length > 0
    : masks.length > 0;

  const handleSave = useCallback(async () => {
    if (!deckId || saving || !canSave) return;
    setSaving(true);
    try {
      if (qaMode) {
        if (cardId) {
          await api.updateQaCard({
            cardId,
            deckId,
            content,
            answer,
            masks,
            note: note || undefined,
          });
        } else {
          await api.saveQaCard({
            deckId,
            content,
            answer,
            masks,
            note: note || undefined,
          });
        }
      } else if (cardId) {
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
  }, [answer, canSave, cardId, content, deckId, masks, note, qaMode, saving]);

  const captureSelection = useCallback(() => {
    const root = textRef.current;
    if (!root) return;

    const offsets = getTextareaSelectionOffsets(root);
    if (!offsets || offsets.start === offsets.end) {
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
      if (e.key === "Enter" && e.metaKey && canSave) {
        e.preventDefault();
        void handleSave();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [canSave, handleSave]);

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

  function enterQaMode() {
    if (!content.trim()) return;
    setQaMode(true);
    setSelection(null);
    setPopupPos(null);
    textRef.current?.focus();
  }

  function removeMask(index: number) {
    setMasks((prev) => prev.filter((_, i) => i !== index));
  }

  const questionEditor = (
    <div className="text-edit-stack" onWheel={handleQuestionWheel}>
      <div
        ref={backdropRef}
        className="text-edit-backdrop source-text"
        aria-hidden="true"
      >
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
        onScroll={syncQuestionScroll}
        spellCheck={false}
      />
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
  );

  return (
    <div className="editor-shell text-editor">
      <header className="editor-hero">
        <div>
          <p className="eyebrow">
            {cardId ? (qaMode ? "Edit Q&A" : "Edit Text") : "暗記カード作成"}
          </p>
          <h1>
            {cardId
              ? qaMode
                ? "一問一答編集 ✦"
                : "テキスト編集 ✦"
              : qaMode
                ? "一問一答作成 ✦"
                : "暗記カード作成 ✦"}
          </h1>
        </div>
        <div className="editor-meta">
          <span className="meta-chip">{qaMode ? "Q&A" : `${masks.length} masks`}</span>
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
        {!qaMode && (
          <button
            type="button"
            className="qa-toolbar-button"
            disabled={!content.trim()}
            onClick={enterQaMode}
            title="一問一答形式にする"
          >
            Q
          </button>
        )}
      </div>

      <div className="editor-workspace text-workspace">
        <div
          className={`text-surface ${qaMode ? "qa-editor-layout" : ""}`}
          ref={surfaceRef}
        >
          {qaMode ? (
            <>
              <section className="qa-question-section">
                <p className="qa-section-label">問題文</p>
                <div className="qa-field-box">{questionEditor}</div>
              </section>
              <label className="qa-answer-field">
                <span className="qa-section-label">解答</span>
                <div className="qa-field-box">
                  <textarea
                    className="qa-answer-input"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="解答を入力..."
                    spellCheck={false}
                  />
                </div>
              </label>
            </>
          ) : (
            questionEditor
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
          disabled={!canSave || saving}
          onClick={() => void handleSave()}
        >
          {saving ? "保存中..." : cardId ? "更新" : "保存"}
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
