import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { AuthSession } from "../native/auth-session";
import {
  AUTH_BROWSER_CLOSED_EVENT,
  AUTH_COMPLETE_EVENT,
  AUTH_FAILED_EVENT,
  CLOUD_URL,
  getSessionToken,
  setSessionToken,
} from "./session";

const AUTH_CALLBACK_PREFIX = "xanki://auth/callback";

const AUTH_CALLBACK_ERRORS: Record<string, string> = {
  session_missing: "ログインセッションを取得できませんでした。もう一度お試しください。",
};

function getAuthErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "ログインに失敗しました";
}

function dispatchAuthFailure(error: unknown): void {
  window.dispatchEvent(
    new CustomEvent(AUTH_FAILED_EVENT, {
      detail: { message: getAuthErrorMessage(error) },
    }),
  );
}

export async function handleAuthCallbackUrl(url: string): Promise<boolean> {
  if (!url.startsWith(AUTH_CALLBACK_PREFIX)) {
    return false;
  }

  const parsed = new URL(url);
  const errorCode = parsed.searchParams.get("error");
  if (errorCode) {
    throw new Error(AUTH_CALLBACK_ERRORS[errorCode] ?? "ログインに失敗しました");
  }

  const token = parsed.searchParams.get("token");
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
  let resumeListener: { remove: () => Promise<void> } | null = null;

  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) {
      void handleAuthCallbackUrl(launch.url).catch(dispatchAuthFailure);
    }
  });

  void App.addListener("appUrlOpen", (event) => {
    void handleAuthCallbackUrl(event.url).catch(dispatchAuthFailure);
  }).then((handle) => {
    if (removed) {
      void handle.remove();
      return;
    }
    urlListener = handle;
  });

  void App.addListener("resume", () => {
    void (async () => {
      try {
        const launch = await App.getLaunchUrl();
        if (launch?.url && (await handleAuthCallbackUrl(launch.url))) {
          return;
        }
        if (await getSessionToken()) {
          window.dispatchEvent(new Event(AUTH_COMPLETE_EVENT));
        }
      } catch (error) {
        dispatchAuthFailure(error);
      }
    })();
  }).then((handle) => {
    if (removed) {
      void handle.remove();
      return;
    }
    resumeListener = handle;
  });

  void Browser.addListener("browserFinished", () => {
    void (async () => {
      try {
        const launch = await App.getLaunchUrl();
        if (launch?.url && (await handleAuthCallbackUrl(launch.url))) {
          return;
        }
        if (await getSessionToken()) {
          window.dispatchEvent(new Event(AUTH_COMPLETE_EVENT));
          return;
        }
        window.dispatchEvent(new Event(AUTH_BROWSER_CLOSED_EVENT));
      } catch (error) {
        dispatchAuthFailure(error);
      }
    })();
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
    void resumeListener?.remove();
  };
}

export async function signInWithGoogle(): Promise<void> {
  const signInUrl = `${CLOUD_URL}/auth/desktop-sign-in`;

  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable("AuthSession")) {
      throw new Error(
        "認証プラグインが読み込まれていません。`pnpm cap:ios` でアプリを再ビルドしてください。",
      );
    }
    const { url } = await AuthSession.openAuthSession({
      url: signInUrl,
      callbackScheme: "xanki",
    });
    const handled = await handleAuthCallbackUrl(url);
    if (!handled) {
      throw new Error("ログインコールバックを処理できませんでした");
    }
    return;
  }

  await Browser.open({ url: signInUrl });
}
