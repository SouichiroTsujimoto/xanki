import { useEffect, useState } from "react";
import { useAppApi } from "../../context/app-api-context";
import { ImageWithMaskOverlays } from "./mask/image-with-mask-overlays";
import {
  renderTextWithMasks,
  resolveImageOverlayRects,
} from "./study/shared";
import type { Card, OcrResult } from "../../types";

export function LibraryCardPreview({ card }: { card: Card }) {
  const api = useAppApi();
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadImage() {
      const imageKey = card.imagePath ?? card.imageHash;
      if (card.kind !== "image" || !imageKey) {
        setImageSrc(null);
        return;
      }
      const url = await api.resolveImageUrl(imageKey);
      if (active) {
        setImageSrc(url);
      }
    }

    void loadImage();
    return () => {
      active = false;
    };
  }, [api, card.imageHash, card.imagePath, card.kind]);

  if (card.kind === "text" && card.content) {
    const masks = api.parseTextMasks(card.masks);
    return (
      <div className="flashcard-preview flashcard-preview-text">
        {renderTextWithMasks(card.content, masks, { hide: true })}
      </div>
    );
  }

  if (card.kind === "qa" && card.content) {
    const masks = api.parseTextMasks(card.masks);
    return (
      <div className="flashcard-preview flashcard-preview-text qa-preview">
        {renderTextWithMasks(card.content, masks, { hide: true })}
        {card.answer && <p className="qa-preview-note">解答あり</p>}
      </div>
    );
  }

  if (card.kind === "image" && imageSrc) {
    const masks = api.parseImageMasks(card.masks);
    const ocrData: OcrResult | null = card.ocrData
      ? (JSON.parse(card.ocrData) as OcrResult)
      : null;
    const overlayRects = resolveImageOverlayRects(masks, ocrData);

    return (
      <div className="flashcard-preview flashcard-preview-image">
        <ImageWithMaskOverlays
          src={imageSrc}
          rects={overlayRects}
          rootClassName="image-overlay-root image-card library-image-frame"
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
