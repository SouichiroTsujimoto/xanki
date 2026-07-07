import { cloudApi } from "./api";

const LIBRARY_REFRESH_DEBOUNCE_MS = 400;

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshInFlight: Promise<void> | null = null;
let refreshHandler: (() => Promise<void>) | null = null;

let revisionUnsubscribe: (() => void) | null = null;
let revisionListenerCount = 0;

export function setLibraryRefreshHandler(handler: (() => Promise<void>) | null) {
  refreshHandler = handler;
}

export function scheduleLibraryRefresh() {
  if (!refreshHandler) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (!refreshHandler) return;
    if (refreshInFlight) return;
    refreshInFlight = refreshHandler().finally(() => {
      refreshInFlight = null;
    });
  }, LIBRARY_REFRESH_DEBOUNCE_MS);
}

export function subscribeRevisions(onRevision: () => void) {
  revisionListenerCount += 1;

  if (!revisionUnsubscribe) {
    revisionUnsubscribe = cloudApi.subscribeRevisions(onRevision);
  }

  return () => {
    revisionListenerCount = Math.max(0, revisionListenerCount - 1);
    if (revisionListenerCount === 0 && revisionUnsubscribe) {
      revisionUnsubscribe();
      revisionUnsubscribe = null;
    }
  };
}

function scheduleWebLibraryRefresh() {
  scheduleLibraryRefresh();
}

function subscribeWebRevisions(onRevision: () => void) {
  return subscribeRevisions(onRevision);
}

export { scheduleWebLibraryRefresh, subscribeWebRevisions };
