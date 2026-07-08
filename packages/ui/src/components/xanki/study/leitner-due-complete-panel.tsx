import { useMemo } from "react";
import { motion } from "motion/react";
import { copy } from "../../../copy";
import {
  springSnappy,
  transitionForReduced,
} from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";
import { Button } from "../../ui/button";

const PARTICLE_COUNT = 24;

type ParticleSpec = {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  color: "accent" | "leitner";
};

function createParticles(): ParticleSpec[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
    id,
    angle: (360 / PARTICLE_COUNT) * id + (id % 3) * 7,
    distance: 72 + (id % 5) * 18,
    size: 4 + (id % 4),
    delay: (id % 6) * 0.02,
    color: id % 3 === 0 ? "leitner" : "accent",
  }));
}

const PARTICLES = createParticles();

type LeitnerDueCompletePanelProps = {
  layout?: "hub" | "session";
  onBackToHub?: () => void;
};

export function LeitnerDueCompletePanel({
  layout = "hub",
  onBackToHub,
}: LeitnerDueCompletePanelProps) {
  const reduced = useReducedMotion();
  const panelTransition = transitionForReduced(reduced, springSnappy);
  const particles = useMemo(() => PARTICLES, []);

  const panelClass =
    layout === "session"
      ? "leitner-study-complete-panel leitner-study-complete-panel--session"
      : "leitner-study-complete-panel";

  return (
    <div
      className={
        layout === "session" ? "leitner-complete-session-wrap" : undefined
      }
    >
      <motion.div
        className={panelClass}
        initial={reduced ? false : { opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={panelTransition}
      >
        {!reduced && (
          <div className="leitner-complete-particles" aria-hidden>
            {particles.map((particle) => {
              const rad = (particle.angle * Math.PI) / 180;
              const x = Math.cos(rad) * particle.distance;
              const y = Math.sin(rad) * particle.distance;

              return (
                <motion.span
                  key={particle.id}
                  className={`leitner-complete-particle leitner-complete-particle--${particle.color}`}
                  style={{
                    width: particle.size,
                    height: particle.size,
                  }}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: [0, x],
                    y: [0, y],
                    scale: [0, 1.2, 0.4],
                  }}
                  transition={{
                    duration: 0.85,
                    delay: particle.delay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              );
            })}
          </div>
        )}

        <motion.span
          className="leitner-complete-mark"
          aria-hidden
          initial={reduced ? false : { scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={transitionForReduced(reduced, {
            type: "spring",
            stiffness: 520,
            damping: 22,
            delay: 0.08,
          })}
        >
          ✓
        </motion.span>

        <motion.p
          className="eyebrow"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitionForReduced(reduced, {
            ...springSnappy,
            delay: 0.14,
          })}
        >
          {copy.leitnerStudy.emptyEyebrow}
        </motion.p>

        <motion.h3
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitionForReduced(reduced, {
            ...springSnappy,
            delay: 0.2,
          })}
        >
          {copy.leitnerStudy.completeTitle}
        </motion.h3>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitionForReduced(reduced, {
            ...springSnappy,
            delay: 0.26,
          })}
        >
          {copy.leitnerStudy.completeHint}
        </motion.p>

        {layout === "session" && onBackToHub && (
          <motion.div
            className="leitner-complete-actions"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitionForReduced(reduced, {
              ...springSnappy,
              delay: 0.32,
            })}
          >
            <Button type="button" variant="accent" onClick={onBackToHub}>
              {copy.leitnerStudy.backToHub}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
