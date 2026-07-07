const LIBRARY_REFRESH_DEBOUNCE_MS = 400;

export interface LibrarySyncControllerDeps {
  subscribeRevisions: (
    onRevision: () => void,
    onError?: (error: unknown) => void,
  ) => () => void;
  shouldReleaseOnError?: (error: unknown) => boolean;
}

export function createLibrarySyncController(deps: LibrarySyncControllerDeps) {
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshInFlight: Promise<void> | null = null;
  let refreshHandler: (() => Promise<void>) | null = null;

  let revisionUnsubscribe: (() => void) | null = null;
  let revisionListenerCount = 0;
  let revisionErrorHandler: ((error: unknown) => void) | null = null;
  let revisionCallback: (() => void) | null = null;

  function setLibraryRefreshHandler(handler: (() => Promise<void>) | null) {
    refreshHandler = handler;
  }

  function scheduleLibraryRefresh() {
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

  function flushLibraryRefresh() {
    if (!refreshHandler) return Promise.resolve();
    clearTimeout(refreshTimer);
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = refreshHandler().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  function releaseRevisionSubscription() {
    revisionListenerCount = Math.max(0, revisionListenerCount - 1);
    if (revisionListenerCount === 0 && revisionUnsubscribe) {
      revisionUnsubscribe();
      revisionUnsubscribe = null;
      revisionCallback = null;
    }
  }

  function acquireRevisionSubscription(onRevision: () => void) {
    revisionListenerCount += 1;

    if (!revisionUnsubscribe) {
      revisionCallback = onRevision;
      revisionUnsubscribe = deps.subscribeRevisions(
        () => revisionCallback?.(),
        (error) => {
          revisionErrorHandler?.(error);
          if (deps.shouldReleaseOnError?.(error)) {
            releaseRevisionSubscription();
          }
        },
      );
    }

    return () => {
      releaseRevisionSubscription();
    };
  }

  function setRevisionErrorHandler(handler: ((error: unknown) => void) | null) {
    revisionErrorHandler = handler;
  }

  return {
    setLibraryRefreshHandler,
    scheduleLibraryRefresh,
    flushLibraryRefresh,
    acquireRevisionSubscription,
    setRevisionErrorHandler,
  };
}
