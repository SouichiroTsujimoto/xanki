import { z } from "zod";

const DAY_MS = 86_400_000;

export type ReviewGrade = 0 | 1 | 2 | 3;

export const DEFAULT_BOX_INTERVAL_DAYS = [0, 1, 3, 7, 21] as const;

export type BoxIntervalDays = [
  number,
  number,
  number,
  number,
  number,
];

export interface DeckSchedulerConfig {
  boxIntervalDays: BoxIntervalDays;
}

const boxIntervalDaySchema = z.number().int().min(0).max(365);

const deckSchedulerConfigSchema = z
  .object({
    boxIntervalDays: z.tuple([
      boxIntervalDaySchema,
      boxIntervalDaySchema,
      boxIntervalDaySchema,
      boxIntervalDaySchema,
      boxIntervalDaySchema,
    ]),
  })
  .superRefine((value, ctx) => {
    const intervals = value.boxIntervalDays;
    for (let i = 1; i < intervals.length; i += 1) {
      if (intervals[i] < intervals[i - 1]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "box intervals must be non-decreasing",
          path: ["boxIntervalDays", i],
        });
      }
    }
  });

export function defaultDeckSchedulerConfig(): DeckSchedulerConfig {
  return {
    boxIntervalDays: [...DEFAULT_BOX_INTERVAL_DAYS],
  };
}

export function parseDeckSchedulerConfig(raw: unknown): DeckSchedulerConfig | null {
  if (raw == null) return null;
  const parsed = deckSchedulerConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function resolveDeckSchedulerConfig(
  config?: DeckSchedulerConfig | null,
): DeckSchedulerConfig {
  return config ?? defaultDeckSchedulerConfig();
}

export function intervalDaysForBox(
  boxNum: number,
  config?: DeckSchedulerConfig | null,
): number {
  const resolved = resolveDeckSchedulerConfig(config);
  const index = Math.min(Math.max(boxNum, 1), 5) - 1;
  return resolved.boxIntervalDays[index];
}

export function formatReviewInterval(days: number): string {
  if (days <= 0) return "今日";
  return `${days}日後`;
}

export function previewReviewGrade(
  currentBox: number,
  grade: ReviewGrade,
  config?: DeckSchedulerConfig | null,
): { box: number; intervalDays: number } {
  const scheduler = new LeitnerScheduler(config ?? undefined);
  const box = scheduler.nextBoxFromGrade(currentBox, grade);
  const intervalDays =
    grade === 1 ? 1 : intervalDaysForBox(box, config);
  return { box, intervalDays };
}

export class LeitnerScheduler {
  private readonly config: DeckSchedulerConfig;

  constructor(config?: DeckSchedulerConfig) {
    this.config = resolveDeckSchedulerConfig(config);
  }

  static initialDueAt(nowMs: number, config?: DeckSchedulerConfig | null): number {
    const scheduler = new LeitnerScheduler(config ?? undefined);
    return scheduler.dueAtForBox(1, nowMs);
  }

  /** @deprecated Use intervalDaysForBox */
  static intervalDays(boxNum: number): number {
    return intervalDaysForBox(boxNum);
  }

  nextBox(current: number, passed: boolean): number {
    if (passed) {
      return Math.min(current + 1, 5);
    }
    return 1;
  }

  nextBoxFromGrade(current: number, grade: ReviewGrade): number {
    switch (grade) {
      case 0:
        return 1;
      case 1:
        return current;
      case 2:
        return Math.min(current + 1, 5);
      case 3:
        return Math.min(current + 2, 5);
      default: {
        const _exhaustive: never = grade;
        return _exhaustive;
      }
    }
  }

  dueAtForBox(boxNum: number, nowMs: number): number {
    return nowMs + intervalDaysForBox(boxNum, this.config) * DAY_MS;
  }

  submitReview(
    currentBox: number,
    passed: boolean,
    nowMs: number,
  ): { box: number; dueAt: number; lastResult: 0 | 1 } {
    const box = this.nextBox(currentBox, passed);
    return {
      box,
      dueAt: this.dueAtForBox(box, nowMs),
      lastResult: passed ? 1 : 0,
    };
  }

  submitReviewGrade(
    currentBox: number,
    grade: ReviewGrade,
    nowMs: number,
  ): { box: number; dueAt: number; lastResult: ReviewGrade } {
    const box = this.nextBoxFromGrade(currentBox, grade);
    const dueAt =
      grade === 1 ? nowMs + DAY_MS : this.dueAtForBox(box, nowMs);
    return {
      box,
      dueAt,
      lastResult: grade,
    };
  }
}

export const leitnerScheduler = new LeitnerScheduler();
