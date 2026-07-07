import { type KeyboardEvent } from "react";
import { motion } from "motion/react";
import {
  springSnappy,
  transitionForReduced,
  tweenFast,
} from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";

export type MaskVisualState = "concealed" | "peeked" | "revealed";

interface Props {
  text: string;
  state: MaskVisualState;
  interactive: boolean;
  staggerDelay?: number;
  onTogglePeek?: () => void;
}

export function MaskedTextSpan({
  text,
  state,
  interactive,
  staggerDelay = 0,
  onTogglePeek,
}: Props) {
  const reduced = useReducedMotion();
  const canTogglePeek =
    interactive && onTogglePeek && (state === "concealed" || state === "peeked");

  const className = [
    "masked",
    state === "peeked" ? "mask-peeked" : "",
    state === "revealed" ? "mask-revealed" : "",
    canTogglePeek ? "mask-interactive" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isRevealedLike = state === "peeked" || state === "revealed";

  return (
    <motion.span
      className={className}
      initial={false}
      animate={{
        backgroundColor: isRevealedLike
          ? "transparent"
          : "var(--color-accent)",
        scale: 1,
      }}
      transition={{
        backgroundColor: transitionForReduced(reduced, {
          ...tweenFast,
          delay: reduced ? 0 : staggerDelay,
        }),
        scale: springSnappy,
      }}
      whileTap={
        canTogglePeek && !reduced ? { scale: 1.02 } : undefined
      }
      onClick={canTogglePeek ? onTogglePeek : undefined}
      role={canTogglePeek ? "button" : undefined}
      tabIndex={canTogglePeek ? 0 : undefined}
      onKeyDown={
        canTogglePeek
          ? (event: KeyboardEvent<HTMLSpanElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onTogglePeek();
              }
            }
          : undefined
      }
    >
      {text}
    </motion.span>
  );
}
