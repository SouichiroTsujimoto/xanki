import { useEffect, useMemo, useRef, useState } from "react";
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

function deckSchedulerConfigKey(deck: Deck): string {
  return JSON.stringify(configFromDeck(deck));
}

function maxAmountForUnit(unit: StudyIntervalUnit): number {
  switch (unit) {
    case "minute":
      return 120;
    case "hour":
      return 168;
    case "day":
      return 365;
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

function clampAmount(amount: number, unit: StudyIntervalUnit): number {
  return Math.min(Math.max(0, amount), maxAmountForUnit(unit));
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

function formatIntervalAmount(amount: number, unit: StudyIntervalUnit): string {
  if (amount <= 0) return copy.deckScheduler.immediateInterval;
  return `${amount}${unitLabel(unit)}`;
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
  const amount = clampAmount(interval.amount, interval.unit);
  const max = maxAmountForUnit(interval.unit);

  return (
    <label className="deck-scheduler-field">
      <div className="deck-scheduler-field-head">
        <span>{label}</span>
        <span className="deck-scheduler-field-value">
          {formatIntervalAmount(amount, interval.unit)}
        </span>
      </div>
      <div className="deck-scheduler-input-row">
        <input
          type="range"
          className="deck-scheduler-range"
          min={0}
          max={max}
          step={1}
          value={amount}
          disabled={disabled}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={amount}
          aria-valuetext={formatIntervalAmount(amount, interval.unit)}
          onChange={(event) =>
            onChange({
              ...interval,
              amount: Number.parseInt(event.target.value, 10),
            })
          }
        />
        <select
          value={interval.unit}
          disabled={disabled}
          aria-label={`${label} の単位`}
          onChange={(event) => {
            const unit = event.target.value as StudyIntervalUnit;
            onChange({
              unit,
              amount: clampAmount(interval.amount, unit),
            });
          }}
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
  const [isDirty, setIsDirty] = useState(false);
  const prevDeckIdRef = useRef(deck.id);
  const prevConfigKeyRef = useRef(deckSchedulerConfigKey(deck));
  const pendingSavedConfigKeyRef = useRef<string | null>(null);
  const configKey = useMemo(
    () => deckSchedulerConfigKey(deck),
    [deck.id, JSON.stringify(deck.schedulerConfig ?? null)],
  );

  useEffect(() => {
    const deckChanged = prevDeckIdRef.current !== deck.id;
    if (!deckChanged && isDirty) return;
    if (
      !deckChanged &&
      pendingSavedConfigKeyRef.current !== null &&
      configKey !== pendingSavedConfigKeyRef.current
    ) {
      return;
    }
    if (
      !deckChanged &&
      pendingSavedConfigKeyRef.current !== null &&
      configKey === pendingSavedConfigKeyRef.current
    ) {
      pendingSavedConfigKeyRef.current = null;
      prevConfigKeyRef.current = configKey;
      return;
    }
    if (!deckChanged && prevConfigKeyRef.current === configKey) return;

    setConfig(JSON.parse(configKey) as DeckSchedulerConfig);
    setError(null);
    setSaved(false);
    setIsDirty(false);
    prevDeckIdRef.current = deck.id;
    prevConfigKeyRef.current = configKey;
  }, [configKey, deck.id, isDirty]);

  function markDirty() {
    pendingSavedConfigKeyRef.current = null;
    setIsDirty(true);
    setSaved(false);
    setError(null);
  }

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
      const savedKey = JSON.stringify(nextConfig);
      setSaved(true);
      setIsDirty(false);
      prevConfigKeyRef.current = savedKey;
      pendingSavedConfigKeyRef.current = savedKey;
    } catch (saveError) {
      console.error("scheduler save failed", saveError);
      setError(copy.deckScheduler.saveFailed);
      return;
    } finally {
      setSaving(false);
    }

    try {
      await onSaved?.();
    } catch (refreshError) {
      console.error("scheduler refresh failed", refreshError);
    }
  }

  function updateReviewInterval(index: number, interval: StudyInterval) {
    const next = [...config.reviewIntervals] as ReviewIntervals;
    next[index] = interval;
    setConfig({ ...config, reviewIntervals: next });
    markDirty();
  }

  return (
    <details className="deck-scheduler-settings" aria-label={copy.deckScheduler.sectionLabel}>
      <summary className="deck-scheduler-settings-summary">
        <span className="deck-scheduler-settings-summary-text">
          <span className="deck-scheduler-settings-title">{copy.deckScheduler.title}</span>
          <span className="deck-scheduler-settings-copy">{copy.deckScheduler.description}</span>
        </span>
      </summary>

      <div className="deck-scheduler-settings-body">
        <StepListEditor
          title={copy.deckScheduler.learningStepsTitle}
          steps={config.learningSteps}
          disabled={saving}
          onChange={(learningSteps) => {
            setConfig({ ...config, learningSteps });
            markDirty();
          }}
        />

        <StepListEditor
          title={copy.deckScheduler.relearningStepsTitle}
          steps={config.relearningSteps}
          disabled={saving}
          onChange={(relearningSteps) => {
            setConfig({ ...config, relearningSteps });
            markDirty();
          }}
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
              onChange={(hardInterval) => {
                setConfig({ ...config, hardInterval });
                markDirty();
              }}
            />
            <IntervalField
              label={copy.deckScheduler.graduatingIntervalLabel}
              interval={config.graduatingInterval}
              disabled={saving}
              onChange={(graduatingInterval) => {
                setConfig({ ...config, graduatingInterval });
                markDirty();
              }}
            />
            <IntervalField
              label={copy.deckScheduler.easyIntervalLabel}
              interval={config.easyInterval}
              disabled={saving}
              onChange={(easyInterval) => {
                setConfig({ ...config, easyInterval });
                markDirty();
              }}
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
      </div>
    </details>
  );
}
