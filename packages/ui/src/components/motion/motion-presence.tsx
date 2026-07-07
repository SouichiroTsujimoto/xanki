import { type PropsWithChildren } from "react";
import { AnimatePresence, type AnimatePresenceProps } from "motion/react";
import { useReducedMotion } from "../../lib/use-reduced-motion";

export function ReducedAnimatePresence({
  mode = "wait",
  children,
  ...props
}: PropsWithChildren<AnimatePresenceProps>) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode={reduced ? "sync" : mode} {...props}>
      {children}
    </AnimatePresence>
  );
}
