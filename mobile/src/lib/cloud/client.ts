import { CLOUD_UNAUTHORIZED, createCloudClient, markSessionExpired } from "@xanki/shared";
import { clearAuthenticatedBlobUrlCache } from "./blob-url";
import {
  AUTH_BROWSER_CLOSED_EVENT,
  AUTH_COMPLETE_EVENT,
  clearLastUsedDeckIdPref,
  clearSessionToken,
  CLOUD_URL,
  getSessionToken,
  SESSION_CLEARED_EVENT,
} from "./session";

export { AUTH_BROWSER_CLOSED_EVENT, AUTH_COMPLETE_EVENT, CLOUD_URL, SESSION_CLEARED_EVENT };

let handlingUnauthorized = false;

async function notifyUnauthorized(): Promise<void> {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  try {
    clearAuthenticatedBlobUrlCache();
    await clearSessionToken();
    markSessionExpired();
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
  } finally {
    setTimeout(() => {
      handlingUnauthorized = false;
    }, 500);
  }
}

export const cloudApi = createCloudClient({
  baseUrl: CLOUD_URL,
  credentials: "omit",
  onUnauthorized: notifyUnauthorized,
  getAuthHeaders: async (): Promise<Record<string, string>> => {
    const token = await getSessionToken();
    if (!token) {
      throw new Error(CLOUD_UNAUTHORIZED);
    }
    return { Authorization: `Bearer ${token}` };
  },
});

export async function logout(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    try {
      await fetch(`${CLOUD_URL}/api/auth/sign-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore network errors during logout
    }
  }
  await clearLastUsedDeckIdPref();
  clearAuthenticatedBlobUrlCache();
  await clearSessionToken();
}
