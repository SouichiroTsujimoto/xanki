import { Preferences } from "@capacitor/preferences";

const TOKEN_KEY = "xanki:session-token";
const LAST_DECK_KEY = "xanki:lastUsedDeckId";

export const SESSION_CLEARED_EVENT = "xanki:session-cleared";
export const AUTH_COMPLETE_EVENT = "xanki:auth-complete";
export const AUTH_BROWSER_CLOSED_EVENT = "xanki:auth-browser-closed";
export const AUTH_FAILED_EVENT = "xanki:auth-failed";
export const CLOUD_URL = import.meta.env.VITE_CLOUD_URL ?? "http://localhost:8787";

export async function getSessionToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value;
}

export async function setSessionToken(token: string): Promise<void> {
  await Preferences.set({ key: TOKEN_KEY, value: token });
}

export async function clearSessionToken(): Promise<void> {
  await Preferences.remove({ key: TOKEN_KEY });
}

export async function getLastUsedDeckIdPref(): Promise<string | null> {
  const { value } = await Preferences.get({ key: LAST_DECK_KEY });
  return value;
}

export async function setLastUsedDeckIdPref(deckId: string): Promise<void> {
  await Preferences.set({ key: LAST_DECK_KEY, value: deckId });
}

export async function clearLastUsedDeckIdPref(): Promise<void> {
  await Preferences.remove({ key: LAST_DECK_KEY });
}
