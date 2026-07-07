import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLibrarySyncController } from "./library-sync-controller.js";

describe("library-sync-controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces library refresh", async () => {
    const handler = vi.fn(async () => {});
    const controller = createLibrarySyncController({
      subscribeRevisions: () => () => {},
    });
    controller.setLibraryRefreshHandler(handler);
    controller.scheduleLibraryRefresh();
    controller.scheduleLibraryRefresh();
    expect(handler).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("releases revision subscription on unauthorized error", () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((_onRevision, onError) => {
      onError?.(new Error("unauthorized"));
      return unsubscribe;
    });
    const controller = createLibrarySyncController({
      subscribeRevisions: subscribe,
      shouldReleaseOnError: (error) =>
        error instanceof Error && error.message === "unauthorized",
    });
    const release = controller.acquireRevisionSubscription(() => {});
    release();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
