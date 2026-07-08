import { useEffect, useState } from "react";
import {
  defaultDeckSchedulerConfig,
  parseDeckSchedulerConfig,
  type DeckSchedulerConfig,
  type ReviewIntervals,
  type StudyInterval,
  type StudyIntervalUnit,
} from "@xanki/shared";
import { copy } from "../../copy";
import { useAppApi } from "../../context/app-api-context";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Slider } from "../ui/slider";

const UNITS: StudyIntervalUnit[] = ["minute", "hour", "day"];

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
    <div className="deck-scheduler-field">
      <div className="deck-scheduler-field-head">
        <Label className="font-normal">{label}</Label>
        <span className="deck-scheduler-field-value">
          {formatIntervalAmount(amount, interval.unit)}
        </span>
      </div>
      <div className="deck-scheduler-input-row">
        <Slider
          className="deck-scheduler-slider"
          min={0}
          max={max}
          step={1}
          value={[amount]}
          disabled={disabled}
          aria-label={label}
          onValueChange={([next]) =>
            onChange({
              ...interval,
              amount: next,
            })
          }
        />
        <Select
          value={interval.unit}
          disabled={disabled}
          onValueChange={(unit) =>
            onChange({
              unit: unit as StudyIntervalUnit,
              amount: clampAmount(interval.amount, unit as StudyIntervalUnit),
            })
          }
        >
          <SelectTrigger
            className="deck-scheduler-unit-select"
            size="sm"
            aria-label={`${label} の単位`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {unitLabel(unit)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
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
          <div key={`${title}-${index + 1}`} className="deck-scheduler-step-row">
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

export function SchedulerSettings() {
  const api = useAppApi();
  const [config, setConfig] = useState<DeckSchedulerConfig>(() =>
    defaultDeckSchedulerConfig(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      setLoading(true);
      setError(null);
      try {
        const next = await api.getSchedulerConfig();
        if (!cancelled) {
          setConfig(next);
          setIsDirty(false);
        }
      } catch (loadError) {
        console.error("scheduler load failed", loadError);
        if (!cancelled) {
          setError(copy.deckScheduler.saveFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, [api]);

  function markDirty() {
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
      const savedConfig = await api.updateSchedulerConfig(nextConfig);
      setConfig(savedConfig);
      setSaved(true);
      setIsDirty(false);
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
    markDirty();
  }

  if (loading) {
    return <p className="settings-note">{copy.deckScheduler.loading}</p>;
  }

  return (
    <section className="scheduler-settings" aria-label={copy.deckScheduler.sectionLabel}>
      <p className="deck-scheduler-settings-copy">{copy.deckScheduler.description}</p>

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
              key={`box-${index + 2}`}
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
      {saved && !error && <p className="deck-scheduler-saved">{copy.deckScheduler.saved}</p>}
      <div className="deck-scheduler-actions">
        <Button
          type="button"
          variant="accent"
          disabled={saving || !isDirty}
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
