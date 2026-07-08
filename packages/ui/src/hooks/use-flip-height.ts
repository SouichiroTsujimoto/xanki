import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  activeFaceCardSelector,
  hasActiveTextSelection,
  isDragPointerGesture,
  measureReviewCard,
} from "../lib/flip-metrics";

export function useFlipHeight(revealed: boolean) {
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

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") return;
      setIsAnimating(false);
      setHeightLock(null);
      syncFlipHeight();
    };
    const handleTransitionStart = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") return;
      setIsAnimating(true);
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

  const handlePointerDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const prepareFlipAnimation = useCallback(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lockFlipHeightForAnimation(revealed);
      setIsAnimating(true);
    }
  }, [lockFlipHeightForAnimation, revealed]);

  return {
    innerRef,
    pointerStartRef,
    isAnimating,
    stackHeight: heightLock ?? flipHeight,
    handlePointerDown,
    prepareFlipAnimation,
    isDragPointerGesture: (event: MouseEvent<HTMLDivElement>) =>
      isDragPointerGesture(pointerStartRef.current, event),
    hasActiveTextSelection,
  };
}
