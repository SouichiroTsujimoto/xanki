import type {
  AiQaGenerateResponse,
  ApiCard,
  ApiDeck,
  CompleteStudySessionRequest,
  CreateCardRequest,
  RecordStudyEventsRequest,
  StartStudySessionRequest,
  StartStudySessionResponse,
  StudyMetrics,
  SubmitReviewRequest,
  UpdateCardRequest,
  UpdateDeckRequest,
  UpdateSchedulerConfigRequest,
} from "../library/api-types.js";
import type { AccountStorageResponse } from "../sync/sync.js";

export const CLOUD_UNAUTHORIZED = "unauthorized";

export function isCloudUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === CLOUD_UNAUTHORIZED;
}

export interface CloudClientOptions {
  baseUrl: string;
  credentials?: RequestCredentials;
  fetch?: typeof fetch;
  eventFetch?: typeof fetch;
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
  const requestFetch = options.fetch ?? fetch;
  const eventFetch = options.eventFetch ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await requestFetch(`${base}${path}`, {
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

    updateDeck: (deckId: string, patch: UpdateDeckRequest) =>
      request<ApiDeck>(`/api/decks/${encodeURIComponent(deckId)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),

    getSchedulerConfig: () =>
      request<UpdateSchedulerConfigRequest>("/api/settings/scheduler"),

    updateSchedulerConfig: (schedulerConfig: UpdateSchedulerConfigRequest["schedulerConfig"]) =>
      request<UpdateSchedulerConfigRequest>("/api/settings/scheduler", {
        method: "PATCH",
        body: JSON.stringify({ schedulerConfig }),
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

    submitReview: (payload: SubmitReviewRequest) =>
      request<{ ok: boolean }>("/api/review/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getStudyMetrics: (deckId?: string, tzOffsetMinutes?: number) => {
      const params = new URLSearchParams();
      if (deckId) params.set("deck_id", deckId);
      if (tzOffsetMinutes !== undefined) {
        params.set("tz_offset_minutes", String(tzOffsetMinutes));
      }
      const qs = params.toString();
      return request<StudyMetrics>(`/api/study/metrics${qs ? `?${qs}` : ""}`);
    },

    startStudySession: (payload: StartStudySessionRequest) =>
      request<StartStudySessionResponse>("/api/study/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    recordStudyEvents: (sessionId: string, payload: RecordStudyEventsRequest) =>
      request<{ ok: boolean }>(`/api/study/sessions/${encodeURIComponent(sessionId)}/events`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    completeStudySession: (sessionId: string, payload: CompleteStudySessionRequest) =>
      request<{ ok: boolean }>(
        `/api/study/sessions/${encodeURIComponent(sessionId)}/complete`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),

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
      const res = await requestFetch(`${base}/api/blobs/${hash}/upload`, {
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

    qaGenerate: (
      text: string,
      kind: "qa" | "choice" = "qa",
      count = 3,
    ): Promise<AiQaGenerateResponse> =>
      request<AiQaGenerateResponse>("/api/ai/qa-generate", {
        method: "POST",
        body: JSON.stringify({ text, kind, count }),
      }),

    askAi: async function* (
      cardContext: string,
      question: string,
      signal?: AbortSignal,
    ): AsyncGenerator<string, void, unknown> {
      const res = await requestFetch(`${base}/api/ai/ask`, {
        method: "POST",
        credentials: options.credentials ?? "include",
        headers: await resolveHeaders(options),
        body: JSON.stringify({ cardContext, question }),
        signal,
      });

      if (!res.ok) {
        if (res.status === 401) {
          await rejectUnauthorized(options);
        }
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }

      if (!res.body) {
        throw new Error("ai_stream_missing");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const payload = dataLine.slice(6).trim();
          if (payload === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (typeof parsed.error === "string") {
              throw new Error(parsed.error);
            }
            if (typeof parsed.text === "string" && parsed.text.length > 0) {
              yield parsed.text;
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    },

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
            const res = await eventFetch(`${base}/api/events`, {
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
