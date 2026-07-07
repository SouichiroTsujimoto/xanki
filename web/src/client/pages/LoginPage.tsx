import { useState } from "react";
import { LoginView } from "@xanki/ui";
import { authClient } from "../auth-client";
import { cloudApi } from "../api";

export function LoginPage({
  onLoggedIn,
}: {
  onLoggedIn: (email: string, plan: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSend() {
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (err) {
        setError(err.message ?? "送信失敗");
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await authClient.signIn.emailOtp({ email, otp: code });
      if (err) {
        setError(err.message ?? "ログインに失敗しました");
        return;
      }
      const me = await cloudApi.me();
      onLoggedIn(me.email, me.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <LoginView
      email={email}
      onEmailChange={setEmail}
      code={code}
      onCodeChange={setCode}
      sent={sent}
      error={error}
      busy={busy}
      onSend={handleSend}
      onVerify={handleVerify}
    />
  );
}
