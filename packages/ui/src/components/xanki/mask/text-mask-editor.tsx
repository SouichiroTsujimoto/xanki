import { copy } from "../../../copy";
import {
  TextMaskQuestionField,
  TextMaskQaModeToggle,
  useTextMaskDraft,
  useTextMaskEditorDecks,
  useTextMaskEditorShortcuts,
} from "./text-mask-composer";
import type { TextMask } from "../../../types";
import { Button } from "../../ui/button";

interface Props {
  initialContent: string;
  cardId?: string;
  initialDeckId?: string;
  initialMasks?: TextMask[];
  initialNote?: string;
  initialAnswer?: string;
  initialQaMode?: boolean;
  onClose: () => void;
}

export function TextMaskEditor({
  initialContent,
  cardId,
  initialDeckId,
  initialMasks = [],
  initialNote = "",
  initialAnswer = "",
  initialQaMode = false,
  onClose,
}: Props) {
  const { decks, deckId, setDeckId } = useTextMaskEditorDecks(initialDeckId);

  const draft = useTextMaskDraft({
    deckId,
    cardId,
    initialContent,
    initialMasks,
    initialNote,
    initialAnswer,
    initialQaMode,
    onClose,
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
  } = draft;

  useTextMaskEditorShortcuts(canSave, handleSave, onClose);

  return (
    <div className="editor-shell text-editor">
      <header className="editor-hero" data-tauri-drag-region>
        <div className="editor-hero-copy">
          <p className="eyebrow">
            {cardId
              ? qaMode
                ? copy.editor.editQaEyebrow
                : copy.editor.editTextEyebrow
              : copy.editor.createText}
          </p>
          <h1>
            {cardId
              ? qaMode
                ? copy.editor.editQa
                : copy.editor.editTextTitle
              : qaMode
                ? copy.editor.createQa
                : copy.editor.createText}
          </h1>
        </div>
        <div className="editor-meta">
          <span className="meta-chip">
            {qaMode ? copy.cards.kindQa : copy.editor.maskCount(masks.length)}
          </span>
          <span className="editor-hint">{copy.editor.saveHint}</span>
        </div>
      </header>

      <div className="editor-toolbar" data-tauri-drag-region="false">
        <label className="field-inline" data-tauri-drag-region="false">
          <span>{copy.editor.deck}</span>
          <select value={deckId} onChange={(e) => setDeckId(e.target.value)}>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-inline note-field" data-tauri-drag-region="false">
          <span>{copy.editor.note}</span>
          <input
            data-tauri-drag-region="false"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={copy.editor.notePlaceholder}
          />
        </label>
        <TextMaskQaModeToggle draft={draft} />
      </div>

      <div className="editor-workspace text-workspace">
        <div className={`text-surface ${qaMode ? "qa-editor-layout" : ""}`}>
          {qaMode ? (
            <>
              <section className="qa-question-section">
                <p className="qa-section-label">{copy.editor.questionLabel}</p>
                <div className="qa-field-box">
                  <TextMaskQuestionField draft={draft} />
                </div>
              </section>
              <label className="qa-answer-field">
                <span className="qa-section-label">{copy.editor.answerLabel}</span>
                <div className="qa-field-box">
                  <textarea
                    className="qa-answer-input"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={copy.editor.answerPlaceholder}
                    spellCheck={false}
                  />
                </div>
              </label>
            </>
          ) : (
            <TextMaskQuestionField draft={draft} />
          )}
        </div>
      </div>

      <footer className="editor-footer" data-tauri-drag-region="false">
        <Button
          type="button"
          variant="ghost"
          data-tauri-drag-region="false"
          onClick={() => onClose()}
        >
          キャンセル
        </Button>
        <Button
          type="button"
          variant="accent"
          data-tauri-drag-region="false"
          disabled={!canSave || saving}
          onClick={() => void handleSave()}
        >
          {saving ? "保存中..." : cardId ? "更新" : "保存"}
        </Button>
      </footer>
    </div>
  );
}
