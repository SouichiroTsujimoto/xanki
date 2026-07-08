import { z } from "zod";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export type ReviewGrade = 0 | 1 | 2 | 3;
export type StudyIntervalUnit = "minute" | "hour" | "day";
export type ReviewPhase = "learning" | "review" | "relearning";

export interface StudyInterval {
  amount: number;
  unit: StudyIntervalUnit;
}

export type ReviewIntervals = [
  StudyInterval,
  StudyInterval,
  StudyInterval,
  StudyInterval,
];

export interface DeckSchedulerConfig {
  learningSteps: StudyInterval[];
  relearningSteps: StudyInterval[];
  reviewIntervals: ReviewIntervals;
  hardInterval: StudyInterval;
  graduatingInterval: StudyInterval;
  easyInterval: StudyInterval;
}

export interface ReviewStateSnapshot {
  phase: ReviewPhase;
  step: number;
  box: number;
}

export interface ReviewGradeResult extends ReviewStateSnapshot {
  dueAt: number;
  lastResult: ReviewGrade;
}

/** @deprecated v1 config field */
export const DEFAULT_BOX_INTERVAL_DAYS = [0, 1, 3, 7, 21] as const;

/** @deprecated v1 config type */
export type BoxIntervalDays = [
  number,
  number,
  number,
  number,
  number,
];

const DEFAULT_LEARNING_STEPS: StudyInterval[] = [
  { amount: 1, unit: "minute" },
  { amount: 10, unit: "minute" },
];

const DEFAULT_RELEARNING_STEPS: StudyInterval[] = [{ amount: 10, unit: "minute" }];

const DEFAULT_REVIEW_INTERVALS: ReviewIntervals = [
  { amount: 1, unit: "day" },
  { amount: 3, unit: "day" },
  { amount: 7, unit: "day" },
  { amount: 21, unit: "day" },
];

const studyIntervalSchema = z.object({
  amount: z.number().int().min(0).max(365),
  unit: z.enum(["minute", "hour", "day"]),
});

const deckSchedulerConfigV2Schema = z.object({
  learningSteps: z.array(studyIntervalSchema).min(1).max(10),
  relearningSteps: z.array(studyIntervalSchema).min(1).max(10),
  reviewIntervals: z.tuple([
    studyIntervalSchema,
    studyIntervalSchema,
    studyIntervalSchema,
    studyIntervalSchema,
  ]),
  hardInterval: studyIntervalSchema,
  graduatingInterval: studyIntervalSchema,
  easyInterval: studyIntervalSchema,
});

const boxIntervalDaySchema = z.number().int().min(0).max(365);

export function defaultDeckSchedulerConfig(): DeckSchedulerConfig {
  return {
    learningSteps: DEFAULT_LEARNING_STEPS.map((step) => ({ ...step })),
    relearningSteps: DEFAULT_RELEARNING_STEPS.map((step) => ({ ...step })),
    reviewIntervals: DEFAULT_REVIEW_INTERVALS.map((step) => ({ ...step })) as ReviewIntervals,
    hardInterval: { amount: 1, unit: "day" },
    graduatingInterval: { amount: 1, unit: "day" },
    easyInterval: { amount: 4, unit: "day" },
  };
}

function migrateV1BoxDaysToV2(days: BoxIntervalDays): DeckSchedulerConfig {
  const defaults = defaultDeckSchedulerConfig();
  const learningSteps =
    days[0] > 0
      ? [{ amount: days[0], unit: "day" as const }]
      : defaults.learningSteps;
  return {
    learningSteps,
    relearningSteps: defaults.relearningSteps,
    reviewIntervals: [
      { amount: days[1], unit: "day" },
      { amount: days[2], unit: "day" },
      { amount: days[3], unit: "day" },
      { amount: days[4], unit: "day" },
    ],
    hardInterval: { amount: 1, unit: "day" },
    graduatingInterval: { amount: days[1], unit: "day" },
    easyInterval: { amount: Math.max(days[2], 1), unit: "day" },
  };
}

export function parseDeckSchedulerConfig(raw: unknown): DeckSchedulerConfig | null {
  if (raw == null) return null;

  if (typeof raw === "object" && raw !== null && "boxIntervalDays" in raw) {
    const parsedDays = z
      .tuple([
        boxIntervalDaySchema,
        boxIntervalDaySchema,
        boxIntervalDaySchema,
        boxIntervalDaySchema,
        boxIntervalDaySchema,
      ])
      .safeParse((raw as { boxIntervalDays: unknown }).boxIntervalDays);
    if (!parsedDays.success) return null;
    return migrateV1BoxDaysToV2(parsedDays.data);
  }

  const parsed = deckSchedulerConfigV2Schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function resolveDeckSchedulerConfig(
  config?: DeckSchedulerConfig | null,
): DeckSchedulerConfig {
  return config ?? defaultDeckSchedulerConfig();
}

export function intervalToMs(interval: StudyInterval): number {
  switch (interval.unit) {
    case "minute":
      return interval.amount * MINUTE_MS;
    case "hour":
      return interval.amount * HOUR_MS;
    case "day":
      return interval.amount * DAY_MS;
    default: {
      const _exhaustive: never = interval.unit;
      return _exhaustive;
    }
  }
}

export function dueAtFromInterval(nowMs: number, interval: StudyInterval): number {
  return nowMs + intervalToMs(interval);
}

export function formatStudyIntervalFromNow(untilMs: number, nowMs: number): string {
  const delta = Math.max(0, untilMs - nowMs);
  if (delta < MINUTE_MS) return "今すぐ";
  if (delta < HOUR_MS) {
    const minutes = Math.max(1, Math.round(delta / MINUTE_MS));
    return `${minutes}分後`;
  }
  if (delta < DAY_MS) {
    const hours = Math.max(1, Math.round(delta / HOUR_MS));
    return `${hours}時間後`;
  }
  const days = Math.max(1, Math.round(delta / DAY_MS));
  return `${days}日後`;
}

/** @deprecated Use formatStudyIntervalFromNow */
export function formatReviewInterval(days: number): string {
  if (days <= 0) return "今すぐ";
  return `${days}日後`;
}

function reviewIntervalForBox(box: number, config: DeckSchedulerConfig): StudyInterval {
  const index = Math.min(Math.max(box, 2), 5) - 2;
  return config.reviewIntervals[index];
}

function midpointMs(a: number, b: number): number {
  return Math.round((a + b) / 2);
}

function learningHardDueAt(
  nowMs: number,
  steps: StudyInterval[],
  step: number,
  fallback: StudyInterval,
): number {
  const current = intervalToMs(steps[step] ?? steps[steps.length - 1]);
  const next =
    step + 1 < steps.length
      ? intervalToMs(steps[step + 1])
      : intervalToMs(fallback);
  return nowMs + midpointMs(current, next);
}

function graduateToReview(
  nowMs: number,
  interval: StudyInterval,
): ReviewGradeResult {
  return {
    phase: "review",
    step: 0,
    box: 2,
    dueAt: dueAtFromInterval(nowMs, interval),
    lastResult: 2,
  };
}

function finishRelearningToReview(
  nowMs: number,
  box: number,
  interval: StudyInterval,
  grade: ReviewGrade,
): ReviewGradeResult {
  return {
    phase: "review",
    step: 0,
    box,
    dueAt: dueAtFromInterval(nowMs, interval),
    lastResult: grade,
  };
}

export function submitReviewGrade(
  state: ReviewStateSnapshot,
  grade: ReviewGrade,
  nowMs: number,
  config?: DeckSchedulerConfig | null,
): ReviewGradeResult {
  const resolved = resolveDeckSchedulerConfig(config);

  switch (state.phase) {
    case "learning":
      return submitLearningGrade(state, grade, nowMs, resolved);
    case "review":
      return submitReviewPhaseGrade(state, grade, nowMs, resolved);
    case "relearning":
      return submitRelearningGrade(state, grade, nowMs, resolved);
    default: {
      const _exhaustive: never = state.phase;
      return _exhaustive;
    }
  }
}

function submitLearningGrade(
  state: ReviewStateSnapshot,
  grade: ReviewGrade,
  nowMs: number,
  config: DeckSchedulerConfig,
): ReviewGradeResult {
  const steps = config.learningSteps;

  switch (grade) {
    case 0:
      return {
        phase: "learning",
        step: 0,
        box: 1,
        dueAt: dueAtFromInterval(nowMs, steps[0]),
        lastResult: grade,
      };
    case 1:
      return {
        phase: "learning",
        step: state.step,
        box: 1,
        dueAt: learningHardDueAt(nowMs, steps, state.step, config.graduatingInterval),
        lastResult: grade,
      };
    case 2: {
      const nextStep = state.step + 1;
      if (nextStep >= steps.length) {
        return {
          ...graduateToReview(nowMs, config.graduatingInterval),
          lastResult: grade,
        };
      }
      return {
        phase: "learning",
        step: nextStep,
        box: 1,
        dueAt: dueAtFromInterval(nowMs, steps[nextStep]),
        lastResult: grade,
      };
    }
    case 3:
      return {
        ...graduateToReview(nowMs, config.easyInterval),
        lastResult: grade,
      };
    default: {
      const _exhaustive: never = grade;
      return _exhaustive;
    }
  }
}

function submitReviewPhaseGrade(
  state: ReviewStateSnapshot,
  grade: ReviewGrade,
  nowMs: number,
  config: DeckSchedulerConfig,
): ReviewGradeResult {
  switch (grade) {
    case 0:
      return {
        phase: "relearning",
        step: 0,
        box: state.box,
        dueAt: dueAtFromInterval(nowMs, config.relearningSteps[0]),
        lastResult: grade,
      };
    case 1:
      return {
        phase: "review",
        step: 0,
        box: state.box,
        dueAt: dueAtFromInterval(nowMs, config.hardInterval),
        lastResult: grade,
      };
    case 2: {
      const nextBox = Math.min(state.box + 1, 5);
      return {
        phase: "review",
        step: 0,
        box: nextBox,
        dueAt: dueAtFromInterval(nowMs, reviewIntervalForBox(nextBox, config)),
        lastResult: grade,
      };
    }
    case 3: {
      const nextBox = Math.min(state.box + 2, 5);
      return {
        phase: "review",
        step: 0,
        box: nextBox,
        dueAt: dueAtFromInterval(nowMs, reviewIntervalForBox(nextBox, config)),
        lastResult: grade,
      };
    }
    default: {
      const _exhaustive: never = grade;
      return _exhaustive;
    }
  }
}

function submitRelearningGrade(
  state: ReviewStateSnapshot,
  grade: ReviewGrade,
  nowMs: number,
  config: DeckSchedulerConfig,
): ReviewGradeResult {
  const steps = config.relearningSteps;
  const returnBox = state.box;

  switch (grade) {
    case 0:
      return {
        phase: "relearning",
        step: 0,
        box: returnBox,
        dueAt: dueAtFromInterval(nowMs, steps[0]),
        lastResult: grade,
      };
    case 1:
      return {
        phase: "relearning",
        step: state.step,
        box: returnBox,
        dueAt:
          state.step + 1 < steps.length
            ? learningHardDueAt(nowMs, steps, state.step, config.hardInterval)
            : dueAtFromInterval(nowMs, config.hardInterval),
        lastResult: grade,
      };
    case 2: {
      const nextStep = state.step + 1;
      if (nextStep >= steps.length) {
        return finishRelearningToReview(
          nowMs,
          returnBox,
          reviewIntervalForBox(returnBox, config),
          grade,
        );
      }
      return {
        phase: "relearning",
        step: nextStep,
        box: returnBox,
        dueAt: dueAtFromInterval(nowMs, steps[nextStep]),
        lastResult: grade,
      };
    }
    case 3:
      return finishRelearningToReview(nowMs, returnBox, config.easyInterval, grade);
    default: {
      const _exhaustive: never = grade;
      return _exhaustive;
    }
  }
}

export function previewReviewGrade(
  state: ReviewStateSnapshot,
  grade: ReviewGrade,
  config?: DeckSchedulerConfig | null,
  nowMs: number = Date.now(),
): { label: string; dueAt: number; phase: ReviewPhase; step: number; box: number } {
  const next = submitReviewGrade(state, grade, nowMs, config);
  return {
    label: formatStudyIntervalFromNow(next.dueAt, nowMs),
    dueAt: next.dueAt,
    phase: next.phase,
    step: next.step,
    box: next.box,
  };
}

export function initialReviewState(nowMs: number): ReviewGradeResult {
  return {
    phase: "learning",
    step: 0,
    box: 1,
    dueAt: nowMs,
    lastResult: 0,
  };
}

export function normalizeReviewState(
  partial: Partial<ReviewStateSnapshot> & { box?: number },
): ReviewStateSnapshot {
  return {
    phase: partial.phase ?? "review",
    step: partial.step ?? 0,
    box: partial.box ?? 1,
  };
}

/** @deprecated Legacy box-only scheduler. Use submitReviewGrade instead. */
export class LeitnerScheduler {
  submitReviewGrade(
    currentBox: number,
    grade: ReviewGrade,
    nowMs: number,
  ): { box: number; dueAt: number; lastResult: ReviewGrade } {
    const state: ReviewStateSnapshot = {
      phase: "review",
      step: 0,
      box: currentBox,
    };
    const next = submitReviewGrade(state, grade, nowMs);
    return {
      box: next.box,
      dueAt: next.dueAt,
      lastResult: next.lastResult,
    };
  }
}

export const leitnerScheduler = new LeitnerScheduler();

/** @deprecated Use intervalToMs + reviewIntervals */
export function intervalDaysForBox(
  boxNum: number,
  config?: DeckSchedulerConfig | null,
): number {
  const resolved = resolveDeckSchedulerConfig(config);
  return reviewIntervalForBox(Math.max(boxNum, 2), resolved).amount;
}
