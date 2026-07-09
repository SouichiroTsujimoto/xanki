import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.xanki.mobile",
  appName: "xanki",
  webDir: "dist",
  server: {
    hostname: "localhost",
    iosScheme: "http",
  },
  ios: {
    // Xcode build scheme (default "App"). Deep link URL scheme is in Info.plist (xanki://).
    contentInset: "automatic",
  },
};

export default config;
