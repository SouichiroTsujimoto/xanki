import type { CapacitorConfig } from "@capacitor/cli";

const liveReload = process.env.CAPACITOR_LIVE_RELOAD === "1";
const devServerUrl =
  process.env.CAPACITOR_DEV_SERVER_URL ?? "http://localhost:5174";

const config: CapacitorConfig = {
  appId: "app.xanki.mobile",
  appName: "xanki",
  webDir: "dist",
  server: {
    hostname: "localhost",
    iosScheme: "http",
    // Dev only: load WebView from Mobile Vite for HMR (set by scripts/dev-ios.sh).
    // Production / build:mobile:ios leave this unset so dist is bundled.
    ...(liveReload
      ? {
          url: devServerUrl,
          cleartext: true,
        }
      : {}),
  },
  ios: {
    // Xcode build scheme (default "App"). Deep link URL scheme is in Info.plist (xanki://).
    contentInset: "automatic",
  },
};

export default config;
