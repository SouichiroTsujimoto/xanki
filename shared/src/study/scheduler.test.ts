import { describe, expect, it } from "vitest";
import {
  defaultDeckSchedulerConfig,
  formatReviewInterval,
  intervalDaysForBox,
  LeitnerScheduler,
  parseDeckSchedulerConfig,
  previewReviewGrade,
} from "./scheduler.js";

describe("formatReviewInterval", () => {
  it("formats zero as today", () => {
    expect(formatReviewInterval(0)).toBe("今日");
  });

  it("formats positive days", () => {
    expect(formatReviewInterval(1)).toBe("1日後");
    expect(formatReviewInterval(21)).toBe("21日後");
  });
});

describe("parseDeckSchedulerConfig", () => {
  it("accepts valid non-decreasing intervals", () => {
    expect(
      parseDeckSchedulerConfig({
        boxIntervalDays: [0, 1, 3, 7, 21],
      }),
    ).toEqual({ boxIntervalDays: [0, 1, 3, 7, 21] });
  });

  it("rejects decreasing intervals", () => {
    expect(
      parseDeckSchedulerConfig({
        boxIntervalDays: [0, 5, 3, 7, 21],
      }),
    ).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseDeckSchedulerConfig({ boxIntervalDays: [0, 1] })).toBeNull();
    expect(parseDeckSchedulerConfig("bad")).toBeNull();
  });
});

describe("LeitnerScheduler with custom config", () => {
  const custom = {
    boxIntervalDays: [0, 2, 4, 10, 30] as const,
  };

  it("uses custom box intervals", () => {
    expect(intervalDaysForBox(5, custom)).toBe(30);
    const scheduler = new LeitnerScheduler(custom);
    expect(scheduler.dueAtForBox(5, 1_000)).toBe(1_000 + 30 * 86_400_000);
  });

  it("matches default spec outcomes", () => {
    const scheduler = new LeitnerScheduler();
    expect(scheduler.submitReviewGrade(3, 2, 0)).toEqual({
      box: 4,
      dueAt: 7 * 86_400_000,
      lastResult: 2,
    });
    expect(scheduler.submitReviewGrade(3, 1, 0)).toEqual({
      box: 3,
      dueAt: 86_400_000,
      lastResult: 1,
    });
  });
});

describe("previewReviewGrade", () => {
  it("previews again as today", () => {
    expect(previewReviewGrade(4, 0)).toEqual({ box: 1, intervalDays: 0 });
  });

  it("previews hard as one day", () => {
    expect(previewReviewGrade(4, 1)).toEqual({ box: 4, intervalDays: 1 });
  });

  it("reflects custom box 5 interval for easy", () => {
    expect(
      previewReviewGrade(3, 3, {
        boxIntervalDays: [0, 1, 3, 7, 30],
      }),
    ).toEqual({ box: 5, intervalDays: 30 });
  });
});

describe("defaultDeckSchedulerConfig", () => {
  it("matches DEFAULT_BOX_INTERVAL_DAYS", () => {
    expect(defaultDeckSchedulerConfig()).toEqual({
      boxIntervalDays: [0, 1, 3, 7, 21],
    });
  });
});
