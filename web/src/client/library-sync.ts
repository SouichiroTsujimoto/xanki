import { createLibrarySyncController } from "@xanki/shared";
import { cloudApi } from "./api";

const controller = createLibrarySyncController({
  subscribeRevisions: (onRevision, onError) => cloudApi.subscribeRevisions(onRevision, onError),
});

export const { setLibraryRefreshHandler, scheduleLibraryRefresh, flushLibraryRefresh } =
  controller;

export function scheduleWebLibraryRefresh() {
  scheduleLibraryRefresh();
}

export function subscribeWebRevisions(onRevision: () => void) {
  return controller.acquireRevisionSubscription(onRevision);
}
