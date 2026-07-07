import { invoke } from "@tauri-apps/api/core";
import { CLOUD_UNAUTHORIZED, createCloudClient } from "@xanki/shared";

export const CLOUD_URL = import.meta.env.VITE_CLOUD_URL ?? "http://localhost:8787";

export interface CloudSession {
  token: string | null;
}

export const SESSION_CLEARED_EVENT = "xanki:session-cleared";

let handlingUnauthorized = false;

async function notifyUnauthorized(): Promise<void> {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  try {
    await invoke("cloud_clear_session");
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

type AuthErrorBody = {
  message?: string;
  error?: string;
  code?: string;
};

function localizeAuthError(message: string): string {
  switch (message) {
    case "Invalid OTP":
      return "確認コードが正しくないか、期限切れです";
    case "send_otp_failed":
      return "確認コードの送信に失敗しました";
    case "invalid_otp":
      return "ログインに失敗しました";
    default:
      return message;
  }
}

async function readAuthErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as AuthErrorBody;
    return data.message ?? data.error ?? fallback;
  } catch {
    return res.status > 0 ? `${fallback}（HTTP ${res.status}）` : fallback;
  }
}

function cloudUnreachableError(): Error {
  return new Error(
    `クラウド API（${CLOUD_URL}）に接続できません。別ターミナルで pnpm dev:cloud が起動しているか確認してください。`,
  );
}

async function authFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw cloudUnreachableError();
  }
}

const inflightVerifies = new Map<string, Promise<void>>();

async function verifyOtpRequest(email: string, code: string): Promise<void> {
  const res = await authFetch(`${CLOUD_URL}/api/auth/sign-in/email-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp: code }),
  });
  const data = (await res.json().catch(() => ({}))) as AuthErrorBody & { token?: string };
  if (!res.ok) {
    throw new Error(
      localizeAuthError(data.message ?? data.error ?? "ログインに失敗しました"),
    );
  }
  // Cross-origin (Tauri localhost:1420 → API :8787) では set-auth-token ヘッダが読めないため body を優先
  const token = data.token ?? res.headers.get("set-auth-token");
  if (!token) {
    throw new Error("ログインに失敗しました（認証トークンを取得できませんでした）");
  }
  try {
    await invoke("cloud_set_session", { token });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`セッションの保存に失敗しました: ${detail}`);
  }
}

export async function verifyOtp(email: string, code: string): Promise<void> {
  const key = `${email.trim().toLowerCase()}:${code.trim()}`;
  const existing = inflightVerifies.get(key);
  if (existing) {
    await existing;
    return;
  }
  const promise = verifyOtpRequest(email, code);
  inflightVerifies.set(key, promise);
  try {
    await promise;
  } finally {
    inflightVerifies.delete(key);
  }
}

export async function sendOtp(email: string): Promise<void> {
  const res = await authFetch(`${CLOUD_URL}/api/auth/email-otp/send-verification-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, type: "sign-in" }),
  });
  if (!res.ok) {
    throw new Error(await readAuthErrorMessage(res, "確認コードの送信に失敗しました"));
  }
}

export async function getSession(): Promise<CloudSession> {
  return invoke<CloudSession>("cloud_get_session");
}

export async function logout(): Promise<void> {
  await invoke("cloud_clear_session");
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
