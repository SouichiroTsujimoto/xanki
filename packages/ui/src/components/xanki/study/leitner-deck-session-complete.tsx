import { motion } from "motion/react";
import { copy } from "../../../copy";
import { tweenFast, transitionForReduced } from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";
import { Button } from "../../ui/button";

type LeitnerDeckSessionCompleteProps = {
  remainingDueCount: number;
  onBackToHub: () => void;
};

export function LeitnerDeckSessionComplete({
  remainingDueCount,
  onBackToHub,
}: LeitnerDeckSessionCompleteProps) {
  const reduced = useReducedMotion();

  return (
    <div className="review-stage empty">
      <motion.div
        className="review-complete leitner-deck-session-complete"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitionForReduced(reduced, tweenFast)}
      >
        <p className="eyebrow">{copy.leitnerStudy.emptyEyebrow}</p>
        <h2>{copy.leitnerStudy.deckSessionCompleteTitle}</h2>
        <p>{copy.leitnerStudy.deckSessionCompleteCopy(remainingDueCount)}</p>
        <Button type="button" variant="accent" onClick={onBackToHub}>
          {copy.leitnerStudy.backToHub}
        </Button>
      </motion.div>
    </div>
  );
}
