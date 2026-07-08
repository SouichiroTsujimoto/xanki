import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { AUTH_BROWSER_CLOSED_EVENT, AUTH_COMPLETE_EVENT, CLOUD_URL, setSessionToken } from "./session";

const AUTH_CALLBACK_PREFIX = "xanki://auth/callback";

async function handleAuthCallbackUrl(url: string): Promise<boolean> {
  if (!url.startsWith(AUTH_CALLBACK_PREFIX)) {
    return false;
  }

  const token = new URL(url).searchParams.get("token");
  if (!token) {
    return false;
  }

  await setSessionToken(token);
  try {
    await Browser.close();
  } catch {
    // Browser may already be closed
  }
  window.dispatchEvent(new Event(AUTH_COMPLETE_EVENT));
  return true;
}

export function registerAuthDeepLinkListener(): () => void {
  let removed = false;
  let urlListener: { remove: () => Promise<void> } | null = null;
  let browserListener: { remove: () => Promise<void> } | null = null;

  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) {
      void handleAuthCallbackUrl(launch.url);
    }
  });

  void App.addListener("appUrlOpen", (event) => {
    void handleAuthCallbackUrl(event.url);
  }).then((handle) => {
    if (removed) {
      void handle.remove();
      return;
    }
    urlListener = handle;
  });

  void Browser.addListener("browserFinished", () => {
    window.dispatchEvent(new Event(AUTH_BROWSER_CLOSED_EVENT));
  }).then((handle) => {
    if (removed) {
      void handle.remove();
      return;
    }
    browserListener = handle;
  });

  return () => {
    removed = true;
    void urlListener?.remove();
    void browserListener?.remove();
  };
}

export async function signInWithGoogle(): Promise<void> {
  const signInUrl = `${CLOUD_URL}/auth/desktop-sign-in`;
  await Browser.open({ url: signInUrl });
}
