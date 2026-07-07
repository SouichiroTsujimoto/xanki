import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { copy as uiCopy } from "../../../copy";
import { useAppApi } from "../../../context/app-api-context";
import { springSnappy, transitionForReduced } from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";
import { ImageWithMaskOverlays, type ColoredImageRect } from "../mask/image-with-mask-overlays";
import type { ImageMask, OcrResult, ReviewCard, TextMask } from "../../../types";
import { MaskedTextSpan, type MaskVisualState } from "./masked-text-span";

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

const FLIP_DRAG_THRESHOLD_PX = 6;
const FLIP_MIN_HEIGHT_PX = 240;
const FLIP_MAX_HEIGHT_PX = 520;
const FLIP_MAX_HEIGHT_VH = 0.58;

function clampFlipHeight(natural: number): number {
  const max = Math.min(window.innerHeight * FLIP_MAX_HEIGHT_VH, FLIP_MAX_HEIGHT_PX);
  return Math.min(max, Math.max(FLIP_MIN_HEIGHT_PX, natural));
}

function activeFaceCardSelector(revealed: boolean): string {
  return revealed
    ? ".study-flip-back .review-card"
    : ".study-flip-front .review-card";
}

function measureReviewCard(card: HTMLElement): number {
  const previous = {
    height: card.style.height,
    maxHeight: card.style.maxHeight,
    overflow: card.style.overflow,
  };

  card.style.height = "auto";
  card.style.maxHeight = "none";
  card.style.overflow = "visible";

  const measured = card.offsetHeight;
  const width = card.clientWidth || card.offsetWidth;
  const minAspectHeight =
    width > 0 ? Math.round((width * 3) / 4) : FLIP_MIN_HEIGHT_PX;

  card.style.height = previous.height;
  card.style.maxHeight = previous.maxHeight;
  card.style.overflow = previous.overflow;

  return clampFlipHeight(Math.max(measured, minAspectHeight));
}

function hasActiveTextSelection(): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return false;
  return selection.toString().trim().length > 0;
}

function isDragPointerGesture(
  start: { x: number; y: number } | null,
  event: MouseEvent,
): boolean {
  if (!start) return false;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  return Math.hypot(dx, dy) > FLIP_DRAG_THRESHOLD_PX;
}

interface FlipSceneProps {
  revealed: boolean;
  onToggle: () => void;
  clickable?: boolean;
  compact?: boolean;
  front: ReactNode;
  back: ReactNode;
}

export function FlipScene({
  revealed,
  onToggle,
  clickable = false,
  compact = false,
  front,
  back,
}: FlipSceneProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const revealedRef = useRef(revealed);
  const [isAnimating, setIsAnimating] = useState(false);
  const [flipHeight, setFlipHeight] = useState<number | null>(null);
  const [heightLock, setHeightLock] = useState<number | null>(null);

  const syncFlipHeight = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const card = inner.querySelector(activeFaceCardSelector(revealed));
    if (!(card instanceof HTMLElement)) return;
    setFlipHeight(measureReviewCard(card));
  }, [revealed]);

  const lockFlipHeightForAnimation = useCallback((fromRevealed: boolean) => {
    const inner = innerRef.current;
    if (!inner) return;
    const card = inner.querySelector(activeFaceCardSelector(fromRevealed));
    if (!(card instanceof HTMLElement)) return;
    const nextHeight = measureReviewCard(card);
    setHeightLock(nextHeight);
    setFlipHeight(nextHeight);
  }, []);

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!clickable) return;
      pointerStartRef.current = { x: event.clientX, y: event.clientY };
    },
    [clickable],
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!clickable || isAnimating) return;
      if (isMaskFlipTarget(event.target)) return;
      if (isDragPointerGesture(pointerStartRef.current, event)) return;
      if (hasActiveTextSelection()) return;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        lockFlipHeightForAnimation(revealed);
        setIsAnimating(true);
      }
      onToggle();
    },
    [clickable, isAnimating, lockFlipHeightForAnimation, onToggle, revealed],
  );

  useEffect(() => {
    if (revealedRef.current === revealed) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lockFlipHeightForAnimation(revealedRef.current);
    }
    revealedRef.current = revealed;
  }, [lockFlipHeightForAnimation, revealed]);

  useEffect(() => {
    if (isAnimating) return;
    syncFlipHeight();
  }, [isAnimating, syncFlipHeight]);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const observer = new ResizeObserver(() => {
      if (isAnimating) return;
      syncFlipHeight();
    });

    for (const selector of [".study-flip-front .review-card", ".study-flip-back .review-card"]) {
      const card = inner.querySelector(selector);
      if (card instanceof HTMLElement) {
        observer.observe(card);
      }
    }

    return () => observer.disconnect();
  }, [isAnimating, syncFlipHeight]);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const handleTransitionStart = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") return;
      setIsAnimating(true);
    };
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") return;
      setIsAnimating(false);
      setHeightLock(null);
      syncFlipHeight();
    };

    inner.addEventListener("transitionstart", handleTransitionStart);
    inner.addEventListener("transitionend", handleTransitionEnd);
    inner.addEventListener("transitioncancel", handleTransitionEnd);

    return () => {
      inner.removeEventListener("transitionstart", handleTransitionStart);
      inner.removeEventListener("transitionend", handleTransitionEnd);
      inner.removeEventListener("transitioncancel", handleTransitionEnd);
    };
  }, [syncFlipHeight]);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const frontCard = inner.querySelector(".study-flip-front .review-card");
    const backCard = inner.querySelector(".study-flip-back .review-card");
    if (!(frontCard instanceof HTMLElement) || !(backCard instanceof HTMLElement)) {
      return;
    }
    if (revealed) {
      backCard.scrollTop = frontCard.scrollTop;
    } else {
      frontCard.scrollTop = backCard.scrollTop;
    }
  }, [revealed]);

  const sceneClassName = [
    "study-flip-scene",
    clickable ? "study-flip-scene-interactive" : "",
    compact ? "study-flip-scene-compact" : "",
    isAnimating ? "is-flipping-scene" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const stackHeight = heightLock ?? flipHeight;
  const innerStyle: CSSProperties | undefined =
    stackHeight != null ? { "--flip-height": `${stackHeight}px` } : undefined;

  return (
    <div
      className={sceneClassName}
      onMouseDown={clickable ? handleMouseDown : undefined}
      onClick={clickable ? handleClick : undefined}
    >
      <div
        ref={innerRef}
        style={innerStyle}
        className={[
          "study-flip-inner",
          revealed ? "is-flipped" : "",
          isAnimating ? "is-flipping" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="study-flip-face study-flip-front">{front}</div>
        <div className="study-flip-face study-flip-back">{back}</div>
      </div>
    </div>
  );
}

interface StudyFlipCardProps {
  card: ReviewCard;
  revealed: boolean;
  onRevealedChange: (revealed: boolean) => void;
  interactive?: boolean;
}

export function StudyFlipCard({
  card,
  revealed,
  onRevealedChange,
  interactive = false,
}: StudyFlipCardProps) {
  const [peekedMasks, setPeekedMasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    setPeekedMasks(new Set());
  }, [card.card.id]);

  useEffect(() => {
    if (!revealed) {
      setPeekedMasks(new Set());
    }
  }, [revealed]);

  const togglePeek = useCallback(
    (index: number) => {
      if (!interactive) return;
      setPeekedMasks((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    [interactive],
  );

  const toggle = useCallback(() => {
    onRevealedChange(!revealed);
  }, [onRevealedChange, revealed]);

  return (
    <FlipScene
      revealed={revealed}
      onToggle={toggle}
      clickable
      front={
        <StudyCardDisplay
          card={card}
          revealed={false}
          interactive={interactive}
          peekedMasks={peekedMasks}
          onTogglePeek={togglePeek}
        />
      }
      back={<StudyCardDisplay card={card} revealed interactive={false} />}
    />
  );
}

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

  return (
    <div className={`review-card ${revealed ? "revealed" : "concealed"}`}>
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

export function StudyProgress({
  index,
  total,
  progress,
}: {
  index: number;
  total: number;
  progress: number;
}) {
  const reduced = useReducedMotion();

  return (
    <>
      <div className="review-progress">
        <motion.div
          className="review-progress-bar"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={transitionForReduced(reduced, springSnappy)}
        />
      </div>
      <div className="review-meta">
        <span>
          {index + 1} / {total}
        </span>
      </div>
    </>
  );
}

export function DeckStudySessionProgress({
  remaining,
  total,
  progress,
}: {
  remaining: number;
  total: number;
  progress: number;
}) {
  const reduced = useReducedMotion();

  return (
    <>
      <div className="review-progress">
        <motion.div
          className="review-progress-bar"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={transitionForReduced(reduced, springSnappy)}
        />
      </div>
      <div className="review-meta">
        <span>{uiCopy.deckStudy.sessionRemaining(remaining, total)}</span>
      </div>
    </>
  );
}

export function StudyEmpty({
  title,
  copy: bodyCopy,
  eyebrow,
  onReload,
  reloadLabel = "再読み込み",
}: {
  title: string;
  copy: string;
  eyebrow?: string;
  onReload?: () => void;
  reloadLabel?: string;
}) {
  return (
    <div className="review-stage empty">
      <div className="review-complete">
        <p className="eyebrow">{eyebrow ?? uiCopy.deckStudy.emptyEyebrow}</p>
        <h2>{title}</h2>
        <p>{bodyCopy}</p>
        {onReload && (
          <button type="button" className="accent-button" onClick={onReload}>
            {reloadLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export { useDeckStudySession } from "./use-deck-study-session";

export function useStudyQueue(
  deckId: string | null | undefined,
  filter: "due" | "all",
  shuffle: boolean,
) {
  const api = useAppApi();
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
  }, [deckId, filter, shuffle, api]);

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
