import { useEffect, useState } from "react";
import type { StudyMetrics } from "@xanki/shared";
import { copy } from "../../copy";
import { useAppApi } from "../../context/app-api-context";
import { ReducedAnimatePresence } from "../motion/motion-presence";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { DeckSchedulerSettings } from "./deck-scheduler-settings";
import { HomeMetricsPanel } from "./home-metrics-panel";
import type { Deck, DeckExport } from "../../types";
import { Button } from "../ui/button";

interface Props {
  decks: Deck[];
  selectedDeckId: string | null;
  dueCount: number;
  collectionRevision?: number;
  onSelectDeck: (id: string | null) => void;
  onGoToDeckStudy: () => void;
  onGoToLeitner?: () => void;
  onDeckConfigSaved?: () => void | Promise<void>;
}

export function HomeView({
  decks,
  selectedDeckId,
  dueCount,
  collectionRevision = 0,
  onSelectDeck,
  onGoToDeckStudy,
  onGoToLeitner,
  onDeckConfigSaved,
}: Props) {
  const api = useAppApi();
  const [metrics, setMetrics] = useState<StudyMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [newDeckName, setNewDeckName] = useState("");
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingDeckName, setEditingDeckName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId) ?? null;

  useEffect(() => {
    let cancelled = false;
    async function loadMetrics() {
      setMetricsLoading(true);
      try {
        const next = await api.getStudyMetrics(selectedDeckId ?? undefined);
        if (!cancelled) setMetrics(next);
      } catch (error) {
        console.error("metrics load failed", error);
        if (!cancelled) setMetrics(null);
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    }
    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [api, selectedDeckId, collectionRevision]);

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
  }

  async function handleRenameDeck(deckId: string) {
    if (!editingDeckName.trim()) return;
    await api.updateDeck(deckId, { name: editingDeckName.trim() });
    setEditingDeckId(null);
  }

  async function handleDeleteDeck(deckId: string) {
    const deck = decks.find((item) => item.id === deckId);
    setDeleteError(null);
    setPendingDelete({
      id: deckId,
      label: deck?.name ?? "このデッキ",
    });
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteDeck(pendingDelete.id);
      if (selectedDeckId === pendingDelete.id) {
        const remaining = decks.filter((item) => item.id !== pendingDelete.id);
        onSelectDeck(remaining[0]?.id ?? null);
      }
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
    };
    input.click();
  }

  return (
    <div className="home-view">
      {selectedDeck ? (
        <section className="home-spotlight" aria-label={copy.home.currentDeck}>
          <p className="eyebrow home-spotlight-eyebrow">{copy.home.currentDeck}</p>
          <h2 className="home-spotlight-title">{selectedDeck.name}</h2>
          <div className="home-spotlight-stats">
            <span className="home-spotlight-stat">
              <strong>{selectedDeck.cardCount}</strong> カード
            </span>
            {dueCount > 0 && (
              <span className="home-spotlight-due">{dueCount} 件復習待ち</span>
            )}
          </div>
          <div className="home-spotlight-actions">
            <Button type="button" variant="accent" onClick={onGoToDeckStudy}>
              {copy.deckStudy.hubTitle}
            </Button>
            {dueCount > 0 && onGoToLeitner && (
              <Button type="button" variant="ghost" onClick={onGoToLeitner}>
                {copy.leitnerStudy.goFromHome}
              </Button>
            )}
          </div>
        </section>
      ) : (
        <section className="home-spotlight">
          <p className="eyebrow home-spotlight-eyebrow">{copy.home.getStarted}</p>
          <h2 className="home-spotlight-title">{copy.home.pickDeck}</h2>
          <p className="home-capture-hint">
            上のフォームからデッキを作成するか、下の一覧から選んでください。
          </p>
        </section>
      )}

      <HomeMetricsPanel
        metrics={metrics}
        loading={metricsLoading}
        deckName={selectedDeck?.name ?? null}
      />

      {selectedDeck && (
        <DeckSchedulerSettings deck={selectedDeck} onSaved={onDeckConfigSaved} />
      )}

      <section className="home-create-bar" aria-label="デッキの追加">
        <form
          className="home-create-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreateDeck();
          }}
        >
          <input
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder={copy.home.newDeckPlaceholder}
          />
          <Button type="submit" variant="accent">
            追加
          </Button>
        </form>
        <Button type="button" variant="text" onClick={() => void handleImportDeck()}>
          インポート
        </Button>
      </section>

      <section className="home-decks-section" aria-label={copy.home.decksSection}>
        <h3 className="home-decks-heading">デッキ一覧</h3>
        {decks.length === 0 ? (
          <div className="empty-panel home-empty">
            <p className="empty-title">{copy.home.noDecksTitle}</p>
            <p className="empty-copy">{copy.home.noDecksCopy}</p>
          </div>
        ) : (
          <div className="home-deck-grid">
            {decks.map((deck) => (
              <article
                key={deck.id}
                className={`home-deck-card ${selectedDeckId === deck.id ? "active" : ""}`}
                onClick={() => onSelectDeck(deck.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectDeck(deck.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={selectedDeckId === deck.id}
                aria-label={`${deck.name} を選択`}
              >
                {editingDeckId === deck.id ? (
                  <form
                    className="home-deck-rename"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleRenameDeck(deck.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      value={editingDeckName}
                      onChange={(e) => setEditingDeckName(e.target.value)}
                      autoFocus
                    />
                    <Button type="submit" variant="text">
                      OK
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="home-deck-card-head">
                      <div className="home-deck-info">
                        <span className="home-deck-select-name">{deck.name}</span>
                        <span className="home-deck-select-meta">{deck.cardCount} カード</span>
                      </div>
                      <div
                        className="home-deck-card-actions"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="icon"
                          aria-label="名前変更"
                          onClick={() => {
                            setEditingDeckId(deck.id);
                            setEditingDeckName(deck.name);
                          }}
                        >
                          ✎
                        </Button>
                        <Button
                          type="button"
                          variant="icon"
                          aria-label="エクスポート"
                          onClick={() => void handleExportDeck(deck.id)}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="icon"
                          aria-label="削除"
                          onClick={() => void handleDeleteDeck(deck.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="ghost-button home-deck-study-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDeck(deck.id);
                        onGoToDeckStudy();
                      }}
                    >
                      {copy.home.goToDeckStudy}
                    </Button>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <ReducedAnimatePresence>
        {pendingDelete && (
          <ConfirmDeleteDialog
            key="deck-delete"
            title={copy.common.deleteDeckTitle}
            message={`${pendingDelete.label} と中のカードを削除します。この操作は取り消せません。`}
            error={deleteError}
            deleting={deleting}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        )}
      </ReducedAnimatePresence>
    </div>
  );
}
