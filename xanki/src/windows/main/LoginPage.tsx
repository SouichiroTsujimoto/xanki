import { useMemo, useState } from "react";
import { consumeSessionExpiredNotice } from "@xanki/shared";
import { LoginView, copy, useEmailOtpLogin } from "@xanki/ui";
import { sendOtp, verifyOtp } from "../../lib/cloud/client";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void | Promise<void> }) {
  const [initialNotice] = useState(() =>
    consumeSessionExpiredNotice() ? copy.login.sessionExpired : null,
  );
  const port = useMemo(
    () => ({
      sendOtp: (email: string) => sendOtp(email),
      verifyOtp: (email: string, code: string) => verifyOtp(email, code),
    }),
    [],
  );
  const login = useEmailOtpLogin(port);

  return (
    <LoginView
      email={login.email}
      onEmailChange={login.setEmail}
      code={login.code}
      onCodeChange={login.setCode}
      sent={login.sent}
      error={login.error}
      busy={login.busy}
      initialNotice={initialNotice}
      onSend={() => {
        void login.send();
      }}
      onVerify={async () => {
        if (await login.verify()) await onLoggedIn();
      }}
      onBackToEmail={login.backToEmail}
      onResend={() => {
        void login.resend();
      }}
      resendDisabled={login.busy || login.resendCooldown > 0}
      resendLabel={
        login.resendCooldown > 0
          ? copy.login.resendCooldown(login.resendCooldown)
          : copy.login.resendCode
      }
    />
  );
}
