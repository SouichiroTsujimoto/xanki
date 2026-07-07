import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isCloudUnauthorized } from "@xanki/shared";
import {
  cloud,
  getSession,
  logout,
  sendOtp,
  SESSION_CLEARED_EVENT,
  verifyOtp,
} from "./client";

export function useCloudAccount() {
  const [session, setSession] = useState<{ token: string | null }>({ token: null });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState<string>("未ログイン");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const s = await getSession();
    setSession(s);
    if (!s.token) {
      setStatus("未ログイン");
      return;
    }
    try {
      const info = await cloud.getStorage();
      setStatus(
        `rev=${info.rev} / 容量 ${Math.round(info.storageUsed / 1024 / 1024)}MB / プラン ${info.plan}`,
      );
    } catch {
      setStatus("ログイン中");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function sendOtpAction(): Promise<boolean> {
    setError(null);
    try {
      await sendOtp(email);
      setSent(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "確認コードの送信に失敗しました");
      return false;
    }
  }

  async function verifyOtpAction(): Promise<boolean> {
    setError(null);
    try {
      await verifyOtp(email, code);
      await refresh();
      return true;
    } catch (e) {
      const session = await getSession();
      if (session.token) {
        await refresh();
        return true;
      }
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
      return false;
    }
  }

  async function logoutAction() {
    await logout();
    await refresh();
  }

  async function upgrade() {
    setError(null);
    try {
      const { url } = await cloud.checkout();
      window.open(url, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "課金未設定");
    }
  }

  return {
    session,
    email,
    setEmail: (value: string) => {
      setError(null);
      setEmail(value);
    },
    code,
    setCode: (value: string) => {
      setError(null);
      setCode(value);
    },
    sent,
    status,
    error,
    sendOtp: sendOtpAction,
    verifyOtp: verifyOtpAction,
    logout: logoutAction,
    upgrade,
  };
}

export function useAuthGate() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const syncFromSession = useCallback(async () => {
    const s = await getSession();
    if (!s.token) {
      setLoggedIn(false);
      return false;
    }
    try {
      await cloud.me();
      setLoggedIn(true);
      return true;
    } catch (error) {
      if (!isCloudUnauthorized(error)) {
        await logout().catch(() => {});
      }
      setLoggedIn(false);
      return false;
    }
  }, []);

  useEffect(() => {
    void syncFromSession().finally(() => setReady(true));
  }, [syncFromSession]);

  useEffect(() => {
    function onSessionCleared() {
      setLoggedIn(false);
    }
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
  }, []);

  return { ready, loggedIn, setLoggedIn, syncFromSession };
}

export async function refreshTrayDueCount() {
  try {
    const count = await cloud.listCards().then((cards) => {
      const now = Date.now();
      return cards.filter((c) => Number(c.dueAt ?? 0) <= now).length;
    });
    await invoke("update_tray_due_count", { count });
  } catch {
    // ignore when offline
  }
}
