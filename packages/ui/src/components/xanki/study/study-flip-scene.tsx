import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { isMaskFlipTarget } from "./study-text-masks";
import { StudyCardDisplay } from "./study-card-display";
import { useFlipHeight } from "../../../hooks/use-flip-height";
import type { ReviewCard } from "../../../types";

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
  const {
    innerRef,
    isAnimating,
    stackHeight,
    handlePointerDown,
    prepareFlipAnimation,
    isDragPointerGesture,
    hasActiveTextSelection: hasSelection,
  } = useFlipHeight(revealed);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!clickable || isAnimating) return;
      if (isMaskFlipTarget(event.target)) return;
      if (isDragPointerGesture(event)) return;
      if (hasSelection()) return;
      prepareFlipAnimation();
      onToggle();
    },
    [clickable, hasSelection, isAnimating, isDragPointerGesture, onToggle, prepareFlipAnimation],
  );

  const sceneClassName = [
    "study-flip-scene",
    clickable ? "study-flip-scene-interactive" : "",
    compact ? "study-flip-scene-compact" : "",
    isAnimating ? "is-flipping-scene" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const innerStyle: CSSProperties | undefined =
    stackHeight != null
      ? ({ ["--flip-height" as string]: `${stackHeight}px` } as CSSProperties)
      : undefined;

  return (
    <div
      className={sceneClassName}
      onMouseDown={clickable ? handlePointerDown : undefined}
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
