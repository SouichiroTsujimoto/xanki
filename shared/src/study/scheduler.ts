const DAY_MS = 86_400_000;

export type ReviewGrade = 0 | 1 | 2 | 3;

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

  submitReviewGrade(
    currentBox: number,
    grade: ReviewGrade,
    nowMs: number,
  ): { box: number; dueAt: number; lastResult: ReviewGrade } {
    const box = this.nextBoxFromGrade(currentBox, grade);
    const dueAt =
      grade === 1
        ? nowMs + DAY_MS
        : this.dueAtForBox(box, nowMs);
    return {
      box,
      dueAt,
      lastResult: grade,
    };
  }
}

export const leitnerScheduler = new LeitnerScheduler();
