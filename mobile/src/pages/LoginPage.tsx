import { useEffect, useState } from "react";
import { consumeSessionExpiredNotice } from "@xanki/shared";
import { LoginView, copy } from "@xanki/ui";
import { signInWithGoogle } from "../lib/cloud/auth";
import {
  AUTH_BROWSER_CLOSED_EVENT,
  AUTH_COMPLETE_EVENT,
  getSessionToken,
} from "../lib/cloud/client";

interface LoginPageProps {
  onAuthComplete?: () => void;
}

export function LoginPage({ onAuthComplete }: LoginPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialNotice] = useState(() =>
    consumeSessionExpiredNotice() ? copy.login.sessionExpired : null,
  );

  useEffect(() => {
    function onComplete() {
      setBusy(false);
      onAuthComplete?.();
    }
    function onBrowserClosed() {
      setBusy(false);
    }
    window.addEventListener(AUTH_COMPLETE_EVENT, onComplete);
    window.addEventListener(AUTH_BROWSER_CLOSED_EVENT, onBrowserClosed);
    return () => {
      window.removeEventListener(AUTH_COMPLETE_EVENT, onComplete);
      window.removeEventListener(AUTH_BROWSER_CLOSED_EVENT, onBrowserClosed);
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
      const message = e instanceof Error ? e.message : "ログインに失敗しました";
      if (message !== "canceled" && message !== "USER_CANCELED") {
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
