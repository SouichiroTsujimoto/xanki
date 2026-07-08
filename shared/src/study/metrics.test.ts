import { describe, expect, it } from "vitest";
import {
  computeBoxDistribution,
  computeMasteryPercent,
  computeStreakDays,
  localDateKey,
} from "./metrics.js";

describe("study metrics", () => {
  it("computeMasteryPercent uses weighted box scores", () => {
    expect(computeMasteryPercent([])).toBe(0);
    expect(computeMasteryPercent([{ boxNum: 1 }])).toBe(0);
    expect(computeMasteryPercent([{ boxNum: 5 }])).toBe(100);
    expect(computeMasteryPercent([{ boxNum: 1 }, { boxNum: 5 }])).toBe(50);
  });

  it("computeBoxDistribution counts boxes", () => {
    expect(
      computeBoxDistribution([{ boxNum: 1 }, { boxNum: 5 }, { boxNum: 5 }]),
    ).toEqual({ 1: 1, 2: 0, 3: 0, 4: 0, 5: 2 });
  });

  it("localDateKey respects tz offset", () => {
    const utcMidnight = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(localDateKey(utcMidnight, 540)).toBe("2026-01-01");
    expect(localDateKey(Date.UTC(2025, 11, 31, 14, 59, 59), 540)).toBe("2025-12-31");
  });

  it("computeStreakDays includes today when active", () => {
    const nowMs = Date.UTC(2026, 0, 8, 1);
    const tz = 540;
    const today = localDateKey(nowMs, tz);
    const yesterday = "2026-01-07";
    expect(computeStreakDays([today, yesterday], tz, nowMs)).toBe(2);
  });

  it("computeStreakDays counts yesterday-only streak when today inactive", () => {
    expect(
      computeStreakDays(["2026-01-07", "2026-01-06"], 540, Date.UTC(2026, 0, 8, 1)),
    ).toBe(2);
  });
});
