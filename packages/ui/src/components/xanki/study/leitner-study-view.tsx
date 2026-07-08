import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { copy } from "../../../copy";
import { useAppApi } from "../../../context/app-api-context";
import { useAppShell } from "../../../context/app-shell-context";
import type { Deck } from "../../../types";
import { LearnMode } from "./learn-mode";
import { LeitnerDueCompletePanel } from "./leitner-due-complete-panel";
import type { StudySessionInfo } from "./deck-study-view";

interface Props {
  decks: Deck[];
  dueCount: number;
  collectionRevision?: number;
  onSessionChange: (session: StudySessionInfo) => void;
}

interface DeckDueRow {
  deck: Deck;
  dueCount: number;
}

export function LeitnerStudyView({
  decks,
  dueCount,
  collectionRevision = 0,
  onSessionChange,
}: Props) {
  const api = useAppApi();
  const { sidebarOpen, setSidebarOpen, setStudySessionActive } = useAppShell();
  const sidebarOpenBeforeSessionRef = useRef<boolean | null>(null);
  const [phase, setPhase] = useState<"hub" | "session">("hub");
  const [sessionDeckId, setSessionDeckId] = useState<string | null>(null);
  const [deckDueRows, setDeckDueRows] = useState<DeckDueRow[]>([]);

  const beginStudySession = useCallback(() => {
    sidebarOpenBeforeSessionRef.current = sidebarOpen;
    setStudySessionActive(true);
    setSidebarOpen(false);
  }, [sidebarOpen, setSidebarOpen, setStudySessionActive]);

  const exitSession = useCallback(() => {
    setPhase("hub");
    setSessionDeckId(null);
    if (sidebarOpenBeforeSessionRef.current) {
      setSidebarOpen(true);
    }
    sidebarOpenBeforeSessionRef.current = null;
  }, [setSidebarOpen]);

  const startSession = useCallback(
    (deckId: string | null) => {
      setSessionDeckId(deckId);
      setPhase("session");
      beginStudySession();
    },
    [beginStudySession],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadDeckDue() {
      const cards = await api.listCards();
      const now = Date.now();
      const counts = new Map<string, number>();
      for (const card of cards) {
        if (Number(card.dueAt ?? 0) <= now) {
          counts.set(card.deckId, (counts.get(card.deckId) ?? 0) + 1);
        }
      }
      if (cancelled) return;
      const rows = decks
        .map((deck) => ({
          deck,
          dueCount: counts.get(deck.id) ?? 0,
        }))
        .filter((row) => row.dueCount > 0)
        .sort((a, b) => b.dueCount - a.dueCount);
      setDeckDueRows(rows);
    }
    void loadDeckDue();
    return () => {
      cancelled = true;
    };
  }, [api, decks, dueCount, collectionRevision]);

  useEffect(() => {
    if (phase === "hub") {
      setStudySessionActive(false);
      onSessionChange({ active: false, modeLabel: null, exit: exitSession });
      return;
    }

    onSessionChange({
      active: true,
      modeLabel: copy.leitnerStudy.sessionActiveLabel,
      exit: exitSession,
    });
  }, [exitSession, onSessionChange, phase, setStudySessionActive]);

  useEffect(() => {
    return () => {
      setStudySessionActive(false);
    };
  }, [setStudySessionActive]);

  const hubSubtitle = useMemo(
    () => copy.leitnerStudy.dueToday(dueCount),
    [dueCount],
  );

  return (
    <div className="study-view-root leitner-study-root">
      {phase === "hub" ? (
        <div className="leitner-study-hub">
          <header className="leitner-study-hub-head">
            <p className="eyebrow">{copy.leitnerStudy.hubEyebrow}</p>
            <h2 className="leitner-study-hub-title">{copy.leitnerStudy.hubTitle}</h2>
          </header>

          {dueCount > 0 ? (
            <>
              <button
                type="button"
                className="leitner-hero-start"
                onClick={() => startSession(null)}
              >
                <span className="leitner-hero-start-glow" aria-hidden />
                <span className="leitner-hero-start-inner">
                  <span className="leitner-hero-start-count">{dueCount}</span>
                  <span className="leitner-hero-start-copy">
                    <strong>{copy.leitnerStudy.startAllHero}</strong>
                    <span>{hubSubtitle}</span>
                    <span className="leitner-hero-start-hint">
                      {copy.leitnerStudy.startAllHint}
                    </span>
                  </span>
                  <span className="leitner-hero-start-arrow" aria-hidden>
                    →
                  </span>
                </span>
              </button>

              {deckDueRows.length > 0 && (
                <section className="leitner-deck-due-list" aria-label={copy.leitnerStudy.decksSection}>
                  <div className="leitner-deck-due-head">
                    <p className="eyebrow">{copy.leitnerStudy.decksSection}</p>
                    <p className="leitner-deck-due-sub">
                      デッキを選ぶと、そのデッキの due だけ復習します
                    </p>
                  </div>
                  <ul className="leitner-deck-due-items">
                    {deckDueRows.map(({ deck, dueCount: deckDue }) => (
                      <li key={deck.id}>
                        <button
                          type="button"
                          className="leitner-deck-due-row"
                          onClick={() => startSession(deck.id)}
                        >
                          <span className="leitner-deck-due-leading" aria-hidden />
                          <span className="leitner-deck-due-name">{deck.name}</span>
                          <span className="leitner-deck-due-count">
                            {copy.leitnerStudy.deckDue(deckDue)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <LeitnerDueCompletePanel layout="hub" />
          )}
        </div>
      ) : (
        <div className="study-session leitner-study-session">
          <div className="study-session-body">
            <LearnMode
              deckId={sessionDeckId}
              shuffle
              onBackToHub={exitSession}
            />
          </div>
        </div>
      )}
    </div>
  );
}
