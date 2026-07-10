import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { copy } from "../../../copy";
import { useReducedMotion } from "../../../lib/use-reduced-motion";

const SWIPE_THRESHOLD_PX = 110;
const SWIPE_VELOCITY = 650;

type Grade = "known" | "still";

type Props = {
  /** Reset key when the card changes (e.g. card id). */
  cardKey: string;
  /** When false, drag is disabled (e.g. answer not revealed). */
  enabled: boolean;
  /** Disable while grading / loading next card. */
  locked?: boolean;
  onGrade: (grade: Grade) => void;
  children: ReactNode;
};

export function SwipeableStudyCard({
  cardKey,
  enabled,
  locked = false,
  onGrade,
  children,
}: Props) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const rotate = useTransform(x, [-220, 0, 220], [-12, 0, 12]);
  const knownOpacity = useTransform(x, [40, 120], [0, 1]);
  const stillOpacity = useTransform(x, [-120, -40], [1, 0]);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    pendingRef.current = false;
    setPending(false);
    x.set(0);
    opacity.set(1);
  }, [cardKey, opacity, x]);

  const canDrag = enabled && !locked && !pending;

  const commit = useCallback(
    async (grade: Grade) => {
      if (locked || pendingRef.current) return;
      pendingRef.current = true;
      setPending(true);
      const target = grade === "known" ? 520 : -520;
      const duration = reduced ? 0 : 0.18;
      await animate(x, target, { duration, ease: "easeOut" });
      await animate(opacity, 0.2, { duration: reduced ? 0 : 0.12 });
      onGrade(grade);
    },
    [locked, onGrade, opacity, reduced, x],
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (!enabled || locked || pendingRef.current) return;
      const { offset, velocity } = info;
      const goKnown =
        offset.x > SWIPE_THRESHOLD_PX || velocity.x > SWIPE_VELOCITY;
      const goStill =
        offset.x < -SWIPE_THRESHOLD_PX || velocity.x < -SWIPE_VELOCITY;
      if (goKnown) {
        void commit("known");
        return;
      }
      if (goStill) {
        void commit("still");
        return;
      }
      void animate(x, 0, {
        type: "spring",
        stiffness: 500,
        damping: 35,
        duration: reduced ? 0 : undefined,
      });
    },
    [commit, enabled, locked, reduced, x],
  );

  return (
    <div className="swipeable-study-card">
      <motion.div
        className="swipeable-study-card-hint swipeable-study-card-hint-still"
        style={{ opacity: stillOpacity }}
        aria-hidden
      >
        {copy.deckStudy.stillAgain}
      </motion.div>
      <motion.div
        className="swipeable-study-card-hint swipeable-study-card-hint-known"
        style={{ opacity: knownOpacity }}
        aria-hidden
      >
        {copy.deckStudy.known}
      </motion.div>
      <motion.div
        className="swipeable-study-card-layer"
        style={{ x, rotate, opacity }}
        drag={canDrag ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.92}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
