import { useEffect, useState } from "react";
import {
  defaultDeckSchedulerConfig,
  parseDeckSchedulerConfig,
  resolveDeckSchedulerConfig,
  type Deck,
  type DeckSchedulerConfig,
  type ReviewIntervals,
  type StudyInterval,
  type StudyIntervalUnit,
} from "@xanki/shared";
import { copy } from "../../copy";
import { useAppApi } from "../../context/app-api-context";
import { Button } from "../ui/button";

interface Props {
  deck: Deck;
  onSaved?: () => void | Promise<void>;
}

const UNITS: StudyIntervalUnit[] = ["minute", "hour", "day"];

function configFromDeck(deck: Deck): DeckSchedulerConfig {
  return resolveDeckSchedulerConfig(deck.schedulerConfig);
}

function unitLabel(unit: StudyIntervalUnit): string {
  switch (unit) {
    case "minute":
      return copy.deckScheduler.unitMinute;
    case "hour":
      return copy.deckScheduler.unitHour;
    case "day":
      return copy.deckScheduler.unitDay;
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

function IntervalField({
  label,
  interval,
  disabled,
  onChange,
}: {
  label: string;
  interval: StudyInterval;
  disabled?: boolean;
  onChange: (next: StudyInterval) => void;
}) {
  return (
    <label className="deck-scheduler-field">
      <span>{label}</span>
      <div className="deck-scheduler-input-row">
        <input
          type="number"
          min={0}
          max={365}
          step={1}
          value={interval.amount}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...interval,
              amount: Number.parseInt(event.target.value, 10) || 0,
            })
          }
        />
        <select
          value={interval.unit}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...interval,
              unit: event.target.value as StudyIntervalUnit,
            })
          }
        >
          {UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unitLabel(unit)}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function StepListEditor({
  title,
  steps,
  disabled,
  onChange,
}: {
  title: string;
  steps: StudyInterval[];
  disabled?: boolean;
  onChange: (next: StudyInterval[]) => void;
}) {
  return (
    <div className="deck-scheduler-subsection">
      <div className="deck-scheduler-subsection-head">
        <h4>{title}</h4>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled || steps.length >= 10}
          onClick={() => onChange([...steps, { amount: 1, unit: "minute" }])}
        >
          {copy.deckScheduler.addStep}
        </Button>
      </div>
      <div className="deck-scheduler-grid">
        {steps.map((step, index) => (
          <div key={index} className="deck-scheduler-step-row">
            <IntervalField
              label={copy.deckScheduler.stepLabel(index + 1)}
              interval={step}
              disabled={disabled}
              onChange={(next) => {
                const updated = [...steps];
                updated[index] = next;
                onChange(updated);
              }}
            />
            <Button
              type="button"
              variant="text"
              disabled={disabled || steps.length <= 1}
              onClick={() => onChange(steps.filter((_, i) => i !== index))}
            >
              {copy.deckScheduler.removeStep}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeckSchedulerSettings({ deck, onSaved }: Props) {
  const api = useAppApi();
  const [config, setConfig] = useState<DeckSchedulerConfig>(() => configFromDeck(deck));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(configFromDeck(deck));
    setError(null);
    setSaved(false);
  }, [deck.id, deck.schedulerConfig]);

  async function handleSave(nextConfig: DeckSchedulerConfig) {
    if (!parseDeckSchedulerConfig(nextConfig)) {
      setError(copy.deckScheduler.invalidConfig);
      setSaved(false);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateDeck(deck.id, { schedulerConfig: nextConfig });
      setSaved(true);
      await onSaved?.();
    } catch (saveError) {
      console.error("scheduler save failed", saveError);
      setError(copy.deckScheduler.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  function updateReviewInterval(index: number, interval: StudyInterval) {
    const next = [...config.reviewIntervals] as ReviewIntervals;
    next[index] = interval;
    setConfig({ ...config, reviewIntervals: next });
    setSaved(false);
    setError(null);
  }

  return (
    <section className="deck-scheduler-settings" aria-label={copy.deckScheduler.sectionLabel}>
      <div className="deck-scheduler-settings-head">
        <h3 className="deck-scheduler-settings-title">{copy.deckScheduler.title}</h3>
        <p className="deck-scheduler-settings-copy">{copy.deckScheduler.description}</p>
      </div>

      <StepListEditor
        title={copy.deckScheduler.learningStepsTitle}
        steps={config.learningSteps}
        disabled={saving}
        onChange={(learningSteps) => setConfig({ ...config, learningSteps })}
      />

      <StepListEditor
        title={copy.deckScheduler.relearningStepsTitle}
        steps={config.relearningSteps}
        disabled={saving}
        onChange={(relearningSteps) => setConfig({ ...config, relearningSteps })}
      />

      <div className="deck-scheduler-subsection">
        <h4>{copy.deckScheduler.reviewIntervalsTitle}</h4>
        <div className="deck-scheduler-grid">
          {config.reviewIntervals.map((interval, index) => (
            <IntervalField
              key={index}
              label={copy.deckScheduler.boxLabel(index + 2)}
              interval={interval}
              disabled={saving}
              onChange={(next) => updateReviewInterval(index, next)}
            />
          ))}
        </div>
      </div>

      <div className="deck-scheduler-subsection">
        <h4>{copy.deckScheduler.singleIntervalsTitle}</h4>
        <div className="deck-scheduler-grid">
          <IntervalField
            label={copy.deckScheduler.hardIntervalLabel}
            interval={config.hardInterval}
            disabled={saving}
            onChange={(hardInterval) => setConfig({ ...config, hardInterval })}
          />
          <IntervalField
            label={copy.deckScheduler.graduatingIntervalLabel}
            interval={config.graduatingInterval}
            disabled={saving}
            onChange={(graduatingInterval) => setConfig({ ...config, graduatingInterval })}
          />
          <IntervalField
            label={copy.deckScheduler.easyIntervalLabel}
            interval={config.easyInterval}
            disabled={saving}
            onChange={(easyInterval) => setConfig({ ...config, easyInterval })}
          />
        </div>
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
          onClick={() => void handleSave(config)}
        >
          {copy.deckScheduler.save}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            const defaults = defaultDeckSchedulerConfig();
            setConfig(defaults);
            void handleSave(defaults);
          }}
        >
          {copy.deckScheduler.reset}
        </Button>
      </div>
    </section>
  );
}
