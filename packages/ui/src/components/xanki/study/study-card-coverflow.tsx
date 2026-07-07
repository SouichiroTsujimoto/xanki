import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from "motion/react";
import { useAppApi } from "../../../context/app-api-context";
import { cardKindLabel, copy } from "../../../copy";
import { CardTilePreview } from "../card-tile-preview";
import { springSnappy, transitionForReduced } from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";
import type { Card } from "../../../types";

const VISIBLE_RANGE = 3;
const SLIDE_WIDTH = 272;
const DRAG_INDEX_PER_PX = 1 / (SLIDE_WIDTH * 0.62);
const DRAG_CLICK_THRESHOLD_PX = 6;

interface Props {
  deckId: string | null;
  collectionRevision?: number;
  onSelectCard: (card: Card) => void;
}

function clampIndex(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(max, Math.max(0, value));
}

function coverflowMotion(offset: number, reduced: boolean) {
  const abs = Math.abs(offset);
  if (abs > VISIBLE_RANGE) {
    return {
      x: offset * SLIDE_WIDTH * 0.35,
      rotateY: 0,
      scale: 0.7,
      opacity: 0,
      zIndex: 0,
    };
  }

  if (reduced) {
    return {
      x: offset * SLIDE_WIDTH * 0.55,
      rotateY: 0,
      scale: offset === 0 ? 1 : 0.88,
      opacity: Math.abs(offset) < 0.5 ? 1 : Math.max(0.2, 1 - abs * 0.45),
      zIndex: 10 - Math.round(abs),
    };
  }

  return {
    x: offset * SLIDE_WIDTH * 0.62,
    rotateY: offset * -42,
    scale: Math.max(0.72, 1 - abs * 0.11),
    opacity: Math.max(0.25, 1 - abs * 0.22),
    zIndex: 10 - Math.round(abs),
  };
}

export function StudyCardCoverflow({
  deckId,
  collectionRevision = 0,
  onSelectCard,
}: Props) {
  const reduced = useReducedMotion();
  const api = useAppApi();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollPosition = useMotionValue(0);
  const [renderPosition, setRenderPosition] = useState(0);

  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startPosition: 0,
    moved: false,
    pressedIndex: null as number | null,
  });
  const snapAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const hadCardsRef = useRef(false);

  useMotionValueEvent(scrollPosition, "change", (value) => {
    setRenderPosition(value);
  });

  const loadCards = useCallback(async () => {
    if (!deckId) {
      setCards([]);
      hadCardsRef.current = false;
      scrollPosition.set(0);
      return;
    }

    if (!hadCardsRef.current) {
      setLoading(true);
    }
    try {
      const next = await api.listCards(deckId);
      setCards(next);
      hadCardsRef.current = next.length > 0;
      const maxIndex = Math.max(0, next.length - 1);
      scrollPosition.set(clampIndex(scrollPosition.get(), maxIndex));
    } finally {
      setLoading(false);
    }
  }, [api, deckId, scrollPosition]);

  useEffect(() => {
    void loadCards();
  }, [loadCards, collectionRevision]);

  useEffect(() => {
    if (!api.subscribeLibraryChanged) return;
    return api.subscribeLibraryChanged(() => {
      void loadCards();
    });
  }, [api, loadCards]);

  useEffect(() => {
    scrollPosition.set(0);
    setCards([]);
    hadCardsRef.current = false;
    setLoading(Boolean(deckId));
  }, [deckId, scrollPosition]);

  const snapTo = useCallback(
    (target: number) => {
      const clamped = clampIndex(target, Math.max(0, cards.length - 1));
      snapAnimRef.current?.stop();
      snapAnimRef.current = animate(
        scrollPosition,
        clamped,
        transitionForReduced(reduced, springSnappy),
      );
    },
    [cards.length, reduced, scrollPosition],
  );

  const snapToNearest = useCallback(() => {
    snapTo(Math.round(scrollPosition.get()));
  }, [scrollPosition, snapTo]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      snapAnimRef.current?.stop();

      const slide = (event.target as HTMLElement | null)?.closest(
        "[data-coverflow-index]",
      );
      const pressedIndex = slide
        ? Number(slide.getAttribute("data-coverflow-index"))
        : null;

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startPosition: scrollPosition.get(),
        moved: false,
        pressedIndex: Number.isFinite(pressedIndex) ? pressedIndex : null,
      };
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [scrollPosition],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (dragRef.current.pointerId !== event.pointerId) return;
      if (cards.length <= 1) return;

      const deltaX = event.clientX - dragRef.current.startX;
      if (Math.abs(deltaX) > DRAG_CLICK_THRESHOLD_PX) {
        dragRef.current.moved = true;
      }

      const next = clampIndex(
        dragRef.current.startPosition - deltaX * DRAG_INDEX_PER_PX,
        cards.length - 1,
      );
      scrollPosition.set(next);
    },
    [cards.length, scrollPosition],
  );

  const finishPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (dragRef.current.pointerId !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const wasDrag = dragRef.current.moved;
      const pressedIndex = dragRef.current.pressedIndex;
      dragRef.current.pointerId = -1;
      dragRef.current.pressedIndex = null;
      setIsDragging(false);

      if (wasDrag) {
        snapToNearest();
        return;
      }

      if (pressedIndex == null || !Number.isFinite(pressedIndex)) return;
      if (pressedIndex < 0 || pressedIndex >= cards.length) return;

      const offset = Math.abs(pressedIndex - scrollPosition.get());
      if (offset < 0.45) {
        onSelectCard(cards[pressedIndex]);
        return;
      }

      snapTo(pressedIndex);
    },
    [cards, onSelectCard, scrollPosition, snapTo, snapToNearest],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (cards.length === 0) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        snapTo(Math.round(scrollPosition.get()) - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        snapTo(Math.round(scrollPosition.get()) + 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cards.length, scrollPosition, snapTo]);

  if (!deckId) {
    return null;
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="study-coverflow" aria-label={copy.deckStudy.coverflowAria}>
      <div
        className={`study-coverflow-stage${isDragging ? " is-dragging" : ""}${
          loading && cards.length === 0 ? " is-loading" : ""
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
      >
        <div className="study-coverflow-track">
          {cards.map((card, index) => {
            const offset = index - renderPosition;
            if (Math.abs(offset) > VISIBLE_RANGE + 0.5) return null;

            const motionValues = coverflowMotion(offset, reduced);
            const isCenter = Math.abs(offset) < 0.45;

            return (
              <motion.button
                key={card.id}
                type="button"
                initial={false}
                data-coverflow-index={index}
                className={`study-coverflow-slide${isCenter ? " is-active" : ""}`}
                aria-label={
                  isCenter
                    ? copy.cards.previewAria(cardKindLabel(card.kind))
                    : `カード ${index + 1}`
                }
                aria-current={isCenter ? "true" : undefined}
                animate={{
                  x: `calc(-50% + ${motionValues.x}px)`,
                  y: "-50%",
                  rotateY: motionValues.rotateY,
                  scale: motionValues.scale,
                  opacity: motionValues.opacity,
                }}
                style={{ zIndex: motionValues.zIndex }}
                transition={
                  isDragging
                    ? { duration: 0 }
                    : transitionForReduced(reduced, springSnappy)
                }
              >
                <div className="study-coverflow-slide-body">
                  <CardTilePreview card={card} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
