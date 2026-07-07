import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { CLOUD_UNAUTHORIZED, createCloudClient, markSessionExpired } from "@xanki/shared";

export const CLOUD_URL = import.meta.env.VITE_CLOUD_URL ?? "http://localhost:8787";

export interface CloudSession {
  token: string | null;
}

export const SESSION_CLEARED_EVENT = "xanki:session-cleared";
export const AUTH_COMPLETE_EVENT = "xanki:auth-complete";

let handlingUnauthorized = false;

async function notifyUnauthorized(): Promise<void> {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  try {
    await invoke("cloud_clear_session");
    markSessionExpired();
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
  } finally {
    setTimeout(() => {
      handlingUnauthorized = false;
    }, 500);
  }
}

export const cloud = createCloudClient({
  baseUrl: CLOUD_URL,
  onUnauthorized: notifyUnauthorized,
  getAuthHeaders: async (): Promise<Record<string, string>> => {
    const session = await invoke<CloudSession>("cloud_get_session");
    if (!session.token) {
      throw new Error(CLOUD_UNAUTHORIZED);
    }
    return { Authorization: `Bearer ${session.token}` };
  },
});

function cloudUnreachableError(): Error {
  return new Error(
    `クラウド API（${CLOUD_URL}）に接続できません。別ターミナルで pnpm dev:cloud が起動しているか確認してください。`,
  );
}

export async function signInWithGoogle(): Promise<void> {
  let signInUrl: string;
  try {
    ({ signInUrl } = await invoke<{ signInUrl: string }>("cloud_prepare_google_sign_in", {
      cloudUrl: CLOUD_URL,
    }));
  } catch {
    throw new Error("ログインの準備に失敗しました");
  }
  try {
    await openUrl(signInUrl);
  } catch {
    throw cloudUnreachableError();
  }
}

export async function getSession(): Promise<CloudSession> {
  return invoke<CloudSession>("cloud_get_session");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  if (session.token) {
    try {
      await fetch(`${CLOUD_URL}/api/auth/sign-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } catch {
      // ignore network errors during logout
    }
  }
  localStorage.removeItem("xanki:lastUsedDeckId");
  await invoke("cloud_clear_session");
  await invoke("set_capture_deck_id", { deckId: null });
}

export async function readLocalImageBytes(relativePath: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>("read_image_bytes", { relativePath });
  return new Uint8Array(bytes);
}

export async function writeLocalImageBytes(hash: string, bytes: Uint8Array): Promise<string> {
  return invoke<string>("write_image_bytes", {
    hash,
    bytes: Array.from(bytes),
  });
}

export async function downloadBlobToCache(hash: string): Promise<string> {
  const session = await getSession();
  const res = await fetch(`${CLOUD_URL}/api/blobs/${hash}`, {
    headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
  });
  if (!res.ok) throw new Error("download_failed");
  const data = new Uint8Array(await res.arrayBuffer());
  return writeLocalImageBytes(hash, data);
}

async function ensureLocalImage(hash: string): Promise<string> {
  const relative = `images/${hash}.webp`;
  try {
    await readLocalImageBytes(relative);
    return relative;
  } catch {
    return downloadBlobToCache(hash);
  }
}

export { ensureLocalImage };
