import { useState } from "react";
import { consumeSessionExpiredNotice } from "@xanki/shared";
import { LoginView, copy } from "@xanki/ui";
import { authClient } from "../auth-client";

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialNotice] = useState(() =>
    consumeSessionExpiredNotice() ? copy.login.sessionExpired : null,
  );

  async function handleGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      const { error: authError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/`,
      });
      if (authError) {
        setError(authError.message ?? "ログインに失敗しました");
        setBusy(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
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
