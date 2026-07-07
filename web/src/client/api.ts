import { createCloudClient, markSessionExpired } from "@xanki/shared";

export const SESSION_CLEARED_EVENT = "xanki:session-cleared";

export const cloudApi = createCloudClient({
  baseUrl: "",
  credentials: "include",
  onUnauthorized: () => {
    markSessionExpired();
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
  },
});
