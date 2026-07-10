import {
  flashcardRoundDraftToState,
  isFlashcardRoundDraft,
  type FlashcardRoundDraft,
  type FlashcardRoundState,
  flashcardRoundStateToDraft,
} from "@xanki/shared";

const STORAGE_PREFIX = "xanki.flashcard-session.v1:";

function storageKey(deckId: string): string {
  return `${STORAGE_PREFIX}${deckId}`;
}

export function loadFlashcardSessionDraft(
  deckId: string,
): FlashcardRoundDraft | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(deckId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isFlashcardRoundDraft(parsed)) return null;
    if (parsed.deckId !== deckId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveFlashcardSessionDraft(
  deckId: string,
  shuffle: boolean,
  state: FlashcardRoundState,
): void {
  if (typeof localStorage === "undefined") return;
  const draft = flashcardRoundStateToDraft(deckId, shuffle, state);
  if (!draft) {
    clearFlashcardSessionDraft(deckId);
    return;
  }
  try {
    localStorage.setItem(storageKey(deckId), JSON.stringify(draft));
  } catch {
    // Quota / private mode — learning continues without persistence.
  }
}

export function clearFlashcardSessionDraft(deckId: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(storageKey(deckId));
  } catch {
    // ignore
  }
}

export function draftToRoundState(draft: FlashcardRoundDraft): FlashcardRoundState {
  return flashcardRoundDraftToState(draft);
}
