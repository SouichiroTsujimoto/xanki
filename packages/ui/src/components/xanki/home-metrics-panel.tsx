import type { StudyMetrics } from "@xanki/shared";
import { copy } from "../../copy";

const BOX_KEYS = [1, 2, 3, 4, 5] as const;

interface Props {
  metrics: StudyMetrics | null;
  loading: boolean;
  deckName?: string | null;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="home-metrics-stat">
      <span className="home-metrics-stat-label">{label}</span>
      <strong className="home-metrics-stat-value">{value}</strong>
      {hint ? <span className="home-metrics-stat-hint">{hint}</span> : null}
    </div>
  );
}

function MasteryBar({ percent }: { percent: number }) {
  return (
    <div
      className="home-metrics-mastery-bar"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={copy.home.metrics.masteryLabel}
    >
      <span className="home-metrics-mastery-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

function BoxDistribution({
  distribution,
  total,
}: {
  distribution: StudyMetrics["global"]["boxDistribution"];
  total: number;
}) {
  if (total === 0) {
    return <p className="home-metrics-empty">{copy.home.metrics.noCards}</p>;
  }

  return (
    <div className="home-metrics-boxes">
      <div
        className="home-metrics-box-stack"
        aria-label={copy.home.metrics.boxDistributionLabel}
      >
        {BOX_KEYS.map((box) => {
          const count = distribution[box];
          const width = total > 0 ? (count / total) * 100 : 0;
          return (
            <span
              key={box}
              className={`home-metrics-box-segment box-${box}`}
              style={{ width: `${width}%` }}
              title={`Box ${box}: ${count}`}
            />
          );
        })}
      </div>
      <ul className="home-metrics-box-legend">
        {BOX_KEYS.map((box) => (
          <li key={box}>
            <span className={`home-metrics-box-dot box-${box}`} aria-hidden />
            Box {box}
            <strong>{distribution[box]}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeMetricsPanel({ metrics, loading, deckName }: Props) {
  if (loading) {
    return (
      <section className="home-metrics" aria-label={copy.home.metrics.sectionLabel}>
        <p className="home-metrics-loading">{copy.home.metrics.loading}</p>
      </section>
    );
  }

  if (!metrics) {
    return null;
  }

  const { activity, global, deck } = metrics;

  return (
    <section className="home-metrics" aria-label={copy.home.metrics.sectionLabel}>
      <div className="home-metrics-summary">
        <p className="eyebrow home-metrics-eyebrow">{copy.home.metrics.summaryEyebrow}</p>
        <div className="home-metrics-stat-grid">
          <StatCard
            label={copy.home.metrics.todayStudy}
            value={copy.home.metrics.countValue(activity.todayStudyCount)}
            hint={copy.home.metrics.todayStudyHint(
              activity.todayLeitnerCount,
              activity.todayDeckStudyCount,
            )}
          />
          <StatCard
            label={copy.home.metrics.streak}
            value={copy.home.metrics.streakValue(activity.streakDays)}
          />
          <StatCard
            label={copy.home.metrics.globalMastery}
            value={copy.home.metrics.percentValue(global.masteryPercent)}
          />
        </div>
      </div>

      {deckName && deck && deck.cardCount > 0 ? (
        <div className="home-metrics-deck">
          <div className="home-metrics-deck-head">
            <div>
              <p className="eyebrow">{copy.home.metrics.deckEyebrow}</p>
              <h3 className="home-metrics-deck-title">{deckName}</h3>
            </div>
            <div className="home-metrics-deck-stats">
              <span>{copy.home.metrics.percentValue(deck.masteryPercent)}</span>
              {deck.dueCount > 0 ? (
                <span className="home-spotlight-due">
                  {copy.home.metrics.deckDue(deck.dueCount)}
                </span>
              ) : null}
            </div>
          </div>
          <MasteryBar percent={deck.masteryPercent} />
          <BoxDistribution distribution={deck.boxDistribution} total={deck.cardCount} />
        </div>
      ) : deckName ? (
        <div className="home-metrics-deck home-metrics-deck-empty">
          <p className="home-metrics-empty">{copy.home.metrics.deckEmpty}</p>
        </div>
      ) : null}

      {global.totalCards > 0 ? (
        <div className="home-metrics-global-boxes">
          <p className="home-metrics-subheading">{copy.home.metrics.globalBoxHeading}</p>
          <BoxDistribution distribution={global.boxDistribution} total={global.totalCards} />
        </div>
      ) : null}
    </section>
  );
}
