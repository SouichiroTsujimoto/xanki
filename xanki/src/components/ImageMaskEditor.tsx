import { useEffect, useRef, useState, type CSSProperties } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "../lib/tauri/api";
import {
  maskOverlayStyle,
  pointerToImageCoords,
  useImageOverlayLayout,
  type ImageRect,
} from "../lib/imageOverlay";
import type { Deck, ImageMask, ImageRegion, OcrResult, OcrWord, RectMask } from "../types";

interface Props {
  imagePath: string;
  cardId?: string;
  initialDeckId?: string;
  initialMasks?: ImageMask[];
  initialNote?: string;
  initialOcr?: OcrResult | null;
}

interface CardDraft {
  id: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  masks: ImageMask[];
}

type EditorMode = "crop" | "mask" | "ocr";

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
): RectMask {
  const left = Math.max(0, Math.min(x, maxW));
  const top = Math.max(0, Math.min(y, maxH));
  const width = Math.max(0, Math.min(w, maxW - left));
  const height = Math.max(0, Math.min(h, maxH - top));
  return { type: "rect", x: left, y: top, w: width, h: height };
}

function rectInsideCrop(
  rect: RectMask,
  crop: CardDraft,
): boolean {
  return (
    rect.x >= crop.cropX &&
    rect.y >= crop.cropY &&
    rect.x + rect.w <= crop.cropX + crop.cropW &&
    rect.y + rect.h <= crop.cropY + crop.cropH
  );
}

function wordInsideCrop(word: OcrWord, crop: CardDraft): boolean {
  const cx = word.x + word.w / 2;
  const cy = word.y + word.h / 2;
  return (
    cx >= crop.cropX &&
    cy >= crop.cropY &&
    cx <= crop.cropX + crop.cropW &&
    cy <= crop.cropY + crop.cropH
  );
}

export function ImageMaskEditor({
  imagePath,
  cardId,
  initialDeckId,
  initialMasks = [],
  initialNote = "",
  initialOcr = null,
}: Props) {
  const [imageSrc, setImageSrc] = useState("");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState("");
  const [cards, setCards] = useState<CardDraft[]>([]);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [mode, setMode] = useState<EditorMode>("crop");
  const [ocr, setOcr] = useState<OcrResult | null>(initialOcr);
  const [note, setNote] = useState(initialNote);
  const [editInitialized, setEditInitialized] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<RectMask | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const layout = useImageOverlayLayout(imgRef, imageSrc);
  const naturalSize = {
    w: layout.naturalW,
    h: layout.naturalH,
  };

  const activeCard =
    cards.find((card) => card.id === activeCardId) ?? cards[cards.length - 1] ?? null;

  useEffect(() => {
    async function init() {
      const [url, deckList, lastDeck] = await Promise.all([
        api.resolveImageUrl(imagePath),
        api.listDecks(),
        api.getLastUsedDeckId(),
      ]);
      setImageSrc(convertFileSrc(url));
      setDecks(deckList);
      setDeckId(initialDeckId ?? lastDeck ?? deckList[0]?.id ?? "");
    }
    void init();
  }, [imagePath, initialDeckId]);

  useEffect(() => {
    if (!cardId || editInitialized || naturalSize.w === 0) return;
    setCards([
      {
        id: 1,
        cropX: 0,
        cropY: 0,
        cropW: naturalSize.w,
        cropH: naturalSize.h,
        masks: initialMasks,
      },
    ]);
    setActiveCardId(1);
    setMode("mask");
    setEditInitialized(true);
  }, [cardId, editInitialized, initialMasks, naturalSize]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        void getCurrentWindow().close();
      }
      if (e.key === "Enter" && cards.some((card) => card.masks.length > 0)) {
        e.preventDefault();
        void handleSave();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

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

  function updateCard(id: number, updater: (card: CardDraft) => CardDraft) {
    setCards((prev) => prev.map((card) => (card.id === id ? updater(card) : card)));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (mode === "ocr") return;
    const pt = scaleFromEvent(e);
    setDragStart(pt);
    setDraftRect({ type: "rect", x: pt.x, y: pt.y, w: 0, h: 0 });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragStart || mode === "ocr") return;
    const pt = scaleFromEvent(e);
    setDraftRect({
      type: "rect",
      x: Math.min(dragStart.x, pt.x),
      y: Math.min(dragStart.y, pt.y),
      w: Math.abs(pt.x - dragStart.x),
      h: Math.abs(pt.y - dragStart.y),
    });
  }

  function handleMouseUp() {
    if (!draftRect || draftRect.w < 8 || draftRect.h < 8) {
      setDragStart(null);
      setDraftRect(null);
      return;
    }

    if (mode === "crop") {
      const nextId = Math.max(0, ...cards.map((card) => card.id)) + 1;
      const crop = clampRect(
        draftRect.x,
        draftRect.y,
        draftRect.w,
        draftRect.h,
        naturalSize.w,
        naturalSize.h,
      );
      const newCard: CardDraft = {
        id: nextId,
        cropX: crop.x,
        cropY: crop.y,
        cropW: crop.w,
        cropH: crop.h,
        masks: [],
      };
      setCards((prev) => [...prev, newCard]);
      setActiveCardId(nextId);
      setMode("mask");
    } else if (mode === "mask" && activeCard) {
      const mask = clampRect(
        draftRect.x,
        draftRect.y,
        draftRect.w,
        draftRect.h,
        naturalSize.w,
        naturalSize.h,
      );
      if (rectInsideCrop(mask, activeCard)) {
        updateCard(activeCard.id, (card) => ({
          ...card,
          masks: [...card.masks, mask],
        }));
      }
    }

    setDragStart(null);
    setDraftRect(null);
  }

  function removeMask(cardId: number, index: number) {
    updateCard(cardId, (card) => ({
      ...card,
      masks: card.masks.filter((_, i) => i !== index),
    }));
  }

  function removeCard(cardId: number) {
    setCards((prev) => prev.filter((card) => card.id !== cardId));
    if (activeCardId === cardId) {
      setActiveCardId(null);
      setMode("crop");
    }
  }

  async function runOcr() {
    if (!activeCard) return;
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
    if (!activeCard || !wordInsideCrop(word, activeCard)) return;

    updateCard(activeCard.id, (card) => {
      const existing = card.masks.find(
        (mask): mask is Extract<ImageMask, { type: "ocr" }> => mask.type === "ocr",
      );
      const ids = new Set(existing?.wordIds ?? []);
      if (ids.has(word.id)) ids.delete(word.id);
      else ids.add(word.id);

      const others = card.masks.filter((mask) => mask.type !== "ocr");
      if (ids.size === 0) return { ...card, masks: others };
      return {
        ...card,
        masks: [...others, { type: "ocr", wordIds: [...ids].sort((a, b) => a - b) }],
      };
    });
  }

  async function handleSave() {
    if (!deckId || saving) return;

    if (cardId) {
      if (!activeCard || activeCard.masks.length === 0) return;
      setSaving(true);
      try {
        await api.updateImageCard({
          cardId,
          deckId,
          masks: activeCard.masks,
          note: note || undefined,
          ocrText: ocr?.fullText,
          ocrData: ocr ? JSON.stringify(ocr) : undefined,
        });
        await getCurrentWindow().close();
      } catch (error) {
        console.error("save failed", error);
      } finally {
        setSaving(false);
      }
      return;
    }

    const payloadRegions: ImageRegion[] = cards
      .filter((card) => card.masks.length > 0 && card.cropW > 0 && card.cropH > 0)
      .map((card) => ({
        cropX: card.cropX,
        cropY: card.cropY,
        cropW: card.cropW,
        cropH: card.cropH,
        masks: card.masks,
      }));

    if (payloadRegions.length === 0) return;

    setSaving(true);
    try {
      await api.saveImageCards({
        deckId,
        imagePath,
        ocrText: ocr?.fullText,
        ocrData: ocr ? JSON.stringify(ocr) : undefined,
        regions: payloadRegions,
      });
      await getCurrentWindow().close();
    } catch (error) {
      console.error("save failed", error);
    } finally {
      setSaving(false);
    }
  }

  const selectedOcrIds = new Set(
    activeCard?.masks
      .filter((mask): mask is Extract<ImageMask, { type: "ocr" }> => mask.type === "ocr")
      .flatMap((mask) => mask.wordIds) ?? [],
  );

  const saveCount = cardId
    ? activeCard && activeCard.masks.length > 0
      ? 1
      : 0
    : cards.filter((card) => card.masks.length > 0).length;

  const dimRect: RectMask | null =
    mode === "crop" && draftRect && draftRect.w >= 8 && draftRect.h >= 8
      ? draftRect
      : mode === "mask" && activeCard
        ? {
            type: "rect",
            x: activeCard.cropX,
            y: activeCard.cropY,
            w: activeCard.cropW,
            h: activeCard.cropH,
          }
        : null;

  return (
    <div className="editor-shell image-editor">
      <header className="editor-hero">
        <div>
          <p className="eyebrow">{cardId ? "Edit Image" : "暗記カード作成"}</p>
          <h1>{cardId ? "スクショ編集 ✦" : "暗記カード作成 ✦"}</h1>
        </div>
        <div className="editor-meta">
          <span className="meta-chip">{saveCount} cards</span>
          <span className="editor-hint">Enter 保存 · Esc キャンセル</span>
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

        {!cardId && (
          <div className="step-switch">
          <button
            type="button"
            className={mode === "crop" ? "active" : ""}
            onClick={() => setMode("crop")}
          >
            1 · 範囲
          </button>
          <button
            type="button"
            className={mode === "mask" ? "active" : ""}
            disabled={!activeCard}
            onClick={() => setMode("mask")}
          >
            2 · マスク
          </button>
          <button
            type="button"
            className={mode === "ocr" ? "active" : ""}
            disabled={!activeCard || ocrLoading}
            onClick={() => void runOcr()}
          >
            {ocrLoading ? "OCR..." : "文字"}
          </button>
        </div>
        )}

        <label className="field-inline note-field">
          <span>メモ</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="任意"
          />
        </label>
      </div>

      {!cardId && cards.length > 0 && (
        <div className="card-tabs">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`card-tab ${card.id === activeCardId ? "active" : ""}`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveCardId(card.id);
                  setMode("mask");
                }}
              >
                カード {card.id}
                <span>{card.masks.length}</span>
              </button>
              <button
                type="button"
                className="tab-close"
                onClick={() => removeCard(card.id)}
                aria-label="カード範囲を削除"
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="text-button" onClick={() => setMode("crop")}>
            + 範囲
          </button>
        </div>
      )}

      <div className="editor-workspace image-workspace">
        <div className="image-editor-stack">
          <div className="image-zoom-controls">
            <button
              type="button"
              aria-label="縮小"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => adjustZoom(-ZOOM_STEP)}
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              aria-label="拡大"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => adjustZoom(ZOOM_STEP)}
            >
              +
            </button>
          </div>

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
                  {dimRect && (
                    <div
                      className="crop-dim-hole"
                      style={rectOverlayStyle(dimRect, layout)}
                    />
                  )}

                  {cards.map((card) => (
                    <div
                      key={`crop-${card.id}`}
                      className={`crop-overlay ${card.id === activeCardId ? "active" : ""}`}
                      style={rectOverlayStyle(
                        {
                          type: "rect",
                          x: card.cropX,
                          y: card.cropY,
                          w: card.cropW,
                          h: card.cropH,
                        },
                        layout,
                      )}
                    />
                  ))}

                  {activeCard?.masks
                    .filter((mask): mask is RectMask => mask.type === "rect")
                    .map((mask, index) => (
                      <div
                        key={`mask-${index}`}
                        className="mask-block editable"
                        style={rectOverlayStyle(mask, layout)}
                        onClick={() => removeMask(activeCard.id, index)}
                        title="クリックで削除"
                      />
                    ))}

                  {draftRect && layout.naturalW > 0 && (
                    <div
                      className={`mask-overlay draft ${mode === "crop" ? "crop" : "mask"}`}
                      style={rectOverlayStyle(draftRect, layout)}
                    />
                  )}

                  {mode === "ocr" &&
                    activeCard &&
                    ocr?.words
                      .filter((word) => wordInsideCrop(word, activeCard))
                      .map((word) => (
                        <button
                          key={word.id}
                          type="button"
                          className={`ocr-word ${selectedOcrIds.has(word.id) ? "selected" : ""}`}
                          style={rectOverlayStyle(
                            { type: "rect", x: word.x, y: word.y, w: word.w, h: word.h },
                            layout,
                          )}
                          onClick={() => toggleOcrWord(word)}
                        >
                          {word.text}
                        </button>
                      ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="editor-footer">
        <button type="button" className="ghost-button" onClick={() => void getCurrentWindow().close()}>
          キャンセル
        </button>
        <button
          type="button"
          className="accent-button"
          disabled={saveCount === 0 || saving}
          onClick={() => void handleSave()}
        >
          {saving ? "保存中..." : cardId ? "更新" : `保存 ${saveCount} カード`}
        </button>
      </footer>
    </div>
  );
}
