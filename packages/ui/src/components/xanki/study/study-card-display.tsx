import { useCallback, useEffect, useState } from "react";
import { copy as uiCopy } from "../../../copy";
import { useAppApi } from "../../../context/app-api-context";
import { useReviewCardTextOverflow } from "../../../hooks/use-review-card-text-overflow";
import { ImageWithMaskOverlays } from "../mask/image-with-mask-overlays";
import type { OcrResult, ReviewCard } from "../../../types";
import { renderTextWithMasks, resolveImageOverlayRects } from "./study-text-masks";
interface CardDisplayProps {
  card: ReviewCard;
  revealed: boolean;
  interactive?: boolean;
  peekedMasks?: Set<number>;
  onTogglePeek?: (index: number) => void;
}

export function StudyCardDisplay({
  card,
  revealed,
  interactive = false,
  peekedMasks: controlledPeekedMasks,
  onTogglePeek: controlledTogglePeek,
}: CardDisplayProps) {
  const api = useAppApi();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [internalPeekedMasks, setInternalPeekedMasks] = useState<Set<number>>(
    new Set(),
  );
  const isPeekControlled =
    controlledPeekedMasks !== undefined && controlledTogglePeek !== undefined;
  const peekedMasks = isPeekControlled ? controlledPeekedMasks : internalPeekedMasks;

  useEffect(() => {
    async function loadImage() {
      const imageKey = card.card.imagePath ?? card.card.imageHash;
      if (card.card.kind !== "image" || !imageKey) {
        setImageSrc(null);
        return;
      }
      setImageSrc(await api.resolveImageUrl(imageKey));
    }
    void loadImage();
  }, [card, api]);

  useEffect(() => {
    if (!isPeekControlled) {
      setInternalPeekedMasks(new Set());
    }
  }, [card.card.id, isPeekControlled]);

  const togglePeek = useCallback(
    (index: number) => {
      if (!interactive || revealed) return;
      if (isPeekControlled) {
        controlledTogglePeek(index);
        return;
      }
      setInternalPeekedMasks((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    [controlledTogglePeek, interactive, isPeekControlled, revealed],
  );

  const textMasks =
    card.card.kind === "text" ? api.parseTextMasks(card.card.masks) : [];
  const qaMasks =
    card.card.kind === "qa" ? api.parseTextMasks(card.card.masks) : [];
  const imageMasks =
    card.card.kind === "image" ? api.parseImageMasks(card.card.masks) : [];
  const ocrData: OcrResult | null = card.card.ocrData
    ? (JSON.parse(card.card.ocrData) as OcrResult)
    : null;
  const overlayRects = resolveImageOverlayRects(imageMasks, ocrData);
  const isTextLike = card.card.kind === "text" || card.card.kind === "qa";
  const textOverflowKey = `${card.card.id}:${revealed}:${card.card.content ?? ""}:${card.card.answer ?? ""}`;
  const { ref: cardRef, scrollable: textScrollable } = useReviewCardTextOverflow(
    isTextLike,
    textOverflowKey,
  );

  return (
    <div
      ref={cardRef}
      className={`review-card ${revealed ? "revealed" : "concealed"}`}
      {...(textScrollable ? { "data-text-scrollable": "" } : {})}
    >
      {card.card.kind === "text" && card.card.content && (
        <div className="study-text-body">
          {renderTextWithMasks(card.card.content, textMasks, {
            hide: !revealed,
            revealed,
            peeked: peekedMasks,
            interactive,
            onTogglePeek: togglePeek,
          })}
        </div>
      )}

      {card.card.kind === "qa" && card.card.content && (
        <div className="study-text-body qa-card">
          {renderTextWithMasks(card.card.content, qaMasks, {
            hide: !revealed,
            revealed,
          })}
          {revealed && card.card.answer && (
            <div className="qa-answer-block">
              <p className="eyebrow">{uiCopy.common.answer}</p>
              <pre>{card.card.answer}</pre>
            </div>
          )}
        </div>
      )}

      {card.card.kind === "image" && imageSrc && (
        <ImageWithMaskOverlays
          src={imageSrc}
          alt="study"
          rects={overlayRects}
          rootClassName="image-card"
          interactive={interactive && !revealed}
          onMaskClick={togglePeek}
          getMaskClassName={(index) => {
            const isPeeked = revealed || peekedMasks.has(index);
            return [
              interactive && !revealed ? "mask-interactive" : "",
              isPeeked ? "mask-peeked" : "",
              revealed ? "mask-revealed" : "",
            ]
              .filter(Boolean)
              .join(" ");
          }}
        />
      )}
    </div>
  );
}
