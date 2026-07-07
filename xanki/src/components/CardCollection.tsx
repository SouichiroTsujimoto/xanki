import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "../lib/tauri/api";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { LibraryCardPreview } from "./LibraryCardPreview";
import type { Card } from "../types";

interface Props {
  deckId: string | null;
  searchQuery: string;
  onRefreshDecks: () => void;
  onPreviewCard: (card: Card) => void;
}

export function CardCollection({
  deckId,
  searchQuery,
  onRefreshDecks,
  onPreviewCard,
}: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    if (!deckId) {
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setCards(await api.listCards(deckId, searchQuery || undefined));
    } finally {
      setLoading(false);
    }
  }, [deckId, searchQuery]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  useEffect(() => {
    const unlistenChanged = listen("library-changed", () => {
      void loadCards();
      onRefreshDecks();
    });
    const window = getCurrentWindow();
    const unlistenFocus = window.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        void loadCards();
        onRefreshDecks();
      }
    });

    return () => {
      void unlistenChanged.then((fn) => fn());
      void unlistenFocus.then((fn) => fn());
    };
  }, [loadCards, onRefreshDecks]);

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
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCard(pendingDeleteId);
      await loadCards();
      onRefreshDecks();
      setPendingDeleteId(null);
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

  async function handleToggleStar(cardId: string, event: MouseEvent) {
    event.stopPropagation();
    await api.toggleStar(cardId);
    await loadCards();
  }

  if (!deckId) {
    return (
      <div className="empty-panel card-collection-empty">
        <p className="empty-title">デッキが選択されていません</p>
        <p className="empty-copy">Home でデッキを選んでから学習を始めてください。</p>
      </div>
    );
  }

  return (
    <section className="library-main card-collection">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Collection</p>
          <h2>{loading ? "読み込み中..." : `${cards.length} 件`}</h2>
        </div>
      </div>

      <div className="card-grid">
        {cards.map((card) => (
          <div key={card.id} className="flashcard-tile">
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
              aria-label={`${card.kind} カードをプレビュー`}
            >
              <div className="flashcard-tile-head">
                <button
                  type="button"
                  className={`star-button ${card.starred ? "active" : ""}`}
                  onClick={(event) => void handleToggleStar(card.id, event)}
                  aria-label="スター"
                >
                  ★
                </button>
                <span className={`type-pill ${card.kind}`}>
                  {card.kind === "text"
                    ? "Text"
                    : card.kind === "qa"
                      ? "Q&A"
                      : "Image"}
                </span>
                {card.boxNum != null && (
                  <span className="box-pill">Box {card.boxNum}</span>
                )}
              </div>
              <LibraryCardPreview card={card} />
              {card.note && <p className="card-note">{card.note}</p>}
            </div>
            <div className="card-actions">
              <button
                type="button"
                className="text-button"
                onClick={(event) => {
                  event.stopPropagation();
                  void api.openCardEditor(card.id);
                }}
              >
                編集
              </button>
              <button
                type="button"
                className="text-button danger"
                onClick={(event) => handleDeleteCard(card.id, event)}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && cards.length === 0 && (
        <div className="empty-panel">
          <p className="empty-title">カードがまだありません</p>
          <p className="empty-copy">
            教材上で ⌥⌘M（テキスト）または ⌥⌘S（スクショ）を押して、最初のカードを作りましょう。
          </p>
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmDeleteDialog
          title="カードを削除しますか？"
          message="この操作は取り消せません。"
          error={deleteError}
          deleting={deleting}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}
    </section>
  );
}
