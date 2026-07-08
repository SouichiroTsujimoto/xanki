import { createLibrarySyncController } from "@xanki/shared";
import { cloudApi } from "./client";

const controller = createLibrarySyncController({
  subscribeRevisions: (onRevision, onError) => cloudApi.subscribeRevisions(onRevision, onError),
});

export const { setLibraryRefreshHandler, scheduleLibraryRefresh, flushLibraryRefresh } =
  controller;

export function scheduleMobileLibraryRefresh() {
  scheduleLibraryRefresh();
}

export function subscribeMobileRevisions(onRevision: () => void) {
  return controller.acquireRevisionSubscription(onRevision);
}
