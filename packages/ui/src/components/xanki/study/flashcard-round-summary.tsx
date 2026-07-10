import { motion } from "motion/react";
import { Cell, Label, Pie, PieChart } from "recharts";
import { copy } from "../../../copy";
import { tweenFast, transitionForReduced } from "../../../lib/motion-presets";
import { useReducedMotion } from "../../../lib/use-reduced-motion";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "../../ui/chart";
import { Button } from "../../ui/button";

type Props = {
  knownThisRound: number;
  stillRemaining: number;
  knownTotal: number;
  sessionTotal: number;
  onContinue: () => void;
  onRestart: () => void;
  isComplete?: boolean;
};

const chartConfig = {
  known: {
    label: copy.deckStudy.known,
    color: "var(--color-accent)",
  },
  still: {
    label: copy.deckStudy.stillAgain,
    color: "var(--color-muted-foreground)",
  },
} satisfies ChartConfig;

export function FlashcardRoundSummary({
  knownThisRound,
  stillRemaining,
  knownTotal,
  sessionTotal,
  onContinue,
  onRestart,
  isComplete = false,
}: Props) {
  const reduced = useReducedMotion();
  const chartData = [
    { key: "known", value: knownThisRound, fill: "var(--color-known)" },
    { key: "still", value: stillRemaining, fill: "var(--color-still)" },
  ].filter((d) => d.value > 0);

  // All known this round: single full ring for visual feedback on complete path
  // when used as session complete (stillRemaining === 0).
  const displayData =
    chartData.length > 0
      ? chartData
      : [{ key: "known", value: 1, fill: "var(--color-known)" }];

  return (
    <div className="review-stage empty">
      <motion.div
        className="review-complete flashcard-round-summary"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitionForReduced(reduced, tweenFast)}
      >
        <p className="eyebrow">{copy.deckStudy.emptyEyebrow}</p>
        <h2>
          {isComplete
            ? copy.deckStudy.sessionCompleteTitle
            : copy.deckStudy.roundCompleteTitle}
        </h2>
        <p>
          {isComplete
            ? copy.deckStudy.sessionCompleteCopy
            : copy.deckStudy.roundCompleteCopy(knownThisRound, stillRemaining)}
        </p>

        <div className="flashcard-round-summary-stats" aria-live="polite">
          <div className="flashcard-round-stat">
            <strong>{knownThisRound}</strong>
            <span>{copy.deckStudy.knownThisRound}</span>
          </div>
          <div className="flashcard-round-stat">
            <strong>{stillRemaining}</strong>
            <span>{copy.deckStudy.stillRemaining}</span>
          </div>
          {!isComplete ? (
            <div className="flashcard-round-stat">
              <strong>
                {knownTotal} / {sessionTotal}
              </strong>
              <span>{copy.deckStudy.knownTotal}</span>
            </div>
          ) : null}
        </div>

        <ChartContainer
          config={chartConfig}
          className="flashcard-round-chart mx-auto h-[180px] w-[180px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
            <Pie
              data={displayData}
              dataKey="value"
              nameKey="key"
              innerRadius={48}
              outerRadius={72}
              strokeWidth={2}
            >
              {displayData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const total = knownThisRound + stillRemaining;
                    const pct =
                      total > 0
                        ? Math.round((knownThisRound / total) * 100)
                        : 100;
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          fill="var(--color-foreground)"
                          fontSize="22"
                          fontWeight="600"
                        >
                          {pct}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 18}
                          fill="var(--color-muted-foreground)"
                          fontSize="11"
                        >
                          {copy.deckStudy.known}
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="flashcard-round-summary-actions">
          {isComplete ? (
            <Button type="button" variant="accent" onClick={onRestart}>
              {copy.deckStudy.sessionRestart}
            </Button>
          ) : (
            <Button type="button" variant="accent" onClick={onContinue}>
              {copy.deckStudy.nextRound}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
