import { createCloudClient } from "@xanki/shared";

export const cloudApi = createCloudClient({
  baseUrl: "",
  credentials: "include",
});
