import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { ReviewCard } from "../../../types";
import { isMaskFlipTarget } from "./study-text-masks";
import { StudyCardDisplay } from "./study-card-display";
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
    stackHeight != null
      ? ({ ["--flip-height" as string]: `${stackHeight}px` } as CSSProperties)
      : undefined;

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
