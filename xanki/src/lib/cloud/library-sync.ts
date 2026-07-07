import { isCloudUnauthorized } from "@xanki/shared";
import { cloud } from "./client";

const LIBRARY_REFRESH_DEBOUNCE_MS = 400;

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshInFlight: Promise<void> | null = null;
let refreshHandler: (() => Promise<void>) | null = null;

let revisionUnsubscribe: (() => void) | null = null;
let revisionListenerCount = 0;
let revisionErrorHandler: ((error: unknown) => void) | null = null;

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

export function flushLibraryRefresh() {
  if (!refreshHandler) return Promise.resolve();
  clearTimeout(refreshTimer);
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = refreshHandler().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export function acquireRevisionSubscription(onRevision: () => void) {
  revisionListenerCount += 1;

  if (!revisionUnsubscribe) {
    revisionUnsubscribe = cloud.subscribeRevisions(
      onRevision,
      (error) => {
        revisionErrorHandler?.(error);
        if (isCloudUnauthorized(error)) {
          releaseRevisionSubscription();
        }
      },
    );
  }

  return () => {
    releaseRevisionSubscription();
  };
}

export function setRevisionErrorHandler(handler: ((error: unknown) => void) | null) {
  revisionErrorHandler = handler;
}

function releaseRevisionSubscription() {
  revisionListenerCount = Math.max(0, revisionListenerCount - 1);
  if (revisionListenerCount === 0 && revisionUnsubscribe) {
    revisionUnsubscribe();
    revisionUnsubscribe = null;
  }
}
