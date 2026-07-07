import type { Transition, Variants } from "motion/react";

export const springDrawer: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 40,
};

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 35,
};

export const tweenFast: Transition = {
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1],
};

export const springLayout: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
};

export const instantTransition: Transition = { duration: 0 };

export type PaneDirection = -1 | 0 | 1;

const PANE_OFFSET_ENTER = 28;
const PANE_OFFSET_EXIT = 20;
const PANE_SCALE = 0.988;

export function createPaneVariants(direction: PaneDirection): Variants {
  const enterX = direction === 0 ? 0 : direction * PANE_OFFSET_ENTER;
  const exitX = direction === 0 ? 0 : direction * -PANE_OFFSET_EXIT;

  return {
    initial: { opacity: 0, x: enterX, scale: PANE_SCALE },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: exitX, scale: PANE_SCALE },
  };
}

/** @deprecated use createPaneVariants */
export type TabTransitionDirection = PaneDirection;

/** @deprecated use createPaneVariants */
export function createTabPanelVariants(direction: PaneDirection): Variants {
  return createPaneVariants(direction);
}

export const fadeSlideVariants: Variants = createPaneVariants(0);

export const cardTileVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.92 },
};

/** @deprecated use createPaneVariants(1) */
export const flashcardVariants: Variants = createPaneVariants(1);

export const dialogBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const dialogPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
};

export function transitionForReduced(
  reduced: boolean,
  transition: Transition,
): Transition {
  return reduced ? instantTransition : transition;
}
