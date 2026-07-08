import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";


import { useAppApi } from "../../../context/app-api-context";
import { copy } from "../../../copy";
import {
  maskOverlayStyle,
  pointerToImageCoords,
  useImageOverlayLayout,
  type ImageRect,
} from "../../../lib/imageOverlay";
import { IMAGE_EDITOR_OCR_ENABLED } from "../../../lib/imageEditorFeatures";
import {
  DEFAULT_MASK_COLOR_ID,
  MASK_COLORS,
  maskPaintStyle,
  type MaskColorId,
} from "../../../lib/maskColors";
import type { Deck, ImageMask, ImageRegion, OcrResult, OcrWord, RectMask } from "../../../types";
import { Button } from "../../ui/button";

interface Props {
  imagePath: string;
  cardId?: string;
  initialDeckId?: string;
  initialMasks?: ImageMask[];
  initialNote?: string;
  initialOcr?: OcrResult | null;
  onClose: () => void;
}

type EditorMode = "mask" | "ocr";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function rectOverlayStyle(
  rect: RectMask,
  layout: ReturnType<typeof useImageOverlayLayout>,
): CSSProperties {
  return maskOverlayStyle(rect, layout);
}

function clampRect(
  x: number,
  y: number,
  w: number,
  h: number,
  maxW: number,
  maxH: number,
  color: MaskColorId,
): RectMask {
  const left = Math.max(0, Math.min(x, maxW));
  const top = Math.max(0, Math.min(y, maxH));
  const width = Math.max(0, Math.min(w, maxW - left));
  const height = Math.max(0, Math.min(h, maxH - top));
  return { type: "rect", x: left, y: top, w: width, h: height, color };
}

function initialSelectedColor(masks: ImageMask[]): MaskColorId {
  const lastRect = [...masks].reverse().find((mask): mask is RectMask => mask.type === "rect");
  if (lastRect?.color && MASK_COLORS.some((color) => color.id === lastRect.color)) {
    return lastRect.color as MaskColorId;
  }
  const lastOcr = [...masks].reverse().find((mask) => mask.type === "ocr");
  if (lastOcr?.color && MASK_COLORS.some((color) => color.id === lastOcr.color)) {
    return lastOcr.color as MaskColorId;
  }
  return DEFAULT_MASK_COLOR_ID;
}

export function ImageMaskEditor({
  imagePath,
  cardId,
  initialDeckId,
  initialMasks = [],
  initialNote = "",
  initialOcr = null,
  onClose,
}: Props) {
  const api = useAppApi();
  const [imageSrc, setImageSrc] = useState("");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState("");
  const [masks, setMasks] = useState<ImageMask[]>(cardId ? initialMasks : []);
  const [mode, setMode] = useState<EditorMode>("mask");
  const [ocr, setOcr] = useState<OcrResult | null>(initialOcr);
  const [note, setNote] = useState(initialNote);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<RectMask | null>(null);
  const [zoom, setZoom] = useState(1);
  const [maskColorId, setMaskColorId] = useState<MaskColorId>(() =>
    initialSelectedColor(initialMasks),
  );
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const layout = useImageOverlayLayout(imgRef, imageSrc);
  const naturalSize = {
    w: layout.naturalW,
    h: layout.naturalH,
  };

  useEffect(() => {
    async function init() {
      const [url, deckList, lastDeck] = await Promise.all([
        api.resolveImageUrl(imagePath),
        api.listDecks(),
        api.getLastUsedDeckId(),
      ]);
      setImageSrc(url);
      setDecks(deckList);
      setDeckId(initialDeckId ?? lastDeck ?? deckList[0]?.id ?? "");
    }
    void init();
  }, [imagePath, initialDeckId]);

  useEffect(() => {
    if (cardId) {
      setMasks(initialMasks);
      setMaskColorId(initialSelectedColor(initialMasks));
    }
  }, [cardId, initialMasks]);

  const handleSave = useCallback(async () => {
    if (!deckId || saving || masks.length === 0) return;

    setSaving(true);
    try {
      if (cardId) {
        await api.updateImageCard({
          cardId,
          deckId,
          masks,
          note: note || undefined,
          ocrText: ocr?.fullText,
          ocrData: ocr ? JSON.stringify(ocr) : undefined,
        });
      } else {
        if (naturalSize.w === 0 || naturalSize.h === 0) return;
        const region: ImageRegion = {
          cropX: 0,
          cropY: 0,
          cropW: naturalSize.w,
          cropH: naturalSize.h,
          masks,
        };
        await api.saveImageCards({
          deckId,
          imagePath,
          ocrText: ocr?.fullText,
          ocrData: ocr ? JSON.stringify(ocr) : undefined,
          regions: [region],
        });
      }
      onClose();
    } catch (error) {
      console.error("save failed", error);
    } finally {
      setSaving(false);
    }
  }, [cardId, deckId, imagePath, masks, naturalSize.h, naturalSize.w, note, ocr, saving]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter" && masks.length > 0) {
        e.preventDefault();
        void handleSave();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleSave, masks.length]);

  function scaleFromEvent(e: React.MouseEvent): ImageRect {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0, w: 0, h: 0 };
    const point = pointerToImageCoords(e.clientX, e.clientY, img);
    return point ?? { x: 0, y: 0, w: 0, h: 0 };
  }

  function adjustZoom(delta: number) {
    setZoom((value) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((value + delta) * 100) / 100)),
    );
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (mode !== "mask") return;
    const pt = scaleFromEvent(e);
    setDragStart(pt);
    setDraftRect({ type: "rect", x: pt.x, y: pt.y, w: 0, h: 0, color: maskColorId });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragStart || mode !== "mask") return;
    const pt = scaleFromEvent(e);
    setDraftRect({
      type: "rect",
      x: Math.min(dragStart.x, pt.x),
      y: Math.min(dragStart.y, pt.y),
      w: Math.abs(pt.x - dragStart.x),
      h: Math.abs(pt.y - dragStart.y),
      color: maskColorId,
    });
  }

  function handleMouseUp() {
    if (!draftRect || draftRect.w < 8 || draftRect.h < 8 || mode !== "mask") {
      setDragStart(null);
      setDraftRect(null);
      return;
    }

    if (naturalSize.w === 0 || naturalSize.h === 0) {
      setDragStart(null);
      setDraftRect(null);
      return;
    }

    const mask = clampRect(
      draftRect.x,
      draftRect.y,
      draftRect.w,
      draftRect.h,
      naturalSize.w,
      naturalSize.h,
      maskColorId,
    );
    setMasks((prev) => [...prev, mask]);
    setDragStart(null);
    setDraftRect(null);
  }

  function removeMask(index: number) {
    setMasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function runOcr() {
    if (!IMAGE_EDITOR_OCR_ENABLED) return;
    setOcrLoading(true);
    try {
      const result = await api.runOcr(imagePath);
      setOcr(result);
      setMode("ocr");
    } finally {
      setOcrLoading(false);
    }
  }

  function toggleOcrWord(word: OcrWord) {
    setMasks((prev) => {
      const existing = prev.find(
        (mask): mask is Extract<ImageMask, { type: "ocr" }> => mask.type === "ocr",
      );
      const ids = new Set(existing?.wordIds ?? []);
      if (ids.has(word.id)) ids.delete(word.id);
      else ids.add(word.id);

      const others = prev.filter((mask) => mask.type !== "ocr");
      if (ids.size === 0) return others;
      return [
        ...others,
        {
          type: "ocr",
          wordIds: [...ids].sort((a, b) => a - b),
          color: existing?.color ?? maskColorId,
        },
      ];
    });
  }

  const selectedOcrIds = new Set(
    masks
      .filter((mask): mask is Extract<ImageMask, { type: "ocr" }> => mask.type === "ocr")
      .flatMap((mask) => mask.wordIds),
  );

  const canSave = masks.length > 0;

  return (
    <div className="editor-shell image-editor">
      <header className="image-editor-header" data-tauri-drag-region>
        <div className="image-editor-header-row image-editor-title-row">
          <h1 className="image-editor-title">
            {cardId ? copy.editor.editImage : copy.editor.createImage}
          </h1>

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

          <label className="field-inline note-field image-editor-note" data-tauri-drag-region="false">
            <span>{copy.editor.note}</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={copy.editor.notePlaceholder}
            />
          </label>
        </div>

        <div className="image-editor-header-row image-editor-tools-row" data-tauri-drag-region="false">
          <div className="image-zoom-controls">
            <Button
              type="button"
              aria-label={copy.editor.zoomOut}
              disabled={zoom <= MIN_ZOOM}
              onClick={() => adjustZoom(-ZOOM_STEP)}
            >
              −
            </Button>
            <span>{Math.round(zoom * 100)}%</span>
            <Button
              type="button"
              aria-label={copy.editor.zoomIn}
              disabled={zoom >= MAX_ZOOM}
              onClick={() => adjustZoom(ZOOM_STEP)}
            >
              +
            </Button>
          </div>

          <div className="image-editor-tools-group">
            <div className="mask-color-picker">
              <span className="mask-color-label">カラー</span>
              <div className="mask-color-swatches" role="group" aria-label={copy.editor.maskColor}>
                {MASK_COLORS.map((color) => (
                  <Button
                    key={color.id}
                    type="button"
                    className={`mask-color-swatch ${maskColorId === color.id ? "active" : ""}`}
                    style={{ background: color.fill }}
                    aria-label={color.id}
                    aria-pressed={maskColorId === color.id}
                    onClick={() => setMaskColorId(color.id)}
                  />
                ))}
              </div>
            </div>

            {IMAGE_EDITOR_OCR_ENABLED ? (
              <div className="step-switch image-editor-mode-switch">
                <Button
                  type="button"
                  className={mode === "mask" ? "active" : ""}
                  onClick={() => setMode("mask")}
                >
                  {copy.editor.maskMode}
                </Button>
                <Button
                  type="button"
                  className={mode === "ocr" ? "active" : ""}
                  disabled={ocrLoading}
                  onClick={() => {
                    if (ocr) {
                      setMode("ocr");
                    } else {
                      void runOcr();
                    }
                  }}
                >
                  {ocrLoading ? "OCR..." : copy.editor.ocrMode}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="editor-workspace image-workspace">
        <div className="image-editor-stack">
          <div className="image-viewport">
            <div
              className="image-stage"
              style={{ transform: `scale(${zoom})` }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className="image-stage-frame">
                {imageSrc && (
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="capture"
                    draggable={false}
                  />
                )}

                <div className="image-overlay-layer" aria-hidden={!imageSrc}>
                  {masks.map((mask, index) => {
                    if (mask.type !== "rect") return null;
                    return (
                      <div
                        key={`mask-${index}-${mask.x}-${mask.y}`}
                        className="mask-block editable"
                        style={{
                          ...rectOverlayStyle(mask, layout),
                          ...maskPaintStyle(mask.color),
                        }}
                        onClick={() => removeMask(index)}
                        title="クリックで削除"
                      />
                    );
                  })}

                  {draftRect && layout.naturalW > 0 && mode === "mask" && (
                    <div
                      className="mask-overlay draft mask"
                      style={{
                        ...rectOverlayStyle(draftRect, layout),
                        ...maskPaintStyle(draftRect.color),
                      }}
                    />
                  )}

                  {IMAGE_EDITOR_OCR_ENABLED &&
                    mode === "ocr" &&
                    ocr?.words.map((word) => {
                      const ocrMask = masks.find(
                        (mask): mask is Extract<ImageMask, { type: "ocr" }> =>
                          mask.type === "ocr",
                      );
                      const isSelected = selectedOcrIds.has(word.id);
                      return (
                        <Button
                          key={word.id}
                          type="button"
                          className={`ocr-word ${isSelected ? "selected" : ""}`}
                          style={{
                            ...rectOverlayStyle(
                              { type: "rect", x: word.x, y: word.y, w: word.w, h: word.h },
                              layout,
                            ),
                            ...(isSelected ? maskPaintStyle(ocrMask?.color ?? maskColorId) : {}),
                          }}
                          onClick={() => toggleOcrWord(word)}
                        >
                          {word.text}
                        </Button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="editor-footer">
        <span className="editor-hint">Enter 保存 · Esc キャンセル</span>
        <div className="editor-footer-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onClose()}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={!canSave || saving}
            onClick={() => void handleSave()}
          >
            {saving ? "保存中..." : cardId ? `更新 ${masks.length} 件` : `保存 ${masks.length} 件`}
          </Button>
        </div>
      </footer>
    </div>
  );
}
