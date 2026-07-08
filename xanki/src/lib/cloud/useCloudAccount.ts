import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  AUTH_COMPLETE_EVENT,
  cloud,
  getSession,
  logout,
  SESSION_CLEARED_EVENT,
} from "./client";

export function useCloudAccount() {
  const [session, setSession] = useState<{ token: string | null }>({ token: null });
  const [status, setStatus] = useState<string>("未ログイン");
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const s = await getSession();
    setSession(s);
    if (!s.token) {
      setStatus("未ログイン");
      setAccountEmail(null);
      return;
    }
    try {
      const [me, info] = await Promise.all([cloud.me(), cloud.getStorage()]);
      setAccountEmail(me.email);
      setStatus(
        `rev=${info.rev} / 容量 ${Math.round(info.storageUsed / 1024 / 1024)}MB / プラン ${info.plan}`,
      );
    } catch {
      setStatus("ログイン中");
      setAccountEmail(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function logoutAction() {
    setError(null);
    try {
      await logout();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログアウトに失敗しました");
    }
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
    accountEmail,
    status,
    error,
    logout: logoutAction,
    upgrade,
    refresh,
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
    } catch {
      // ネットワーク/CORS 等の一時障害で Keychain の bearer を消さない（dev:cloud 未起動等）
      setLoggedIn(false);
      return false;
    }
  }, []);

  useEffect(() => {
    void syncFromSession().finally(() => setReady(true));
  }, [syncFromSession]);

  useEffect(() => {
    const unlistenPromise = listen(AUTH_COMPLETE_EVENT, () => {
      void syncFromSession();
    });
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [syncFromSession]);

  useEffect(() => {
    if (loggedIn) return;
    function resync() {
      void syncFromSession();
    }
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", resync);
    return () => {
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", resync);
    };
  }, [loggedIn, syncFromSession]);

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
