import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useAppApi } from "../../context/app-api-context";
import { usePlatformCapabilities } from "../../context/platform-capabilities-context";
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
  onOpenAiGenerate?: () => void;
}

interface SortableTileProps {
  card: Card;
  disabled: boolean;
  layoutEnabled: boolean;
  tileTransition: object;
  onPreviewCard: (card: Card) => void;
  onDeleteCard: (cardId: string, event: MouseEvent) => void;
  cardEditor: boolean;
  onEditCard: (cardId: string) => void;
}

function SortableCardTile({
  card,
  disabled,
  layoutEnabled,
  tileTransition,
  onPreviewCard,
  onDeleteCard,
  cardEditor,
  onEditCard,
}: SortableTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={layoutEnabled && !isDragging ? "position" : false}
      className={`flashcard-tile${isDragging ? " is-dragging" : ""}${disabled ? "" : " is-sortable"}`}
      variants={cardTileVariants}
      initial={false}
      animate="animate"
      exit="exit"
      transition={tileTransition}
      {...attributes}
      {...listeners}
    >
      <div
        className="flashcard-tile-body flashcard-tile-clickable"
        onClick={() => {
          if (isDragging) return;
          onPreviewCard(card);
        }}
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
        {cardEditor && (
          <Button
            type="button"
            variant="text"
            onClick={(event) => {
              event.stopPropagation();
              onEditCard(card.id);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            編集
          </Button>
        )}
        <Button
          type="button"
          variant="text"
          className="danger"
          onClick={(event) => onDeleteCard(card.id, event)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          削除
        </Button>
      </div>
    </motion.div>
  );
}

export function CardCollection({
  deckId,
  searchQuery,
  collectionRevision = 0,
  onPreviewCard,
  onOpenAiGenerate,
}: Props) {
  const reduced = useReducedMotion();
  const api = useAppApi();
  const { cardEditor } = usePlatformCapabilities();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const hadCardsRef = useRef(false);
  const cardsBeforeDragRef = useRef<Card[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isFiltered = Boolean(debouncedQuery.trim());
  const canReorder = Boolean(deckId) && !isFiltered && !reordering && cards.length > 1;

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const cardIds = useMemo(() => cards.map((card) => card.id), [cards]);

  const handleDragStart = useCallback(() => {
    cardsBeforeDragRef.current = cards;
  }, [cards]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const snapshot = cardsBeforeDragRef.current;
      cardsBeforeDragRef.current = null;

      if (!deckId || !canReorder || !over || active.id === over.id) {
        return;
      }

      const oldIndex = cards.findIndex((card) => card.id === active.id);
      const newIndex = cards.findIndex((card) => card.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const next = arrayMove(cards, oldIndex, newIndex);
      const nextIds = next.map((card) => card.id);
      setCards(next);
      setReordering(true);
      try {
        await api.reorderCards(deckId, nextIds);
      } catch (error) {
        console.error("reorder failed", error);
        setCards(snapshot ?? cards);
        void loadCards({ silent: true });
      } finally {
        setReordering(false);
      }
    },
    [api, canReorder, cards, deckId, loadCards],
  );

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

  const layoutEnabled = !reduced;

  return (
    <section className="library-main card-collection">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{copy.cards.sectionEyebrow}</p>
          <h2>{loading && cards.length === 0 ? "読み込み中..." : `${cards.length} 件`}</h2>
          {canReorder && (
            <p className="card-collection-hint">{copy.cards.reorderHint}</p>
          )}
          {isFiltered && cards.length > 1 && (
            <p className="card-collection-hint">{copy.cards.reorderDisabledWhileSearch}</p>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <SortableContext items={cardIds} strategy={rectSortingStrategy} disabled={!canReorder}>
          <LayoutGroup id="card-collection">
            <motion.div className="card-grid" layoutRoot>
              <AnimatePresence mode="popLayout" initial={false}>
                {cards.map((card) => (
                  <SortableCardTile
                    key={card.id}
                    card={card}
                    disabled={!canReorder}
                    layoutEnabled={layoutEnabled}
                    tileTransition={tileTransition}
                    onPreviewCard={onPreviewCard}
                    onDeleteCard={handleDeleteCard}
                    cardEditor={cardEditor}
                    onEditCard={(id) => {
                      void api.openCardEditor(id);
                    }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </SortableContext>
      </DndContext>

      {!loading && cards.length === 0 && (
        <div className="empty-panel">
          <p className="empty-title">{copy.cards.emptyTitle}</p>
          <p className="empty-copy">{copy.cards.emptyCopy}</p>
          {onOpenAiGenerate && (
            <Button type="button" variant="accent" onClick={onOpenAiGenerate}>
              {copy.ai.cardsGenerateEmptyCta}
            </Button>
          )}
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
