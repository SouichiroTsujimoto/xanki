import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent,
} from "react";

import { useAppApi } from "../../../context/app-api-context";
import { copy } from "../../../copy";
import { remapTextMasks } from "../../../lib/remapTextMasks";
import {
  getTextareaPopupPosition,
  getTextareaSelectionOffsets,
} from "../../../lib/textSelection";
import type { Deck, TextMask } from "../../../types";

export interface TextMaskDraftOptions {
  deckId: string;
  cardId?: string;
  initialContent?: string;
  initialMasks?: TextMask[];
  initialNote?: string;
  initialAnswer?: string;
  initialQaMode?: boolean;
  onAfterSave?: () => void;
  onClose?: () => void;
  resetOnDeckChange?: boolean;
}

export function useTextMaskDraft({
  deckId,
  cardId,
  initialContent = "",
  initialMasks = [],
  initialNote = "",
  initialAnswer = "",
  initialQaMode = false,
  onAfterSave,
  onClose,
  resetOnDeckChange = false,
}: TextMaskDraftOptions) {
  const api = useAppApi();
  const [content, setContent] = useState(initialContent);
  const [answer, setAnswer] = useState(initialAnswer);
  const [qaMode, setQaMode] = useState(initialQaMode);
  const [masks, setMasks] = useState<TextMask[]>(initialMasks);
  const [note, setNote] = useState(initialNote);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(initialContent);

  const resetDraft = useCallback(() => {
    setContent("");
    setAnswer("");
    setQaMode(false);
    setMasks([]);
    setNote("");
    contentRef.current = "";
    setSelection(null);
    setPopupPos(null);
  }, []);

  useEffect(() => {
    if (cardId || !resetOnDeckChange) return;
    resetDraft();
  }, [cardId, deckId, resetDraft, resetOnDeckChange]);

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
      if (cardId) {
        onClose?.();
      } else {
        resetDraft();
        onAfterSave?.();
      }
    } catch (error) {
      console.error("save failed", error);
    } finally {
      setSaving(false);
    }
  }, [
    answer,
    api,
    canSave,
    cardId,
    content,
    deckId,
    masks,
    note,
    onAfterSave,
    onClose,
    qaMode,
    resetDraft,
    saving,
  ]);

  const captureSelection = useCallback(() => {
    const root = textRef.current;
    if (!root) return;

    const offsets = getTextareaSelectionOffsets(root);
    if (!offsets || offsets.start === offsets.end) {
      setSelection(null);
      setPopupPos(null);
      return;
    }

    const anchor = stackRef.current;
    if (!anchor) return;

    setSelection(offsets);
    setPopupPos(getTextareaPopupPosition(root, anchor));
  }, []);

  const handleQuestionScroll = useCallback(() => {
    if (!selection) return;
    const root = textRef.current;
    const anchor = stackRef.current;
    if (!root || !anchor) return;
    setPopupPos(getTextareaPopupPosition(root, anchor));
  }, [selection]);

  const handleQuestionWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const scroll = scrollRef.current;
    const textarea = textRef.current;
    if (!scroll || !textarea || event.target === textarea) return;
    scroll.scrollTop += event.deltaY;
    scroll.scrollLeft += event.deltaX;
    event.preventDefault();
  }, []);

  const handleContentChange = useCallback((next: string) => {
    const previous = contentRef.current;
    contentRef.current = next;
    setContent(next);
    setMasks((prev) => remapTextMasks(previous, next, prev));
    setSelection(null);
    setPopupPos(null);
  }, []);

  const addMask = useCallback(() => {
    if (!selection) return;
    const overlaps = masks.some(
      (mask) => selection.start < mask.end && selection.end > mask.start,
    );
    if (overlaps) return;

    setMasks((prev) => [...prev, { type: "range", ...selection }]);
    setSelection(null);
    setPopupPos(null);
    textRef.current?.focus();
  }, [masks, selection]);

  const enterQaMode = useCallback(() => {
    if (!content.trim()) return;
    setQaMode(true);
    setSelection(null);
    setPopupPos(null);
    textRef.current?.focus();
  }, [content]);

  const removeMask = useCallback((index: number) => {
    setMasks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const exitQaMode = useCallback(() => {
    const merged = mergeQaFieldsToContent(content, answer);
    contentRef.current = merged;
    setContent(merged);
    setAnswer("");
    setQaMode(false);
    setMasks([]);
    setSelection(null);
    setPopupPos(null);
    textRef.current?.focus();
  }, [answer, content]);

  return {
    content,
    answer,
    qaMode,
    masks,
    note,
    setNote,
    setAnswer,
    selection,
    popupPos,
    saving,
    canSave,
    handleSave,
    resetDraft,
    captureSelection,
    handleQuestionScroll,
    handleQuestionWheel,
    handleContentChange,
    addMask,
    enterQaMode,
    exitQaMode,
    removeMask,
    textRef,
    scrollRef,
    stackRef,
  };
}

export function mergeQaFieldsToContent(question: string, answerText: string): string {
  const q = question.trimEnd();
  const a = answerText.trim();
  if (!q) return a;
  if (!a) return q;
  return `${q}\n${a}`;
}

interface QaModeToggleProps {
  draft: ReturnType<typeof useTextMaskDraft>;
  disabled?: boolean;
}

export function TextMaskQaModeToggle({ draft, disabled = false }: QaModeToggleProps) {
  const { qaMode, content, enterQaMode, exitQaMode } = draft;

  if (qaMode) {
    return (
      <button
        type="button"
        className="qa-toolbar-button"
        data-tauri-drag-region="false"
        onClick={exitQaMode}
        title={copy.editor.qaExit}
      >
        {copy.editor.maskMode}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="qa-toolbar-button"
      data-tauri-drag-region="false"
      disabled={disabled || !content.trim()}
      onClick={enterQaMode}
      title={copy.editor.qaToggle}
    >
      Q
    </button>
  );
}

interface QuestionFieldProps {
  draft: ReturnType<typeof useTextMaskDraft>;
  placeholder?: string;
  disabled?: boolean;
}

export function TextMaskQuestionField({
  draft,
  placeholder,
  disabled = false,
}: QuestionFieldProps) {
  const {
    content,
    masks,
    selection,
    popupPos,
    captureSelection,
    handleQuestionScroll,
    handleQuestionWheel,
    handleContentChange,
    addMask,
    removeMask,
    textRef,
    scrollRef,
    stackRef,
  } = draft;

  return (
    <div ref={stackRef} className="text-edit-stack" onWheel={handleQuestionWheel}>
      <div ref={scrollRef} className="text-edit-scroll" onScroll={handleQuestionScroll}>
        <div className="text-edit-inner">
          <div className="text-edit-backdrop source-text" aria-hidden="true">
            {renderWithMasks(content, masks, removeMask)}
          </div>
          <textarea
            ref={textRef}
            className="source-text source-text-input"
            value={content}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => handleContentChange(e.target.value)}
            onSelect={captureSelection}
            onMouseUp={captureSelection}
            onKeyUp={captureSelection}
            spellCheck={false}
          />
        </div>
      </div>
      {selection && popupPos && !disabled && (
        <button
          type="button"
          className="selection-popup accent-button"
          style={{ left: popupPos.x, top: popupPos.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={addMask}
        >
          {copy.editor.addMask}
        </button>
      )}
    </div>
  );
}

interface EmbeddedProps {
  deckId: string | null;
}

export function TextMaskComposerEmbedded({ deckId }: EmbeddedProps) {
  const disabled = !deckId;

  const draft = useTextMaskDraft({
    deckId: deckId ?? "",
    resetOnDeckChange: true,
    onAfterSave: () => {},
  });

  const {
    answer,
    qaMode,
    masks,
    note,
    setNote,
    setAnswer,
    saving,
    canSave,
    handleSave,
    resetDraft,
  } = draft;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (disabled || !canSave || saving) return;
      if (event.key === "Enter" && event.metaKey) {
        event.preventDefault();
        void handleSave();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [canSave, disabled, handleSave, saving]);

  return (
    <section className="deck-study-composer" aria-label={copy.cards.addSection}>
      {disabled && <p className="add-bar-hint">{copy.cards.addHint}</p>}

      <div className="deck-study-composer-head">
        <div>
          <p className="eyebrow">{copy.editor.createText}</p>
          <p className="deck-study-composer-hint">{copy.cards.composerHint}</p>
        </div>
        <div className="deck-study-composer-meta">
          <span className="meta-chip">
            {qaMode ? copy.cards.kindQa : copy.editor.maskCount(masks.length)}
          </span>
          <TextMaskQaModeToggle draft={draft} disabled={disabled} />
        </div>
      </div>

      <div className={`deck-study-composer-workspace${disabled ? " is-disabled" : ""}`}>
        <div className={`text-surface${qaMode ? " qa-editor-layout" : ""}`}>
          {qaMode ? (
            <>
              <section className="qa-question-section">
                <p className="qa-section-label">{copy.editor.questionLabel}</p>
                <div className="qa-field-box">
                  <TextMaskQuestionField
                    draft={draft}
                    disabled={disabled}
                    placeholder={copy.cards.composerPlaceholder}
                  />
                </div>
              </section>
              <label className="qa-answer-field">
                <span className="qa-section-label">{copy.editor.answerLabel}</span>
                <div className="qa-field-box">
                  <textarea
                    className="qa-answer-input"
                    value={answer}
                    disabled={disabled}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={copy.editor.answerPlaceholder}
                    spellCheck={false}
                  />
                </div>
              </label>
            </>
          ) : (
            <TextMaskQuestionField
              draft={draft}
              disabled={disabled}
              placeholder={copy.cards.composerPlaceholder}
            />
          )}
        </div>
      </div>

      <div className="deck-study-composer-footer">
        <label className="field-inline note-field deck-study-composer-note">
          <span>{copy.editor.note}</span>
          <input
            value={note}
            disabled={disabled}
            onChange={(e) => setNote(e.target.value)}
            placeholder={copy.editor.notePlaceholder}
          />
        </label>
        <div className="deck-study-composer-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={disabled}
            onClick={resetDraft}
          >
            {copy.common.cancel}
          </button>
          <button
            type="button"
            className="accent-button"
            disabled={disabled || !canSave || saving}
            onClick={() => void handleSave()}
          >
            {saving ? copy.cards.composerSaving : copy.cards.composerSave}
          </button>
        </div>
      </div>
    </section>
  );
}

export function renderWithMasks(
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

export function useTextMaskEditorDecks(initialDeckId?: string) {
  const api = useAppApi();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState("");

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
  }, [api, initialDeckId]);

  return { decks, deckId, setDeckId };
}

export function useTextMaskEditorShortcuts(
  canSave: boolean,
  handleSave: () => Promise<void>,
  onClose: () => void,
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Enter" && event.metaKey && canSave) {
        event.preventDefault();
        void handleSave();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [canSave, handleSave, onClose]);
}
