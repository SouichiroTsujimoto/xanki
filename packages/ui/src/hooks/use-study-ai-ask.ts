import { useCallback, useRef, useState } from "react";
import { useAppApi } from "../context/app-api-context";

export function useStudyAiAsk() {
  const api = useAppApi();
  const [streaming, setStreaming] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setAnswer("");
    setError(null);
  }, []);

  const ask = useCallback(
    async (cardContext: string, question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      setAnswer("");
      setError(null);

      try {
        for await (const chunk of api.askAi(cardContext, trimmed, controller.signal)) {
          setAnswer((prev) => prev + chunk);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "ai_failed";
        setError(message);
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [api],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  return { ask, cancel, reset, streaming, answer, error };
}
