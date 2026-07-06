import { useState } from "react";
import type { StudyMode } from "../../types";
import { FlashcardsMode } from "./FlashcardsMode";
import { LearnMode } from "./LearnMode";
import { MatchMode } from "./MatchMode";
import { TestMode } from "./TestMode";
import { WriteMode } from "./WriteMode";

interface Props {
  deckId?: string | null;
}

const MODES: { id: StudyMode; label: string; hint: string }[] = [
  { id: "flashcards", label: "フラッシュカード", hint: "Flashcards" },
  { id: "learn", label: "学習", hint: "Learn · SRS" },
  { id: "write", label: "書く", hint: "Write" },
  { id: "test", label: "テスト", hint: "Test" },
  { id: "match", label: "マッチ", hint: "Match" },
];

export function StudyView({ deckId }: Props) {
  const [mode, setMode] = useState<StudyMode>("learn");
  const [shuffle, setShuffle] = useState(false);

  return (
    <div className="study-hub">
      <div className="study-toolbar">
        <div className="study-mode-tabs">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`study-mode-tab ${mode === item.id ? "active" : ""}`}
              onClick={() => setMode(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </button>
          ))}
        </div>
        {mode !== "learn" && mode !== "match" && (
          <label className="shuffle-toggle">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
            />
            シャッフル
          </label>
        )}
      </div>

      {mode === "flashcards" && (
        <FlashcardsMode deckId={deckId} shuffle={shuffle} />
      )}
      {mode === "learn" && <LearnMode deckId={deckId} />}
      {mode === "write" && <WriteMode deckId={deckId} shuffle={shuffle} />}
      {mode === "test" && <TestMode deckId={deckId} shuffle={shuffle} />}
      {mode === "match" && <MatchMode deckId={deckId} />}
    </div>
  );
}
