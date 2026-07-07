import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "../lib/tauri/api";
import { LibraryCardPreview } from "./LibraryCardPreview";
import type { Card, Deck, DeckExport } from "../types";

interface Props {
  decks: Deck[];
  selectedDeckId: string | null;
  searchQuery: string;
  onSelectDeck: (id: string | null) => void;
  onRefreshDecks: () => void;
}

export function LibraryView({
  decks,
  selectedDeckId,
  searchQuery,
  onSelectDeck,
  onRefreshDecks,
}: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [newDeckName, setNewDeckName] = useState("");
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingDeckName, setEditingDeckName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<
    { kind: "card" | "deck"; id: string; label: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    if (!selectedDeckId) {
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setCards(
        await api.listCards(selectedDeckId, searchQuery || undefined),
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedDeckId]);

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
    if (!pendingDelete) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) {
        setPendingDelete(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete, deleting]);

  async function handleCreateDeck() {
    if (!newDeckName.trim()) return;
    await api.createDeck(newDeckName.trim());
    setNewDeckName("");
    onRefreshDecks();
  }

  async function handleRenameDeck(deckId: string) {
    if (!editingDeckName.trim()) return;
    await api.updateDeck(deckId, editingDeckName.trim());
    setEditingDeckId(null);
    onRefreshDecks();
  }

  async function handleDeleteDeck(deckId: string) {
    const deck = decks.find((item) => item.id === deckId);
    setDeleteError(null);
    setPendingDelete({
      kind: "deck",
      id: deckId,
      label: deck?.name ?? "このデッキ",
    });
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (pendingDelete.kind === "card") {
        await api.deleteCard(pendingDelete.id);
        await loadCards();
      } else {
        await api.deleteDeck(pendingDelete.id);
        if (selectedDeckId === pendingDelete.id) {
          const remaining = decks.filter((item) => item.id !== pendingDelete.id);
          onSelectDeck(remaining[0]?.id ?? null);
        }
        await loadCards();
      }
      onRefreshDecks();
      setPendingDelete(null);
    } catch (error) {
      console.error("delete failed", error);
      setDeleteError("削除に失敗しました。もう一度お試しください。");
    } finally {
      setDeleting(false);
    }
  }

  async function handleExportDeck(deckId: string) {
    const data = await api.exportDeck(deckId);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data.deck.name}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportDeck() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text) as DeckExport;
      await api.importDeck(data);
      onRefreshDecks();
      await loadCards();
    };
    input.click();
  }

  function handleDeleteCard(cardId: string, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    setDeleteError(null);
    setPendingDelete({
      kind: "card",
      id: cardId,
      label: "このカード",
    });
  }

  async function handleEditCard(cardId: string) {
    await api.openCardEditor(cardId);
  }

  async function handleToggleStar(cardId: string, event: MouseEvent) {
    event.stopPropagation();
    await api.toggleStar(cardId);
    await loadCards();
  }

  return (
    <div className="library-layout">
      <aside className="deck-panel">
        <div className="panel-head">
          <h2>デッキ</h2>
        </div>

        <ul className="deck-list">
          {decks.map((deck) => (
            <li key={deck.id}>
              {editingDeckId === deck.id ? (
                <form
                  className="deck-rename"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRenameDeck(deck.id);
                  }}
                >
                  <input
                    value={editingDeckName}
                    onChange={(e) => setEditingDeckName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="text-button">
                    OK
                  </button>
                </form>
              ) : (
                <div className="deck-row-wrap">
                  <button
                    type="button"
                    className={`deck-row ${selectedDeckId === deck.id ? "active" : ""}`}
                    onClick={() => onSelectDeck(deck.id)}
                  >
                    <span className="deck-row-name">{deck.name}</span>
                    <span className="deck-row-count">{deck.cardCount}</span>
                  </button>
                  <div className="deck-row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="名前変更"
                      onClick={() => {
                        setEditingDeckId(deck.id);
                        setEditingDeckName(deck.name);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="エクスポート"
                      onClick={() => void handleExportDeck(deck.id)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="削除"
                      onClick={() => void handleDeleteDeck(deck.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        <form
          className="deck-create"
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreateDeck();
          }}
        >
          <input
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="新しいデッキ"
          />
          <button type="submit" className="accent-button">
            追加
          </button>
        </form>

        <button type="button" className="text-button deck-import" onClick={() => void handleImportDeck()}>
          デッキをインポート
        </button>
      </aside>

      <section className="library-main">
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
                onClick={() => void handleEditCard(card.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void handleEditCard(card.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="カードを編集"
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
            <p className="empty-title">
              {selectedDeckId ? "カードがまだありません" : "デッキがありません"}
            </p>
            <p className="empty-copy">
              {selectedDeckId
                ? "教材上で ⌥⌘M（テキスト）または ⌥⌘S（スクショ）を押して、最初のカードを作りましょう。"
                : "左のサイドバーからデッキを作成してください。"}
            </p>
          </div>
        )}
      </section>

      {pendingDelete && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onClick={() => {
            if (!deleting) setPendingDelete(null);
          }}
        >
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="confirm-delete-title">
              {pendingDelete.kind === "card"
                ? "カードを削除しますか？"
                : "デッキを削除しますか？"}
            </h3>
            <p>
              {pendingDelete.kind === "card"
                ? "この操作は取り消せません。"
                : `${pendingDelete.label} と中のカードを削除します。この操作は取り消せません。`}
            </p>
            {deleteError && <p className="confirm-dialog-error">{deleteError}</p>}
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="ghost-button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="accent-button danger-button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
