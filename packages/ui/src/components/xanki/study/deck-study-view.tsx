import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CardCollection } from "../card-collection";
import { CollectionAddBar } from "../collection-add-bar";
import { StudyCardCoverflow } from "./study-card-coverflow";
import { useAppShell } from "../../../context/app-shell-context";
import { copy, deckStudyModeList } from "../../../copy";
import { springSnappy } from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";
import type { Card, DeckStudyMode, ReviewCard } from "../../../types";
import { FlashcardsMode } from "./flashcards-mode";
import { MatchMode } from "./match-mode";
import { TestMode } from "./test-mode";
import { WriteMode } from "./write-mode";

export interface StudySessionInfo {
  active: boolean;
  modeLabel: string | null;
  exit: () => void;
}

interface Props {
  deckId?: string | null;
  searchQuery: string;
  libraryRevision?: number;
  onSessionChange: (session: StudySessionInfo) => void;
}

const MODES = deckStudyModeList;

export function DeckStudyView({
  deckId,
  searchQuery,
  libraryRevision = 0,
  onSessionChange,
}: Props) {
  const reduced = useReducedMotion();
  const { sidebarOpen, setSidebarOpen, setStudySessionActive } = useAppShell();
  const sidebarOpenBeforeSessionRef = useRef<boolean | null>(null);
  const [phase, setPhase] = useState<DeckStudyMode | "hub">("hub");
  const [shuffle, setShuffle] = useState(false);
  const [singleCard, setSingleCard] = useState<ReviewCard | null>(null);

  const beginStudySession = useCallback(() => {
    sidebarOpenBeforeSessionRef.current = sidebarOpen;
    setStudySessionActive(true);
    setSidebarOpen(false);
  }, [sidebarOpen, setSidebarOpen, setStudySessionActive]);

  const exitSession = useCallback(() => {
    setPhase("hub");
    setSingleCard(null);
    if (sidebarOpenBeforeSessionRef.current) {
      setSidebarOpen(true);
    }
    sidebarOpenBeforeSessionRef.current = null;
  }, [setSidebarOpen]);

  const startSession = useCallback(
    (mode: DeckStudyMode) => {
      setSingleCard(null);
      setPhase(mode);
      beginStudySession();
    },
    [beginStudySession],
  );

  const startCardPreview = useCallback(
    (card: Card) => {
      setSingleCard({ card });
      setPhase("flashcards");
      beginStudySession();
    },
    [beginStudySession],
  );

  useEffect(() => {
    if (phase === "hub") {
      setStudySessionActive(false);
      onSessionChange({ active: false, modeLabel: null, exit: exitSession });
      return;
    }

    const mode = MODES.find((item) => item.id === phase);
    onSessionChange({
      active: true,
      modeLabel: singleCard ? copy.deckStudy.cardPreview : (mode?.label ?? null),
      exit: exitSession,
    });
  }, [exitSession, onSessionChange, phase, setStudySessionActive, singleCard]);

  useEffect(() => {
    return () => {
      setStudySessionActive(false);
    };
  }, [setStudySessionActive]);

  return (
    <div className="study-view-root">
      {phase === "hub" ? (
        <div className="study-hub">
          <StudyCardCoverflow
            deckId={deckId ?? null}
            libraryRevision={libraryRevision}
            onSelectCard={startCardPreview}
          />

          <section className="study-hub-toolbar" aria-label={copy.deckStudy.modesAriaLabel}>
            <div className="study-hub-toolbar-head">
              <div>
                <p className="eyebrow">{copy.deckStudy.modesEyebrow}</p>
                <h2 className="study-hub-toolbar-title">{copy.deckStudy.hubTitle}</h2>
              </div>
              <label className="shuffle-toggle">
                <input
                  type="checkbox"
                  checked={shuffle}
                  onChange={(e) => setShuffle(e.target.checked)}
                />
                {copy.deckStudy.shuffle}
              </label>
            </div>
            <div className="study-mode-launcher">
              {MODES.map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  className="study-mode-launch-button"
                  data-mode={item.id}
                  disabled={!deckId}
                  onClick={() => startSession(item.id)}
                  whileHover={deckId && !reduced ? { y: -2 } : undefined}
                  whileTap={deckId && !reduced ? { scale: 0.98 } : undefined}
                  transition={springSnappy}
                >
                  <span className="study-mode-launch-label">{item.label}</span>
                  <span className="study-mode-launch-desc">{item.desc}</span>
                </motion.button>
              ))}
            </div>
          </section>

          <CollectionAddBar deckId={deckId ?? null} />

          <CardCollection
            deckId={deckId ?? null}
            searchQuery={searchQuery}
            libraryRevision={libraryRevision}
            onPreviewCard={startCardPreview}
          />
        </div>
      ) : (
        <div className="study-session deck-study-session">
          <div className="study-session-body">
            {phase === "flashcards" && (
              <FlashcardsMode
                deckId={deckId}
                shuffle={shuffle}
                singleCard={singleCard}
                onSingleExit={exitSession}
              />
            )}
            {phase === "write" && <WriteMode deckId={deckId} shuffle={shuffle} />}
            {phase === "test" && <TestMode deckId={deckId} shuffle={shuffle} />}
            {phase === "match" && <MatchMode deckId={deckId} shuffle={shuffle} />}
          </div>
        </div>
      )}
    </div>
  );
}
