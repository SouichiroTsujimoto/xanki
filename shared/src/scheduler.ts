const DAY_MS = 86_400_000;

export class LeitnerScheduler {
  static initialDueAt(nowMs: number): number {
    return nowMs;
  }

  static intervalDays(boxNum: number): number {
    switch (boxNum) {
      case 1:
        return 0;
      case 2:
        return 1;
      case 3:
        return 3;
      case 4:
        return 7;
      default:
        return 21;
    }
  }

  nextBox(current: number, passed: boolean): number {
    if (passed) {
      return Math.min(current + 1, 5);
    }
    return 1;
  }

  dueAtForBox(boxNum: number, nowMs: number): number {
    return nowMs + LeitnerScheduler.intervalDays(boxNum) * DAY_MS;
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
}

export const leitnerScheduler = new LeitnerScheduler();
