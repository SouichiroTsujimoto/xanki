import { useCallback, useEffect, useState } from "react";
import { CardCollection } from "../CardCollection";
import { useAppStore } from "../../stores/appStore";
import type { Card, ReviewCard, StudyMode } from "../../types";
import { FlashcardsMode } from "./FlashcardsMode";
import { LearnMode } from "./LearnMode";
import { MatchMode } from "./MatchMode";
import { TestMode } from "./TestMode";
import { WriteMode } from "./WriteMode";

export interface StudySessionInfo {
  active: boolean;
  modeLabel: string | null;
  exit: () => void;
}

interface Props {
  deckId?: string | null;
  searchQuery: string;
  onRefreshDecks: () => void;
  onSessionChange: (session: StudySessionInfo) => void;
}

const MODES: { id: StudyMode; label: string; hint: string; desc: string }[] = [
  {
    id: "flashcards",
    label: "フラッシュカード",
    hint: "Flashcards",
    desc: "答えを確認しながら全カードを巡る",
  },
  {
    id: "learn",
    label: "学習",
    hint: "Learn · SRS",
    desc: "復習予定のカードを Leitner で定着",
  },
  {
    id: "write",
    label: "書く",
    hint: "Write",
    desc: "マスク部分を入力して思い出す",
  },
  {
    id: "test",
    label: "テスト",
    hint: "Test",
    desc: "4 択で正解を選ぶ",
  },
  {
    id: "match",
    label: "マッチ",
    hint: "Match",
    desc: "問題と答えのペアを組み合わせる",
  },
];

export function StudyView({
  deckId,
  searchQuery,
  onRefreshDecks,
  onSessionChange,
}: Props) {
  const { setSidebarOpen, setStudySessionActive } = useAppStore();
  const [phase, setPhase] = useState<StudyMode | "hub">("hub");
  const [shuffle, setShuffle] = useState(false);
  const [singleCard, setSingleCard] = useState<ReviewCard | null>(null);

  const exitSession = useCallback(() => {
    setPhase("hub");
    setSingleCard(null);
  }, []);

  const startSession = useCallback(
    (mode: StudyMode) => {
      setSingleCard(null);
      setPhase(mode);
      setStudySessionActive(true);
      setSidebarOpen(false);
    },
    [setSidebarOpen, setStudySessionActive],
  );

  const startCardPreview = useCallback(
    (card: Card) => {
      setSingleCard({ card });
      setPhase("flashcards");
      setStudySessionActive(true);
      setSidebarOpen(false);
    },
    [setSidebarOpen, setStudySessionActive],
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
      modeLabel: singleCard ? "カードプレビュー" : (mode?.label ?? null),
      exit: exitSession,
    });
  }, [exitSession, onSessionChange, phase, setStudySessionActive, singleCard]);

  useEffect(() => {
    return () => {
      setStudySessionActive(false);
    };
  }, [setStudySessionActive]);

  if (phase !== "hub") {
    return (
      <div className="study-session">
        <div className="study-session-body">
          {phase === "flashcards" && (
            <FlashcardsMode
              deckId={deckId}
              shuffle={shuffle}
              singleCard={singleCard}
              onSingleExit={exitSession}
            />
          )}
          {phase === "learn" && <LearnMode deckId={deckId} />}
          {phase === "write" && <WriteMode deckId={deckId} shuffle={shuffle} />}
          {phase === "test" && <TestMode deckId={deckId} shuffle={shuffle} />}
          {phase === "match" && <MatchMode deckId={deckId} />}
        </div>
      </div>
    );
  }

  return (
    <div className="study-hub">
      <section className="study-hub-toolbar" aria-label="学習モード">
        <div className="study-hub-toolbar-head">
          <div>
            <p className="eyebrow">Study Modes</p>
            <h2 className="study-hub-toolbar-title">学習を始める</h2>
          </div>
          <label className="shuffle-toggle">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
            />
            シャッフル
          </label>
        </div>
        <div className="study-mode-launcher">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="study-mode-launch-button"
              data-mode={item.id}
              disabled={!deckId}
              onClick={() => startSession(item.id)}
            >
              <span className="study-mode-launch-label">{item.label}</span>
              <small>{item.hint}</small>
              <span className="study-mode-launch-desc">{item.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <CardCollection
        deckId={deckId ?? null}
        searchQuery={searchQuery}
        onRefreshDecks={onRefreshDecks}
        onPreviewCard={startCardPreview}
      />
    </div>
  );
}
