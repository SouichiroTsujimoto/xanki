import { useCallback, useEffect, useRef, useState } from "react";
import { useAppApi } from "../../../context/app-api-context";
import { copy } from "../../../copy";
import type { AiQaItem, AiTier, AppApi } from "../../../types";
import { Button } from "../../ui/button";
import { NativeDialog } from "../../ui/native-dialog";

const COUNT_OPTIONS = [3, 5, 10] as const;
const MAX_IMAGES = 5;
const TEXT_FILE_ACCEPT = ".txt,.md,text/plain,text/markdown";
const IMAGE_FILE_ACCEPT = "image/jpeg,image/png,image/webp";

type SourceTab = "text" | "image";

interface UploadedImage {
  id: string;
  hash: string;
  name: string;
  previewUrl: string;
}

interface EditableItem extends AiQaItem {
  id: string;
}

function formatAiError(code: string): string {
  switch (code) {
    case "ai_unavailable":
      return copy.ai.errorUnavailable;
    case "ai_auth_failed":
      return copy.ai.errorAuthFailed;
    case "ai_provider_unavailable":
      return copy.ai.errorProviderUnavailable;
    case "payment_required":
      return copy.ai.errorPaymentRequired;
    case "rate_limited":
      return copy.ai.errorRateLimited;
    case "image_not_found":
      return copy.ai.cardsGenerateImageError;
    default:
      return copy.ai.errorGeneric;
  }
}

function createEditableItems(items: AiQaItem[]): EditableItem[] {
  return items.map((item, index) => ({
    ...item,
    id: `${index}-${item.question.slice(0, 24)}`,
  }));
}

function buildSourceHint(tab: SourceTab, text: string, imageCount: number): string {
  if (tab === "image") {
    return imageCount > 0 ? `AI生成（画像 ${imageCount} 枚）` : "AI生成（画像）";
  }
  const trimmed = text.trim();
  if (trimmed) {
    return trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
  }
  return "AI生成";
}

async function refreshCredits(
  api: AppApi,
  setCreditsRemaining: (value: number | null) => void,
): Promise<void> {
  try {
    const account = await api.getAccount();
    setCreditsRemaining(account.aiCreditsRemaining);
  } catch {
    setCreditsRemaining(null);
  }
}

interface Props {
  open: boolean;
  deckId: string | null;
  initialSourceText?: string;
  onClose: () => void;
  onSaved?: (count: number) => void;
}

export function AiCardGenerateDialog({
  open,
  deckId,
  initialSourceText = "",
  onClose,
  onSaved,
}: Props) {
  const api = useAppApi();
  const textFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<SourceTab>("text");
  const [text, setText] = useState(initialSourceText);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [count, setCount] = useState<(typeof COUNT_OPTIONS)[number]>(5);
  const [tier, setTier] = useState<AiTier>("thinking");
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [generationSourceHint, setGenerationSourceHint] = useState<string | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const wasOpenRef = useRef(false);

  const creditCost = tier === "thinking" ? 2 : 1;
  const busy = loading || saving || uploadingImages;

  const revokePreviewUrls = useCallback(() => {
    for (const url of previewUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    previewUrlsRef.current = [];
  }, []);

  const resetDialog = useCallback(
    (sourceText: string) => {
      revokePreviewUrls();
      setTab("text");
      setText(sourceText);
      setImages([]);
      setCount(5);
      setTier("thinking");
      setItems([]);
      setSelectedIds(new Set());
      setGenerationSourceHint(null);
      setError(null);
      setSaveMessage(null);
    },
    [revokePreviewUrls],
  );

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    resetDialog(initialSourceText);
    void refreshCredits(api, setCreditsRemaining);
  }, [api, initialSourceText, open, resetDialog]);

  useEffect(() => {
    return () => revokePreviewUrls();
  }, [revokePreviewUrls]);

  const canGenerate =
    Boolean(deckId) &&
    !busy &&
    (tab === "text" ? Boolean(text.trim()) : images.length > 0);

  const handleGenerate = useCallback(async () => {
    if (!deckId || !canGenerate) return;
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    setItems([]);
    setSelectedIds(new Set());

    try {
      const result = await api.cardsGenerate({
        text: tab === "text" ? text.trim() : undefined,
        images:
          tab === "image" ? images.map((image) => ({ blobHash: image.hash })) : undefined,
        count,
        kind: "qa",
        tier,
      });
      const editable = createEditableItems(result.items);
      setItems(editable);
      setSelectedIds(new Set(editable.map((item) => item.id)));
      setGenerationSourceHint(buildSourceHint(tab, text, images.length));
      await refreshCredits(api, setCreditsRemaining);
    } catch (err) {
      const message = err instanceof Error ? err.message : "ai_failed";
      setError(message);
      await refreshCredits(api, setCreditsRemaining);
    } finally {
      setLoading(false);
    }
  }, [api, canGenerate, count, deckId, images, tab, text, tier]);

  const uploadImageFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (list.length === 0) return;

      const available = MAX_IMAGES - images.length;
      if (available <= 0) return;

      setUploadingImages(true);
      setError(null);

      try {
        const nextImages = [...images];
        for (const file of list.slice(0, available)) {
          const buffer = await file.arrayBuffer();
          const hash = await api.uploadImageBlob(buffer, file.type || "image/jpeg");
          const previewUrl = URL.createObjectURL(file);
          previewUrlsRef.current.push(previewUrl);
          nextImages.push({
            id: crypto.randomUUID(),
            hash,
            name: file.name,
            previewUrl,
          });
        }
        setImages(nextImages);
      } catch (err) {
        console.error("image upload failed", err);
        setError(copy.ai.cardsGenerateImageError);
      } finally {
        setUploadingImages(false);
      }
    },
    [api, images],
  );

  const handleTextFile = useCallback(async (file: File) => {
    const content = await file.text();
    setText(content);
    setTab("text");
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map((item) => item.id));
    });
  }, [items]);

  const updateItem = useCallback((id: string, patch: Partial<AiQaItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const handleSaveSelected = useCallback(async () => {
    if (!deckId || saving) return;
    const selected = items.filter((item) => selectedIds.has(item.id));
    if (selected.length === 0) {
      setError(copy.ai.cardsGenerateNoSelection);
      return;
    }

    const savable = selected.filter(
      (item) => item.question.trim().length > 0 && item.answer.trim().length > 0,
    );
    if (savable.length === 0) {
      setError(copy.ai.cardsGenerateEmptyFields);
      return;
    }
    if (savable.length < selected.length) {
      setError(copy.ai.cardsGenerateEmptyFields);
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    const sourceHint = generationSourceHint ?? buildSourceHint(tab, text, images.length);
    const savedIds: string[] = [];
    let failed = false;

    try {
      for (const item of savable) {
        try {
          await api.saveQaCard({
            deckId,
            content: item.question.trim(),
            answer: item.answer.trim(),
            masks: [],
            sourceHint,
          });
          savedIds.push(item.id);
        } catch (err) {
          failed = true;
          console.error("bulk save failed", err);
          break;
        }
      }

      if (savedIds.length > 0) {
        onSaved?.(savedIds.length);
        setItems((prev) => prev.filter((item) => !savedIds.includes(item.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of savedIds) {
            next.delete(id);
          }
          return next;
        });
      }

      const remaining = savable.length - savedIds.length;
      if (failed && savedIds.length > 0) {
        setSaveMessage(copy.ai.cardsGeneratePartialSave(savedIds.length, remaining));
        setError(copy.ai.errorGeneric);
      } else if (failed) {
        setError(copy.ai.errorGeneric);
      } else {
        setSaveMessage(copy.ai.cardsGenerateSaved(savedIds.length));
      }
    } finally {
      setSaving(false);
    }
  }, [
    api,
    deckId,
    generationSourceHint,
    images.length,
    items,
    onSaved,
    saving,
    selectedIds,
    tab,
    text,
  ]);

  const canSaveSelected = items.some(
    (item) =>
      selectedIds.has(item.id) &&
      item.question.trim().length > 0 &&
      item.answer.trim().length > 0,
  );

  const handleClose = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  return (
    <NativeDialog
      open={open}
      onClose={handleClose}
      titleId="ai-card-generate-title"
      panelClassName="study-ai-panel ai-card-generate-dialog"
      closedBy={busy ? "none" : "any"}
    >
      <h3 id="ai-card-generate-title">{copy.ai.cardsGenerateTitle}</h3>
      <p>{copy.ai.cardsGenerateHint}</p>

      <div className="ai-card-generate-tabs" role="tablist" aria-label={copy.ai.cardsGenerateTitle}>
        <Button
          type="button"
          variant={tab === "text" ? "accent" : "ghost"}
          role="tab"
          aria-selected={tab === "text"}
          disabled={busy}
          onClick={() => setTab("text")}
        >
          {copy.ai.cardsGenerateTabText}
        </Button>
        <Button
          type="button"
          variant={tab === "image" ? "accent" : "ghost"}
          role="tab"
          aria-selected={tab === "image"}
          disabled={busy}
          onClick={() => setTab("image")}
        >
          {copy.ai.cardsGenerateTabImage}
        </Button>
      </div>

      {tab === "text" ? (
        <div className="ai-card-generate-source">
          <label className="study-ai-question-field">
            <span className="study-ai-label">{copy.ai.generateSourceLabel}</span>
            <textarea
              className="study-ai-question-input"
              value={text}
              disabled={busy}
              rows={6}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <div className="ai-card-generate-file-row">
            <input
              ref={textFileInputRef}
              type="file"
              accept={TEXT_FILE_ACCEPT}
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleTextFile(file);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => textFileInputRef.current?.click()}
            >
              {copy.ai.cardsGenerateUploadText}
            </Button>
            <span className="ai-card-generate-file-hint">{copy.ai.cardsGenerateUploadTextHint}</span>
          </div>
        </div>
      ) : (
        <div className="ai-card-generate-source">
          <input
            ref={imageFileInputRef}
            type="file"
            accept={IMAGE_FILE_ACCEPT}
            multiple
            className="sr-only"
            disabled={busy || images.length >= MAX_IMAGES}
            onChange={(event) => {
              if (event.target.files) void uploadImageFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="ai-card-generate-dropzone ai-card-generate-dropzone-label"
            disabled={busy || images.length >= MAX_IMAGES}
            onClick={() => imageFileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (busy) return;
              void uploadImageFiles(event.dataTransfer.files);
            }}
          >
            <span>{copy.ai.cardsGenerateDropzone}</span>
            <span className="ai-card-generate-file-hint">{copy.ai.cardsGenerateDropzoneHint}</span>
          </button>
          {uploadingImages && (
            <p className="ai-card-generate-status">{copy.ai.cardsGenerateImageUploading}</p>
          )}
          {images.length > 0 && (
            <ul className="ai-card-generate-image-list">
              {images.map((image) => (
                <li key={image.id} className="ai-card-generate-image-item">
                  <img src={image.previewUrl} alt={image.name} />
                  <span>{image.name}</span>
                  <Button
                    type="button"
                    variant="text"
                    className="danger"
                    disabled={busy}
                    onClick={() => {
                      URL.revokeObjectURL(image.previewUrl);
                      previewUrlsRef.current = previewUrlsRef.current.filter(
                        (url) => url !== image.previewUrl,
                      );
                      setImages((prev) => prev.filter((item) => item.id !== image.id));
                    }}
                  >
                    {copy.common.cancel}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="ai-card-generate-options">
        <fieldset className="ai-card-generate-fieldset">
          <legend>{copy.ai.cardsGenerateCountLabel}</legend>
          <div className="ai-card-generate-option-row">
            {COUNT_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                variant={count === option ? "accent" : "ghost"}
                disabled={busy}
                onClick={() => setCount(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset className="ai-card-generate-fieldset">
          <legend>{copy.ai.cardsGenerateTierLabel}</legend>
          <div className="ai-card-generate-option-row">
            <Button
              type="button"
              variant={tier === "fast" ? "accent" : "ghost"}
              disabled={busy}
              onClick={() => setTier("fast")}
            >
              {copy.ai.cardsGenerateTierFast}
            </Button>
            <Button
              type="button"
              variant={tier === "thinking" ? "accent" : "ghost"}
              disabled={busy}
              onClick={() => setTier("thinking")}
            >
              {copy.ai.cardsGenerateTierThinking}
            </Button>
          </div>
        </fieldset>
      </div>

      <p className="ai-card-generate-credits">
        {creditsRemaining === null
          ? copy.ai.cardsGenerateCreditsLoading
          : copy.ai.cardsGenerateCredits(creditsRemaining, creditCost)}
      </p>

      {error && <p className="confirm-dialog-error">{formatAiError(error)}</p>}
      {saveMessage && <p className="ai-card-generate-status">{saveMessage}</p>}

      {items.length > 0 && (
        <div className="ai-card-generate-results">
          <label className="ai-card-generate-select-all">
            <input
              type="checkbox"
              checked={selectedIds.size === items.length && items.length > 0}
              disabled={busy}
              onChange={toggleSelectAll}
            />
            <span>{copy.ai.cardsGenerateSelectAll}</span>
          </label>
          <ul className="ai-qa-generate-results">
            {items.map((item) => (
              <li key={item.id} className="ai-qa-generate-result ai-card-generate-result">
                <label className="ai-card-generate-result-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    disabled={busy}
                    onChange={() => toggleItem(item.id)}
                  />
                </label>
                <div className="ai-card-generate-result-fields">
                  <textarea
                    className="study-ai-question-input ai-card-generate-edit"
                    value={item.question}
                    disabled={busy}
                    rows={2}
                    onChange={(event) =>
                      updateItem(item.id, { question: event.target.value })
                    }
                  />
                  <textarea
                    className="study-ai-question-input ai-card-generate-edit"
                    value={item.answer}
                    disabled={busy}
                    rows={3}
                    onChange={(event) => updateItem(item.id, { answer: event.target.value })}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="confirm-dialog-actions study-ai-actions">
        <Button type="button" variant="ghost" disabled={busy} onClick={handleClose}>
          {copy.common.cancel}
        </Button>
        {items.length > 0 ? (
          <Button
            type="button"
            variant="accent"
            disabled={busy || selectedIds.size === 0 || !canSaveSelected}
            onClick={() => void handleSaveSelected()}
          >
            {saving
              ? copy.ai.cardsGenerateSaving
              : copy.ai.cardsGenerateSaveSelected(selectedIds.size)}
          </Button>
        ) : (
          <Button
            type="button"
            variant="accent"
            disabled={!canGenerate}
            onClick={() => void handleGenerate()}
          >
            {loading ? copy.ai.generateLoading : copy.ai.generateAction}
          </Button>
        )}
      </div>
    </NativeDialog>
  );
}
