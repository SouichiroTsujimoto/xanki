import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { api, parseImageMasks, parseTextMasks } from "../lib/tauri/api";
import { ImageWithMaskOverlays } from "./ImageWithMaskOverlays";
import {
  renderTextWithMasks,
  resolveImageOverlayRects,
} from "./study/shared";
import type { Card, OcrResult } from "../types";

export function LibraryCardPreview({ card }: { card: Card }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadImage() {
      if (card.kind !== "image" || !card.imagePath) {
        setImageSrc(null);
        return;
      }
      const url = await api.resolveImageUrl(card.imagePath);
      if (active) {
        setImageSrc(convertFileSrc(url));
      }
    }

    void loadImage();
    return () => {
      active = false;
    };
  }, [card.kind, card.imagePath]);

  if (card.kind === "text" && card.content) {
    const masks = parseTextMasks(card.masks);
    return (
      <div className="flashcard-preview flashcard-preview-text">
        {renderTextWithMasks(card.content, masks, { hide: true })}
      </div>
    );
  }

  if (card.kind === "qa" && card.content) {
    const masks = parseTextMasks(card.masks);
    return (
      <div className="flashcard-preview flashcard-preview-text qa-preview">
        {renderTextWithMasks(card.content, masks, { hide: true })}
        {card.answer && <p className="qa-preview-note">解答あり</p>}
      </div>
    );
  }

  if (card.kind === "image" && imageSrc) {
    const masks = parseImageMasks(card.masks);
    const ocrData: OcrResult | null = card.ocrData
      ? (JSON.parse(card.ocrData) as OcrResult)
      : null;
    const overlayRects = resolveImageOverlayRects(masks, ocrData);

    return (
      <div className="flashcard-preview flashcard-preview-image">
        <ImageWithMaskOverlays
          src={imageSrc}
          rects={overlayRects}
          rootClassName="image-card library-image-frame"
        />
      </div>
    );
  }

  return (
    <p className="flashcard-preview">
      {card.ocrText?.slice(0, 140) || "画像カード"}
    </p>
  );
}
