import { useEffect, useState } from "react";
import {
  defaultDeckSchedulerConfig,
  resolveDeckSchedulerConfig,
  type BoxIntervalDays,
  type Deck,
} from "@xanki/shared";
import { copy } from "../../copy";
import { useAppApi } from "../../context/app-api-context";
import { Button } from "../ui/button";

interface Props {
  deck: Deck;
}

function intervalsFromDeck(deck: Deck): BoxIntervalDays {
  return [...resolveDeckSchedulerConfig(deck.schedulerConfig).boxIntervalDays];
}

function isNonDecreasing(intervals: BoxIntervalDays): boolean {
  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i] < intervals[i - 1]) return false;
  }
  return true;
}

export function DeckSchedulerSettings({ deck }: Props) {
  const api = useAppApi();
  const [intervals, setIntervals] = useState<BoxIntervalDays>(() =>
    intervalsFromDeck(deck),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIntervals(intervalsFromDeck(deck));
    setError(null);
    setSaved(false);
  }, [deck.id, deck.schedulerConfig]);

  async function handleSave(nextIntervals: BoxIntervalDays) {
    if (!isNonDecreasing(nextIntervals)) {
      setError(copy.deckScheduler.invalidIntervals);
      setSaved(false);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateDeck(deck.id, {
        schedulerConfig: { boxIntervalDays: nextIntervals },
      });
      setSaved(true);
    } catch (saveError) {
      console.error("scheduler save failed", saveError);
      setError(copy.deckScheduler.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  function updateInterval(index: number, value: number) {
    const next = [...intervals] as BoxIntervalDays;
    next[index] = value;
    setIntervals(next);
    setSaved(false);
    setError(null);
  }

  return (
    <section className="deck-scheduler-settings" aria-label={copy.deckScheduler.sectionLabel}>
      <div className="deck-scheduler-settings-head">
        <h3 className="deck-scheduler-settings-title">{copy.deckScheduler.title}</h3>
        <p className="deck-scheduler-settings-copy">{copy.deckScheduler.description}</p>
      </div>
      <div className="deck-scheduler-grid">
        {intervals.map((days, index) => (
          <label key={index} className="deck-scheduler-field">
            <span>{copy.deckScheduler.boxLabel(index + 1)}</span>
            <div className="deck-scheduler-input-row">
              <input
                type="number"
                min={0}
                max={365}
                step={1}
                value={days}
                disabled={saving}
                onChange={(event) =>
                  updateInterval(index, Number.parseInt(event.target.value, 10) || 0)
                }
              />
              <span>{copy.deckScheduler.daysSuffix}</span>
            </div>
          </label>
        ))}
      </div>
      {error && <p className="deck-scheduler-error">{error}</p>}
      {saved && !error && (
        <p className="deck-scheduler-saved">{copy.deckScheduler.saved}</p>
      )}
      <div className="deck-scheduler-actions">
        <Button
          type="button"
          variant="accent"
          disabled={saving}
          onClick={() => void handleSave(intervals)}
        >
          {copy.deckScheduler.save}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            const defaults = defaultDeckSchedulerConfig().boxIntervalDays;
            setIntervals(defaults);
            void handleSave(defaults);
          }}
        >
          {copy.deckScheduler.reset}
        </Button>
      </div>
    </section>
  );
}
