import { useMemo, useState } from "react";
import { consumeSessionExpiredNotice } from "@xanki/shared";
import { LoginView, copy, useEmailOtpLogin } from "@xanki/ui";
import { authClient } from "../auth-client";
import { cloudApi } from "../api";

export function LoginPage({
  onLoggedIn,
}: {
  onLoggedIn: (email: string, plan: string) => void;
}) {
  const [initialNotice] = useState(() =>
    consumeSessionExpiredNotice() ? copy.login.sessionExpired : null,
  );
  const port = useMemo(
    () => ({
      sendOtp: async (email: string) => {
        const { error: err } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "sign-in",
        });
        if (err) {
          throw new Error(err.message ?? "送信失敗");
        }
      },
      verifyOtp: async (email: string, code: string) => {
        const { error: err } = await authClient.signIn.emailOtp({ email, otp: code });
        if (err) {
          throw new Error(err.message ?? "ログインに失敗しました");
        }
        await cloudApi.me();
      },
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
        if (await login.verify()) {
          const me = await cloudApi.me();
          onLoggedIn(me.email, me.plan);
        }
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
