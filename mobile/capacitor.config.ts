import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.xanki.mobile",
  appName: "xanki",
  webDir: "dist",
  ios: {
    scheme: "xanki",
    contentInset: "automatic",
  },
};

export default config;
