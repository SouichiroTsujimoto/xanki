import { shuffleIds } from "./deck-session.js";

export type FlashcardSessionPhase = "studying" | "roundSummary" | "complete";

export type FlashcardRoundState = {
  sessionTotal: number;
  knownIds: string[];
  roundIds: string[];
  /** Index of the current card; also the count of swipes completed in this round. */
  roundIndex: number;
  roundStillIds: string[];
  roundKnownCount: number;
  phase: FlashcardSessionPhase;
};

export type FlashcardRoundProgress = {
  swiped: number;
  roundTotal: number;
  progress: number;
};

export type FlashcardRoundSummary = {
  knownThisRound: number;
  stillRemaining: number;
  knownTotal: number;
  sessionTotal: number;
};

export function createFlashcardRoundState(ids: string[]): FlashcardRoundState {
  return {
    sessionTotal: ids.length,
    knownIds: [],
    roundIds: [...ids],
    roundIndex: 0,
    roundStillIds: [],
    roundKnownCount: 0,
    phase: ids.length === 0 ? "complete" : "studying",
  };
}

export function currentFlashcardId(state: FlashcardRoundState): string | null {
  if (state.phase !== "studying") return null;
  return state.roundIds[state.roundIndex] ?? null;
}

export function flashcardRoundProgress(state: FlashcardRoundState): FlashcardRoundProgress {
  const roundTotal = state.roundIds.length;
  const swiped = Math.min(Math.max(state.roundIndex, 0), roundTotal);
  return {
    swiped,
    roundTotal,
    progress: roundTotal > 0 ? (swiped / roundTotal) * 100 : 0,
  };
}

export function flashcardRoundSummary(state: FlashcardRoundState): FlashcardRoundSummary {
  return {
    knownThisRound: state.roundKnownCount,
    stillRemaining: state.roundStillIds.length,
    knownTotal: state.knownIds.length,
    sessionTotal: state.sessionTotal,
  };
}

function finishAfterGrade(
  state: FlashcardRoundState,
  next: Omit<FlashcardRoundState, "phase"> & { phase?: FlashcardSessionPhase },
): FlashcardRoundState {
  const nextIndex = next.roundIndex;
  if (nextIndex < next.roundIds.length) {
    return { ...state, ...next, phase: "studying" };
  }
  if (next.roundStillIds.length === 0) {
    return { ...state, ...next, phase: "complete" };
  }
  return { ...state, ...next, phase: "roundSummary" };
}

export function gradeFlashcardKnown(state: FlashcardRoundState): FlashcardRoundState {
  if (state.phase !== "studying") return state;
  const currentId = state.roundIds[state.roundIndex];
  if (!currentId) return state;

  const knownIds = state.knownIds.includes(currentId)
    ? state.knownIds
    : [...state.knownIds, currentId];

  return finishAfterGrade(state, {
    sessionTotal: state.sessionTotal,
    knownIds,
    roundIds: state.roundIds,
    roundIndex: state.roundIndex + 1,
    roundStillIds: state.roundStillIds,
    roundKnownCount: state.roundKnownCount + 1,
  });
}

export function gradeFlashcardStill(state: FlashcardRoundState): FlashcardRoundState {
  if (state.phase !== "studying") return state;
  const currentId = state.roundIds[state.roundIndex];
  if (!currentId) return state;

  return finishAfterGrade(state, {
    sessionTotal: state.sessionTotal,
    knownIds: state.knownIds,
    roundIds: state.roundIds,
    roundIndex: state.roundIndex + 1,
    roundStillIds: [...state.roundStillIds, currentId],
    roundKnownCount: state.roundKnownCount,
  });
}

export function advanceFlashcardRound(
  state: FlashcardRoundState,
  shuffle: boolean,
): FlashcardRoundState {
  if (state.phase !== "roundSummary") return state;
  if (state.roundStillIds.length === 0) {
    return { ...state, phase: "complete" };
  }

  const nextRoundIds = shuffle
    ? shuffleIds(state.roundStillIds)
    : [...state.roundStillIds];

  return {
    sessionTotal: state.sessionTotal,
    knownIds: state.knownIds,
    roundIds: nextRoundIds,
    roundIndex: 0,
    roundStillIds: [],
    roundKnownCount: 0,
    phase: "studying",
  };
}

/**
 * Drop deleted card IDs and recompute phase / counters so a draft can resume
 * after the deck mutates.
 *
 * Mid-round studying: only **ungraded** remaining cards stay in the queue
 * (index reset to 0) so deleted graded cards do not skip ungraded ones.
 */
export function reconcileFlashcardRoundState(
  state: FlashcardRoundState,
  availableIds: ReadonlySet<string> | readonly string[],
): FlashcardRoundState {
  const available =
    availableIds instanceof Set ? availableIds : new Set(availableIds);

  const knownIds = state.knownIds.filter((id) => available.has(id));
  const stillIds = state.roundStillIds.filter((id) => available.has(id));
  const remainingIds = state.roundIds
    .slice(Math.max(state.roundIndex, 0))
    .filter((id) => available.has(id));

  const remainingWork =
    state.phase === "complete"
      ? 0
      : state.phase === "roundSummary"
        ? stillIds.length
        : remainingIds.length + stillIds.length;

  const sessionTotal =
    knownIds.length + remainingWork > 0
      ? Math.max(state.sessionTotal, knownIds.length + remainingWork)
      : state.sessionTotal;

  if (remainingWork === 0) {
    return {
      sessionTotal,
      knownIds,
      roundIds: [],
      roundIndex: 0,
      roundStillIds: [],
      roundKnownCount: 0,
      phase: "complete",
    };
  }

  if (state.phase === "roundSummary" || remainingIds.length === 0) {
    return {
      sessionTotal,
      knownIds,
      roundIds: [],
      roundIndex: 0,
      roundStillIds: stillIds,
      roundKnownCount: Math.min(state.roundKnownCount, knownIds.length),
      phase: stillIds.length > 0 ? "roundSummary" : "complete",
    };
  }

  return {
    sessionTotal,
    knownIds,
    roundIds: remainingIds,
    roundIndex: 0,
    roundStillIds: stillIds,
    roundKnownCount: Math.min(state.roundKnownCount, knownIds.length),
    phase: "studying",
  };
}

/** Draft snapshot for localStorage (excludes complete — callers clear instead). */
export type FlashcardRoundDraft = {
  version: 1;
  deckId: string;
  shuffle: boolean;
  sessionTotal: number;
  knownIds: string[];
  roundIds: string[];
  roundIndex: number;
  roundStillIds: string[];
  roundKnownCount: number;
  phase: "studying" | "roundSummary";
  updatedAt: number;
};

export function flashcardRoundStateToDraft(
  deckId: string,
  shuffle: boolean,
  state: FlashcardRoundState,
): FlashcardRoundDraft | null {
  if (state.phase === "complete") return null;
  if (state.sessionTotal <= 0 && state.roundIds.length === 0) return null;
  return {
    version: 1,
    deckId,
    shuffle,
    sessionTotal: state.sessionTotal,
    knownIds: state.knownIds,
    roundIds: state.roundIds,
    roundIndex: state.roundIndex,
    roundStillIds: state.roundStillIds,
    roundKnownCount: state.roundKnownCount,
    phase: state.phase,
    updatedAt: Date.now(),
  };
}

export function flashcardRoundDraftToState(draft: FlashcardRoundDraft): FlashcardRoundState {
  return {
    sessionTotal: draft.sessionTotal,
    knownIds: draft.knownIds,
    roundIds: draft.roundIds,
    roundIndex: draft.roundIndex,
    roundStillIds: draft.roundStillIds,
    roundKnownCount: draft.roundKnownCount,
    phase: draft.phase,
  };
}

export function isFlashcardRoundDraft(value: unknown): value is FlashcardRoundDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.deckId === "string" &&
    typeof v.shuffle === "boolean" &&
    typeof v.sessionTotal === "number" &&
    Array.isArray(v.knownIds) &&
    Array.isArray(v.roundIds) &&
    typeof v.roundIndex === "number" &&
    Array.isArray(v.roundStillIds) &&
    typeof v.roundKnownCount === "number" &&
    (v.phase === "studying" || v.phase === "roundSummary") &&
    typeof v.updatedAt === "number"
  );
}
