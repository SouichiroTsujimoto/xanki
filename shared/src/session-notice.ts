export const SESSION_EXPIRED_STORAGE_KEY = "xanki:session-expired";

export function markSessionExpired(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SESSION_EXPIRED_STORAGE_KEY, "1");
}

export function consumeSessionExpiredNotice(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(SESSION_EXPIRED_STORAGE_KEY) !== "1") return false;
  sessionStorage.removeItem(SESSION_EXPIRED_STORAGE_KEY);
  return true;
}
