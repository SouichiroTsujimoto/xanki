import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useAppApi } from "../../context/app-api-context";
import { cardKindLabel, copy } from "../../copy";
import {
  cardTileVariants,
  springLayout,
  transitionForReduced,
  tweenFast,
} from "../../lib/motion-presets";
import { useReducedMotion } from "../../lib/use-reduced-motion";
import { ReducedAnimatePresence } from "../motion/motion-presence";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { CardTilePreview } from "./card-tile-preview";
import type { Card } from "../../types";
import { Button } from "../ui/button";

interface Props {
  deckId: string | null;
  searchQuery: string;
  collectionRevision?: number;
  onPreviewCard: (card: Card) => void;
}

export function CardCollection({
  deckId,
  searchQuery,
  collectionRevision = 0,
  onPreviewCard,
}: Props) {
  const reduced = useReducedMotion();
  const api = useAppApi();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const hadCardsRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadCards = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!deckId) {
        setCards([]);
        hadCardsRef.current = false;
        setLoading(false);
        return;
      }

      if (!options?.silent && hadCardsRef.current) {
        setLoading(true);
      }
      try {
        const next = await api.listCards(deckId, debouncedQuery || undefined);
        setCards(next);
        hadCardsRef.current = next.length > 0;
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [deckId, debouncedQuery, api],
  );

  useEffect(() => {
    hadCardsRef.current = false;
  }, [deckId]);

  useEffect(() => {
    void loadCards();
  }, [loadCards, collectionRevision]);

  useEffect(() => {
    if (!api.subscribeLibraryChanged) return;
    return api.subscribeLibraryChanged(() => {
      void loadCards({ silent: true });
    });
  }, [api, loadCards]);

  useEffect(() => {
    if (!pendingDeleteId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) {
        setPendingDeleteId(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pendingDeleteId, deleting]);

  async function handleConfirmDelete() {
    if (!pendingDeleteId || deleting) return;
    const deletedId = pendingDeleteId;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCard(deletedId);
      setPendingDeleteId(null);
      setCards((prev) => prev.filter((card) => card.id !== deletedId));
    } catch (error) {
      console.error("delete failed", error);
      setDeleteError("削除に失敗しました。もう一度お試しください。");
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteCard(cardId: string, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    setDeleteError(null);
    setPendingDeleteId(cardId);
  }

  if (!deckId) {
    return (
      <div className="empty-panel card-collection-empty">
        <p className="empty-title">{copy.deckStudy.selectDeckTitle}</p>
        <p className="empty-copy">{copy.deckStudy.selectDeckCopy}</p>
      </div>
    );
  }

  const tileTransition = {
    ...transitionForReduced(reduced, tweenFast),
    layout: transitionForReduced(reduced, springLayout),
  };

  return (
    <section className="library-main card-collection">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{copy.cards.sectionEyebrow}</p>
          <h2>{loading && cards.length === 0 ? "読み込み中..." : `${cards.length} 件`}</h2>
        </div>
      </div>

      <LayoutGroup id="card-collection">
        <motion.div className="card-grid" layoutRoot>
          <AnimatePresence mode="popLayout" initial={false}>
            {cards.map((card) => (
              <motion.div
                key={card.id}
                layout={!reduced ? "position" : false}
                className="flashcard-tile"
                variants={cardTileVariants}
                initial={false}
                animate="animate"
                exit="exit"
                transition={tileTransition}
              >
                <div
                  className="flashcard-tile-body flashcard-tile-clickable"
                  onClick={() => onPreviewCard(card)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPreviewCard(card);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={copy.cards.previewAria(cardKindLabel(card.kind))}
                >
                  <CardTilePreview card={card} />
                  {card.note && <p className="card-note">{card.note}</p>}
                </div>
                <div className="card-actions">
                  <Button
                    type="button"
                    variant="text"
                    onClick={(event) => {
                      event.stopPropagation();
                      void api.openCardEditor(card.id);
                    }}
                  >
                    編集
                  </Button>
                  <Button
                    type="button"
                    variant="text" className="danger"
                    onClick={(event) => handleDeleteCard(card.id, event)}
                  >
                    削除
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {!loading && cards.length === 0 && (
        <div className="empty-panel">
          <p className="empty-title">{copy.cards.emptyTitle}</p>
          <p className="empty-copy">{copy.cards.emptyCopy}</p>
        </div>
      )}

      <ReducedAnimatePresence>
        {pendingDeleteId && (
          <ConfirmDeleteDialog
            key="card-delete"
            title={copy.cards.deleteTitle}
            message="この操作は取り消せません。"
            error={deleteError}
            deleting={deleting}
            onCancel={() => setPendingDeleteId(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        )}
      </ReducedAnimatePresence>
    </section>
  );
}
