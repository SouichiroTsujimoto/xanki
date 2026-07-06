import { useCallback, useEffect, useState, type ReactNode } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { api, parseImageMasks, parseTextMasks } from "../../lib/tauri/api";
import { ImageWithMaskOverlays } from "../ImageWithMaskOverlays";
import type { ImageMask, OcrResult, ReviewCard } from "../../types";

export type TextMaskRenderOptions = {
  hide?: boolean;
  revealed?: boolean;
  peeked?: ReadonlySet<number>;
  interactive?: boolean;
  onTogglePeek?: (index: number) => void;
};

function maskClassName(
  index: number,
  options: TextMaskRenderOptions,
): string {
  const { revealed = false, peeked, interactive = false } = options;
  if (revealed) return "masked mask-revealed";
  if (peeked?.has(index)) return "masked mask-peeked";
  return interactive ? "masked mask-interactive" : "masked";
}

export function renderTextWithMasks(
  content: string,
  masks: ReturnType<typeof parseTextMasks>,
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

  sorted.forEach(({ mask, index }) => {
    if (cursor < mask.start) {
      parts.push(<span key={`t-${index}`}>{content.slice(cursor, mask.start)}</span>);
    }

    parts.push(
      <span
        key={`m-${index}`}
        className={maskClassName(index, options)}
        onClick={
          interactive && onTogglePeek && !revealed
            ? () => onTogglePeek(index)
            : undefined
        }
        role={interactive && !revealed ? "button" : undefined}
        tabIndex={interactive && !revealed ? 0 : undefined}
        onKeyDown={
          interactive && onTogglePeek && !revealed
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onTogglePeek(index);
                }
              }
            : undefined
        }
      >
        {content.slice(mask.start, mask.end)}
      </span>,
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
): Array<{ x: number; y: number; w: number; h: number }> {
  const rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (const mask of masks) {
    if (mask.type === "rect") {
      rects.push(mask);
      continue;
    }
    if (mask.type === "ocr" && ocrData) {
      for (const id of mask.wordIds) {
        const word = ocrData.words.find((w) => w.id === id);
        if (word) rects.push(word);
      }
    }
  }
  return rects;
}

interface CardDisplayProps {
  card: ReviewCard;
  revealed: boolean;
  interactive?: boolean;
}

export function StudyCardDisplay({
  card,
  revealed,
  interactive = false,
}: CardDisplayProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [peekedMasks, setPeekedMasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function loadImage() {
      if (card.card.imagePath) {
        setImageSrc(convertFileSrc(await api.resolveImageUrl(card.card.imagePath)));
      } else {
        setImageSrc(null);
      }
    }
    void loadImage();
  }, [card]);

  useEffect(() => {
    setPeekedMasks(new Set());
  }, [card.card.id]);

  const togglePeek = useCallback(
    (index: number) => {
      if (!interactive || revealed) return;
      setPeekedMasks((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    [interactive, revealed],
  );

  const textMasks =
    card.card.kind === "text" ? parseTextMasks(card.card.masks) : [];
  const imageMasks =
    card.card.kind === "image" ? parseImageMasks(card.card.masks) : [];
  const ocrData: OcrResult | null = card.card.ocrData
    ? (JSON.parse(card.card.ocrData) as OcrResult)
    : null;
  const overlayRects = resolveImageOverlayRects(imageMasks, ocrData);

  return (
    <div className={`review-card ${revealed ? "revealed" : "hidden"}`}>
      {card.card.kind === "text" && card.card.content && (
        <div className="text-card">
          {renderTextWithMasks(card.card.content, textMasks, {
            hide: !revealed,
            revealed,
            peeked: peekedMasks,
            interactive,
            onTogglePeek: togglePeek,
          })}
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

export function StudyProgress({
  index,
  total,
  progress,
}: {
  index: number;
  total: number;
  progress: number;
}) {
  return (
    <>
      <div className="review-progress">
        <div className="review-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="review-meta">
        <span>
          {index + 1} / {total}
        </span>
      </div>
    </>
  );
}

export function StudyEmpty({ title, copy, onReload }: { title: string; copy: string; onReload?: () => void }) {
  return (
    <div className="review-stage empty">
      <div className="review-complete">
        <p className="eyebrow">Study</p>
        <h2>{title}</h2>
        <p>{copy}</p>
        {onReload && (
          <button type="button" className="accent-button" onClick={onReload}>
            再読み込み
          </button>
        )}
      </div>
    </div>
  );
}

export function useStudyQueue(
  deckId: string | null | undefined,
  filter: "due" | "all" | "starred",
  shuffle: boolean,
) {
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [index, setIndex] = useState(0);

  const loadQueue = useCallback(async () => {
    const cards =
      filter === "due"
        ? await api.getDueCards(deckId ?? undefined)
        : await api.getStudyCards(filter, deckId ?? undefined);
    const ordered = shuffle
      ? [...cards].sort(() => Math.random() - 0.5)
      : cards;
    setQueue(ordered);
    setIndex(0);
  }, [deckId, filter, shuffle]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const current = queue[index];
  const progress =
    queue.length > 0 ? ((index + 1) / queue.length) * 100 : 0;

  function next() {
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
    }
  }

  return { queue, index, current, progress, loadQueue, next, setIndex };
}
