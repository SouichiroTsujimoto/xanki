import { describe, expect, it } from "vitest";
import {
  advanceFlashcardRound,
  createFlashcardRoundState,
  currentFlashcardId,
  flashcardRoundProgress,
  flashcardRoundSummary,
  gradeFlashcardKnown,
  gradeFlashcardStill,
  reconcileFlashcardRoundState,
} from "./flashcard-round.js";

describe("createFlashcardRoundState", () => {
  it("starts studying at index 0 with progress 0", () => {
    const state = createFlashcardRoundState(["a", "b", "c"]);
    expect(state.phase).toBe("studying");
    expect(currentFlashcardId(state)).toBe("a");
    expect(flashcardRoundProgress(state)).toEqual({
      swiped: 0,
      roundTotal: 3,
      progress: 0,
    });
  });

  it("empty deck is complete", () => {
    expect(createFlashcardRoundState([]).phase).toBe("complete");
  });
});

describe("gradeFlashcardKnown / gradeFlashcardStill", () => {
  it("marks known and advances swipe count from 0", () => {
    let state = createFlashcardRoundState(["a", "b"]);
    state = gradeFlashcardKnown(state);
    expect(state.knownIds).toEqual(["a"]);
    expect(state.roundIndex).toBe(1);
    expect(flashcardRoundProgress(state).swiped).toBe(1);
    expect(currentFlashcardId(state)).toBe("b");
  });

  it("keeps still for next round instead of rotating immediately", () => {
    let state = createFlashcardRoundState(["a", "b"]);
    state = gradeFlashcardStill(state);
    expect(state.roundStillIds).toEqual(["a"]);
    expect(currentFlashcardId(state)).toBe("b");
    expect(state.knownIds).toEqual([]);
  });

  it("completes when every card in the round is known", () => {
    let state = createFlashcardRoundState(["a", "b"]);
    state = gradeFlashcardKnown(state);
    state = gradeFlashcardKnown(state);
    expect(state.phase).toBe("complete");
    expect(state.knownIds).toEqual(["a", "b"]);
  });

  it("shows round summary when some cards need another round", () => {
    let state = createFlashcardRoundState(["a", "b", "c"]);
    state = gradeFlashcardKnown(state);
    state = gradeFlashcardStill(state);
    state = gradeFlashcardKnown(state);
    expect(state.phase).toBe("roundSummary");
    expect(flashcardRoundSummary(state)).toEqual({
      knownThisRound: 2,
      stillRemaining: 1,
      knownTotal: 2,
      sessionTotal: 3,
    });
  });

  it("summary when all still", () => {
    let state = createFlashcardRoundState(["a", "b"]);
    state = gradeFlashcardStill(state);
    state = gradeFlashcardStill(state);
    expect(state.phase).toBe("roundSummary");
    expect(state.roundStillIds).toEqual(["a", "b"]);
    expect(state.roundKnownCount).toBe(0);
  });
});

describe("advanceFlashcardRound", () => {
  it("starts next round with still cards only", () => {
    let state = createFlashcardRoundState(["a", "b", "c"]);
    state = gradeFlashcardKnown(state);
    state = gradeFlashcardStill(state);
    state = gradeFlashcardStill(state);
    expect(state.phase).toBe("roundSummary");

    state = advanceFlashcardRound(state, false);
    expect(state.phase).toBe("studying");
    expect(state.roundIds).toEqual(["b", "c"]);
    expect(state.roundIndex).toBe(0);
    expect(state.roundStillIds).toEqual([]);
    expect(state.roundKnownCount).toBe(0);
    expect(flashcardRoundProgress(state).swiped).toBe(0);
  });
});

describe("reconcileFlashcardRoundState", () => {
  it("keeps ungraded cards without skipping after a graded card is deleted", () => {
    let state = createFlashcardRoundState(["a", "b", "c"]);
    state = gradeFlashcardKnown(state);
    // graded a, next is b — delete a
    state = reconcileFlashcardRoundState(state, new Set(["b", "c"]));
    expect(state.knownIds).toEqual([]);
    expect(state.roundIds).toEqual(["b", "c"]);
    expect(state.phase).toBe("studying");
    expect(currentFlashcardId(state)).toBe("b");
    expect(flashcardRoundProgress(state).swiped).toBe(0);
  });

  it("moves to complete when remaining work is gone", () => {
    let state = createFlashcardRoundState(["a", "b"]);
    state = gradeFlashcardStill(state);
    state = gradeFlashcardStill(state);
    expect(state.phase).toBe("roundSummary");
    state = reconcileFlashcardRoundState(state, new Set());
    expect(state.phase).toBe("complete");
  });
});
