import { type ReactNode } from "react";
import { motion, type HTMLMotionProps, type Variants } from "motion/react";
import {
  fadeSlideVariants,
  instantTransition,
  tweenFast,
  transitionForReduced,
} from "../../lib/motion-presets";
import { useReducedMotion } from "../../lib/use-reduced-motion";

interface FadeSlideProps extends HTMLMotionProps<"div"> {
  motionKey: string;
  variants?: Variants;
}

export function FadeSlide({
  motionKey,
  children,
  className,
  variants = fadeSlideVariants,
  ...props
}: FadeSlideProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      key={motionKey}
      className={className}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transitionForReduced(reduced, tweenFast)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionFade({
  show,
  children,
  className,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={reduced ? instantTransition : tweenFast}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      {children}
    </motion.div>
  );
}
