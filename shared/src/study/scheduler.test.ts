import { describe, expect, it } from "vitest";
import {
  defaultDeckSchedulerConfig,
  dueAtFromInterval,
  formatStudyIntervalFromNow,
  initialReviewState,
  intervalToMs,
  parseDeckSchedulerConfig,
  previewReviewGrade,
  submitReviewGrade,
} from "./scheduler.js";

const NOW = 1_000_000;

describe("parseDeckSchedulerConfig", () => {
  it("parses v2 config", () => {
    const config = defaultDeckSchedulerConfig();
    expect(parseDeckSchedulerConfig(config)).toEqual(config);
  });

  it("migrates v1 boxIntervalDays", () => {
    const migrated = parseDeckSchedulerConfig({
      boxIntervalDays: [0, 1, 3, 7, 21],
    });
    expect(migrated?.reviewIntervals).toEqual([
      { amount: 1, unit: "day" },
      { amount: 3, unit: "day" },
      { amount: 7, unit: "day" },
      { amount: 21, unit: "day" },
    ]);
    expect(migrated?.learningSteps).toEqual([
      { amount: 1, unit: "minute" },
      { amount: 10, unit: "minute" },
    ]);
  });

  it("rejects invalid config", () => {
    expect(parseDeckSchedulerConfig({ learningSteps: [] })).toBeNull();
  });
});

describe("formatStudyIntervalFromNow", () => {
  it("formats immediate", () => {
    expect(formatStudyIntervalFromNow(NOW, NOW)).toBe("今すぐ");
  });

  it("formats minutes", () => {
    expect(formatStudyIntervalFromNow(NOW + 10 * 60_000, NOW)).toBe("10分後");
  });

  it("formats days", () => {
    expect(formatStudyIntervalFromNow(NOW + 3 * 86_400_000, NOW)).toBe("3日後");
  });
});

describe("learning flow", () => {
  const config = defaultDeckSchedulerConfig();

  it("starts new cards as learning due now", () => {
    expect(initialReviewState(NOW)).toEqual({
      phase: "learning",
      step: 0,
      box: 1,
      dueAt: NOW,
      lastResult: 0,
    });
  });

  it("good advances through learning steps then graduates", () => {
    const step1 = submitReviewGrade(
      { phase: "learning", step: 0, box: 1 },
      2,
      NOW,
      config,
    );
    expect(step1.phase).toBe("learning");
    expect(step1.step).toBe(1);
    expect(step1.dueAt).toBe(NOW + intervalToMs(config.learningSteps[1]));

    const graduated = submitReviewGrade(
      { phase: "learning", step: 1, box: 1 },
      2,
      NOW,
      config,
    );
    expect(graduated.phase).toBe("review");
    expect(graduated.box).toBe(2);
    expect(graduated.dueAt).toBe(dueAtFromInterval(NOW, config.graduatingInterval));
  });

  it("easy graduates with easy interval", () => {
    const result = submitReviewGrade(
      { phase: "learning", step: 0, box: 1 },
      3,
      NOW,
      config,
    );
    expect(result.phase).toBe("review");
    expect(result.dueAt).toBe(dueAtFromInterval(NOW, config.easyInterval));
  });
});

describe("review flow", () => {
  const config = defaultDeckSchedulerConfig();

  it("again enters relearning while preserving review box", () => {
    const result = submitReviewGrade(
      { phase: "review", step: 0, box: 4 },
      0,
      NOW,
      config,
    );
    expect(result).toEqual({
      phase: "relearning",
      step: 0,
      box: 4,
      dueAt: dueAtFromInterval(NOW, config.relearningSteps[0]),
      lastResult: 0,
    });
  });

  it("hard uses configurable hard interval", () => {
    const custom = {
      ...defaultDeckSchedulerConfig(),
      hardInterval: { amount: 30, unit: "minute" as const },
    };
    const result = submitReviewGrade(
      { phase: "review", step: 0, box: 3 },
      1,
      NOW,
      custom,
    );
    expect(result.dueAt).toBe(NOW + 30 * 60_000);
    expect(result.box).toBe(3);
  });

  it("good and easy advance review boxes", () => {
    const good = submitReviewGrade(
      { phase: "review", step: 0, box: 3 },
      2,
      NOW,
      config,
    );
    expect(good.box).toBe(4);
    expect(good.dueAt).toBe(dueAtFromInterval(NOW, config.reviewIntervals[2]));

    const easy = submitReviewGrade(
      { phase: "review", step: 0, box: 3 },
      3,
      NOW,
      config,
    );
    expect(easy.box).toBe(5);
    expect(easy.dueAt).toBe(dueAtFromInterval(NOW, config.reviewIntervals[3]));
  });
});

describe("relearning flow", () => {
  const config = defaultDeckSchedulerConfig();

  it("returns to review after completing relearning steps", () => {
    const result = submitReviewGrade(
      { phase: "relearning", step: 0, box: 4 },
      2,
      NOW,
      config,
    );
    expect(result.phase).toBe("review");
    expect(result.box).toBe(4);
    expect(result.dueAt).toBe(dueAtFromInterval(NOW, config.reviewIntervals[2]));
  });
});

describe("previewReviewGrade", () => {
  it("matches submitReviewGrade timing", () => {
    const state = { phase: "review" as const, step: 0, box: 3 };
    const preview = previewReviewGrade(state, 1, defaultDeckSchedulerConfig(), NOW);
    const submitted = submitReviewGrade(state, 1, NOW, defaultDeckSchedulerConfig());
    expect(preview.dueAt).toBe(submitted.dueAt);
    expect(preview.label).toBe("1日後");
  });
});
