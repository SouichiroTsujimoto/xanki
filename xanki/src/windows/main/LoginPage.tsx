import { useRef, useState } from "react";
import { LoginView } from "@xanki/ui";
import { useCloudAccount } from "../../lib/cloud/useCloudAccount";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void | Promise<void> }) {
  const cloud = useCloudAccount();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function handleSend() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await cloud.sendOtp();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const ok = await cloud.verifyOtp();
      if (ok) await onLoggedIn();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <LoginView
      email={cloud.email}
      onEmailChange={cloud.setEmail}
      code={cloud.code}
      onCodeChange={cloud.setCode}
      sent={cloud.sent}
      error={cloud.error}
      busy={busy}
      onSend={handleSend}
      onVerify={handleVerify}
    />
  );
}
