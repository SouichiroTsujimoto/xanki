import { useEffect, useState } from "react";
import { api } from "../../lib/tauri/api";
import { extractMaskAnswers, shuffleArray } from "../../lib/maskAnswers";
import { StudyEmpty } from "./shared";

interface Props {
  deckId?: string | null;
}

interface MatchTile {
  id: string;
  text: string;
  pairId: string;
  side: "prompt" | "answer";
}

export function MatchMode({ deckId }: Props) {
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      const cards = await api.listCards(deckId ?? undefined);
      const answers = extractMaskAnswers(cards).slice(0, 6);
      const built: MatchTile[] = [];
      answers.forEach((a, i) => {
        const pairId = `p-${i}`;
        built.push({
          id: `${pairId}-prompt`,
          text: a.prompt.slice(0, 60),
          pairId,
          side: "prompt",
        });
        built.push({
          id: `${pairId}-answer`,
          text: a.answer,
          pairId,
          side: "answer",
        });
      });
      setTiles(shuffleArray(built));
      setSelected(null);
      setMatched(new Set());
      setWrong(null);
    }
    void load();
  }, [deckId, reloadKey]);

  function handlePick(id: string) {
    if (matched.has(id)) return;

    if (!selected) {
      setSelected(id);
      return;
    }

    if (selected === id) {
      setSelected(null);
      return;
    }

    const first = tiles.find((t) => t.id === selected);
    const second = tiles.find((t) => t.id === id);
    if (!first || !second) return;

    if (
      first.pairId === second.pairId &&
      first.side !== second.side
    ) {
      setMatched((prev) => new Set([...prev, first.id, second.id]));
      setSelected(null);
      setWrong(null);
    } else {
      setWrong(id);
      window.setTimeout(() => {
        setSelected(null);
        setWrong(null);
      }, 600);
    }
  }

  const totalPairs = tiles.length / 2;
  const matchedPairs = matched.size / 2;
  const complete = tiles.length > 0 && matchedPairs >= totalPairs && totalPairs > 0;

  if (tiles.length === 0) {
    return (
      <StudyEmpty
        title="マッチ問題がありません"
        copy="マスク付きカードが1枚以上必要です。"
      />
    );
  }

  if (complete) {
    return (
      <div className="review-stage empty">
        <div className="review-complete">
          <p className="eyebrow">Match</p>
          <h2>すべて一致しました!</h2>
          <button
            type="button"
            className="accent-button"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            もう一度
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-stage match-mode">
      <p className="review-hint study-hint">
        問題と答えのペアを選んでください · {matchedPairs}/{totalPairs}
      </p>
      <div className="match-grid">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className={`match-tile ${tile.side} ${
              matched.has(tile.id) ? "matched" : ""
            } ${selected === tile.id ? "selected" : ""} ${
              wrong === tile.id ? "wrong" : ""
            }`}
            onClick={() => handlePick(tile.id)}
            disabled={matched.has(tile.id)}
          >
            {tile.text}
          </button>
        ))}
      </div>
    </div>
  );
}
