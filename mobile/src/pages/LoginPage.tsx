import { ExceptionCode } from "@capacitor/core";
import { useEffect, useState } from "react";
import { consumeSessionExpiredNotice } from "@xanki/shared";
import { LoginView, copy } from "@xanki/ui";
import { signInWithGoogle } from "../lib/cloud/auth";
import {
  AUTH_BROWSER_CLOSED_EVENT,
  AUTH_COMPLETE_EVENT,
  AUTH_FAILED_EVENT,
  getSessionToken,
} from "../lib/cloud/client";

interface LoginPageProps {
  onAuthComplete?: () => void;
  initialError?: string | null;
}

function formatAuthError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "USER_CANCELED") {
      return "canceled";
    }
    if (code === ExceptionCode.Unimplemented) {
      return "認証プラグインが読み込まれていません。`pnpm cap:ios` でアプリを再ビルドしてください。";
    }
  }
  return error instanceof Error ? error.message : "ログインに失敗しました";
}

export function LoginPage({ onAuthComplete, initialError = null }: LoginPageProps) {
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);
  const [initialNotice] = useState(() =>
    consumeSessionExpiredNotice() ? copy.login.sessionExpired : null,
  );

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  useEffect(() => {
    function onComplete() {
      setBusy(false);
      onAuthComplete?.();
    }
    function onBrowserClosed() {
      setBusy(false);
    }
    function onAuthFailed(event: Event) {
      const message =
        event instanceof CustomEvent && typeof event.detail?.message === "string"
          ? event.detail.message
          : "ログインに失敗しました";
      setError(message);
      setBusy(false);
    }
    window.addEventListener(AUTH_COMPLETE_EVENT, onComplete);
    window.addEventListener(AUTH_BROWSER_CLOSED_EVENT, onBrowserClosed);
    window.addEventListener(AUTH_FAILED_EVENT, onAuthFailed);
    return () => {
      window.removeEventListener(AUTH_COMPLETE_EVENT, onComplete);
      window.removeEventListener(AUTH_BROWSER_CLOSED_EVENT, onBrowserClosed);
      window.removeEventListener(AUTH_FAILED_EVENT, onAuthFailed);
    };
  }, [onAuthComplete]);

  useEffect(() => {
    if (!busy) return;
    const intervalId = window.setInterval(() => {
      void getSessionToken().then((token) => {
        if (token) {
          setBusy(false);
          onAuthComplete?.();
        }
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [busy, onAuthComplete]);

  async function handleGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      setBusy(false);
      onAuthComplete?.();
    } catch (e) {
      const message = formatAuthError(e);
      if (message !== "canceled") {
        setError(message);
      }
      setBusy(false);
    }
  }

  return (
    <LoginView
      error={error}
      busy={busy}
      initialNotice={initialNotice}
      onGoogleSignIn={handleGoogleSignIn}
    />
  );
}
