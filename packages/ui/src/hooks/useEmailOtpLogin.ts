import { useCallback, useEffect, useRef, useState } from "react";

export interface EmailOtpAuthPort {
  sendOtp(email: string): Promise<void>;
  verifyOtp(email: string, code: string): Promise<void>;
}

const DEFAULT_RESEND_COOLDOWN_SEC = 30;

export function useEmailOtpLogin(
  port: EmailOtpAuthPort,
  opts?: { resendCooldownSec?: number },
) {
  const resendCooldownSec = opts?.resendCooldownSec ?? DEFAULT_RESEND_COOLDOWN_SEC;
  const [email, setEmailState] = useState("");
  const [code, setCodeState] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const setEmail = useCallback((value: string) => {
    setError(null);
    setEmailState(value);
  }, []);

  const setCode = useCallback((value: string) => {
    setError(null);
    setCodeState(value);
  }, []);

  const backToEmail = useCallback(() => {
    setSent(false);
    setCodeState("");
    setError(null);
    setResendCooldown(0);
  }, []);

  const send = useCallback(async () => {
    if (inFlight.current || !email) return false;
    inFlight.current = true;
    setError(null);
    setBusy(true);
    try {
      await port.sendOtp(email);
      setSent(true);
      setResendCooldown(resendCooldownSec);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "確認コードの送信に失敗しました");
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [email, port, resendCooldownSec]);

  const resend = useCallback(async () => {
    if (resendCooldown > 0 || inFlight.current || !email) return false;
    return send();
  }, [email, resendCooldown, send]);

  const verify = useCallback(async () => {
    if (inFlight.current || code.length < 6) return false;
    inFlight.current = true;
    setError(null);
    setBusy(true);
    try {
      await port.verifyOtp(email, code);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [code, email, port]);

  return {
    email,
    setEmail,
    code,
    setCode,
    sent,
    error,
    busy,
    resendCooldown,
    backToEmail,
    send,
    resend,
    verify,
  };
}
