import type { ReactNode } from "react";
import type { ImageMask, OcrResult, TextMask } from "../../../types";
import { MaskedTextSpan, type MaskVisualState } from "./masked-text-span";
import type { ColoredImageRect } from "../mask/image-with-mask-overlays";

export type TextMaskRenderOptions = {
  hide?: boolean;
  revealed?: boolean;
  peeked?: ReadonlySet<number>;
  interactive?: boolean;
  onTogglePeek?: (index: number) => void;
};

function maskVisualState(
  index: number,
  options: TextMaskRenderOptions,
): MaskVisualState {
  const { revealed = false, peeked } = options;
  if (revealed) return "revealed";
  if (peeked?.has(index)) return "peeked";
  return "concealed";
}

export function renderTextWithMasks(
  content: string,
  masks: TextMask[],
  hideOrOptions: boolean | TextMaskRenderOptions = false,
) {
  const options: TextMaskRenderOptions =
    typeof hideOrOptions === "boolean" ? { hide: hideOrOptions } : hideOrOptions;
  const { hide = false, revealed = false, peeked, interactive = false, onTogglePeek } =
    options;

  if (masks.length === 0) {
    return <pre>{content}</pre>;
  }

  const shouldRenderMasks =
    hide || revealed || (peeked?.size ?? 0) > 0;
  if (!shouldRenderMasks) {
    return <pre>{content}</pre>;
  }

  const sorted = [...masks]
    .map((mask, index) => ({ mask, index }))
    .sort((a, b) => a.mask.start - b.mask.start);

  const parts: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach(({ mask, index }, sortedIndex) => {
    if (cursor < mask.start) {
      parts.push(<span key={`t-${index}`}>{content.slice(cursor, mask.start)}</span>);
    }

    const visualState = maskVisualState(index, options);
    parts.push(
      <MaskedTextSpan
        key={`m-${index}`}
        text={content.slice(mask.start, mask.end)}
        state={visualState}
        interactive={interactive && !revealed}
        staggerDelay={revealed ? sortedIndex * 0.03 : 0}
        onTogglePeek={
          interactive && onTogglePeek && !revealed
            ? () => onTogglePeek(index)
            : undefined
        }
      />,
    );
    cursor = mask.end;
  });

  if (cursor < content.length) {
    parts.push(<span key="tail">{content.slice(cursor)}</span>);
  }

  return <pre>{parts}</pre>;
}

export function resolveImageOverlayRects(
  masks: ImageMask[],
  ocrData: OcrResult | null,
): ColoredImageRect[] {
  const rects: ColoredImageRect[] = [];
  for (const mask of masks) {
    if (mask.type === "rect") {
      rects.push(mask);
      continue;
    }
    if (mask.type === "ocr" && ocrData) {
      for (const id of mask.wordIds) {
        const word = ocrData.words.find((w) => w.id === id);
        if (word) {
          rects.push({
            x: word.x,
            y: word.y,
            w: word.w,
            h: word.h,
            color: mask.color,
          });
        }
      }
    }
  }
  return rects;
}

export function isMaskFlipTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(".masked, .mask-block, .mask-interactive, .mask-mark, .ocr-word"),
  );
}
