import { createLibrarySyncController, isCloudUnauthorized } from "@xanki/shared";
import { cloud } from "./client";

const controller = createLibrarySyncController({
  subscribeRevisions: (onRevision, onError) => cloud.subscribeRevisions(onRevision, onError),
  shouldReleaseOnError: isCloudUnauthorized,
});

export const {
  setLibraryRefreshHandler,
  scheduleLibraryRefresh,
  flushLibraryRefresh,
  acquireRevisionSubscription,
  setRevisionErrorHandler,
} = controller;
