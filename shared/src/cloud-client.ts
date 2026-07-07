import type {
  ApiCard,
  ApiDeck,
  CreateCardRequest,
  SubmitReviewRequest,
  UpdateCardRequest,
} from "./api-types.js";
import type { AccountStorageResponse } from "./sync.js";

export const CLOUD_UNAUTHORIZED = "unauthorized";

export function isCloudUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === CLOUD_UNAUTHORIZED;
}

export interface CloudClientOptions {
  baseUrl: string;
  credentials?: RequestCredentials;
  getAuthHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  onUnauthorized?: () => void | Promise<void>;
}

async function resolveHeaders(
  options: CloudClientOptions,
  init?: RequestInit,
): Promise<Record<string, string>> {
  const authHeaders = options.getAuthHeaders
    ? await options.getAuthHeaders()
    : {};
  return {
    "Content-Type": "application/json",
    ...authHeaders,
    ...(init?.headers as Record<string, string> | undefined),
  };
}

async function rejectUnauthorized(options: CloudClientOptions): Promise<never> {
  await options.onUnauthorized?.();
  throw new Error(CLOUD_UNAUTHORIZED);
}

export function createCloudClient(options: CloudClientOptions) {
  const base = options.baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      credentials: options.credentials ?? "include",
      headers: await resolveHeaders(options, init),
    });
    if (!res.ok) {
      if (res.status === 401) {
        await rejectUnauthorized(options);
      }
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? res.statusText);
    }
    return res.json() as Promise<T>;
  }

  return {
    me: () =>
      request<{ id: string; email: string; plan: string; aiCreditsRemaining: number }>(
        "/api/me",
      ),

    listDecks: () => request<ApiDeck[]>("/api/decks"),

    createDeck: (name: string) =>
      request<ApiDeck>("/api/decks", { method: "POST", body: JSON.stringify({ name }) }),

    updateDeck: (deckId: string, name: string) =>
      request<ApiDeck>(`/api/decks/${encodeURIComponent(deckId)}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),

    deleteDeck: (deckId: string) =>
      request<{ ok: boolean }>(`/api/decks/${encodeURIComponent(deckId)}`, {
        method: "DELETE",
      }),

    listCards: (deckId?: string, query?: string) => {
      const params = new URLSearchParams();
      if (deckId) params.set("deck_id", deckId);
      if (query) params.set("q", query);
      const qs = params.toString();
      return request<ApiCard[]>(`/api/cards${qs ? `?${qs}` : ""}`);
    },

    getCard: (cardId: string) =>
      request<ApiCard>(`/api/cards/${encodeURIComponent(cardId)}`),

    createCard: (payload: CreateCardRequest) =>
      request<ApiCard>("/api/cards", { method: "POST", body: JSON.stringify(payload) }),

    updateCard: (cardId: string, payload: UpdateCardRequest) =>
      request<ApiCard>(`/api/cards/${encodeURIComponent(cardId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    deleteCard: (cardId: string) =>
      request<{ ok: boolean }>(`/api/cards/${encodeURIComponent(cardId)}`, {
        method: "DELETE",
      }),

    toggleStar: (cardId: string) =>
      request<ApiCard>(`/api/cards/${encodeURIComponent(cardId)}/star`, {
        method: "POST",
      }),

    submitReview: (payload: SubmitReviewRequest) =>
      request<{ ok: boolean }>("/api/review/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getStorage: () => request<AccountStorageResponse>("/api/account/storage"),

    blobUrl: (hash: string) => `${base}/api/blobs/${hash}`,

    prepareBlob: (hash: string, size: number, mime: string) =>
      request<{ status: "exists" } | { status: "upload"; upload_path?: string; url?: string }>(
        "/api/blobs/prepare",
        { method: "POST", body: JSON.stringify({ hash, size, mime }) },
      ),

    commitBlob: (hash: string) =>
      request<{ ok: boolean }>("/api/blobs/commit", {
        method: "POST",
        body: JSON.stringify({ hash }),
      }),

    uploadBlob: async (hash: string, data: ArrayBuffer, mime: string) => {
      const res = await fetch(`${base}/api/blobs/${hash}/upload`, {
        method: "PUT",
        credentials: options.credentials ?? "include",
        headers: {
          ...(await resolveHeaders(options)),
          "Content-Type": mime,
        },
        body: data,
      });
      if (!res.ok) {
        if (res.status === 401) {
          await rejectUnauthorized(options);
        }
        throw new Error(`blob_upload_failed:${res.status}`);
      }
    },

    checkout: () => request<{ url: string }>("/api/billing/checkout", { method: "POST" }),

    qaGenerate: (text: string, kind: "qa" | "choice" = "qa", count = 3) =>
      request<{ items: Array<{ question: string; answer: string }> }>("/api/ai/qa-generate", {
        method: "POST",
        body: JSON.stringify({ text, kind, count }),
      }),

    subscribeRevisions: (
      onRevision: (rev: number) => void,
      onError?: (error: unknown) => void,
    ): (() => void) => {
      let closed = false;
      let abort: AbortController | undefined;

      void (async () => {
        while (!closed) {
          abort = new AbortController();
          try {
            const res = await fetch(`${base}/api/events`, {
              credentials: options.credentials ?? "include",
              headers: await resolveHeaders(options),
              signal: abort.signal,
            });
            if (!res.ok || !res.body) {
              if (res.status === 401) {
                await rejectUnauthorized(options);
              }
              throw new Error(`events_failed:${res.status}`);
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (!closed) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split("\n\n");
              buffer = parts.pop() ?? "";
              for (const part of parts) {
                const dataLine = part.split("\n").find((line) => line.startsWith("data: "));
                if (!dataLine) continue;
                try {
                  const payload = JSON.parse(dataLine.slice(6)) as { rev?: number };
                  if (typeof payload.rev === "number") {
                    onRevision(payload.rev);
                  }
                } catch {
                  // ignore malformed events
                }
              }
            }
          } catch (error) {
            if (!closed) {
              onError?.(error);
              if (isCloudUnauthorized(error)) {
                return;
              }
              await new Promise((r) => setTimeout(r, 3000));
            }
          }
        }
      })();

      return () => {
        closed = true;
        abort?.abort();
      };
    },
  };
}

export type CloudClient = ReturnType<typeof createCloudClient>;
