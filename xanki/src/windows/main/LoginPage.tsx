import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { consumeSessionExpiredNotice } from "@xanki/shared";
import { LoginView, copy } from "@xanki/ui";
import { AUTH_COMPLETE_EVENT, getSession, signInWithGoogle } from "../../lib/cloud/client";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void | Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialNotice] = useState(() =>
    consumeSessionExpiredNotice() ? copy.login.sessionExpired : null,
  );

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => {
      void getSession().then((session) => {
        if (session.token) {
          setBusy(false);
          void onLoggedIn();
        }
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [busy, onLoggedIn]);

  useEffect(() => {
    const unlisten = listen(AUTH_COMPLETE_EVENT, () => {
      setBusy(false);
      void onLoggedIn();
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [onLoggedIn]);

  async function handleGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
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
