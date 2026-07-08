import { useEffect, useState } from "react";
import {
  defaultDeckSchedulerConfig,
  resolveDeckSchedulerConfig,
  type DeckSchedulerConfig,
} from "@xanki/shared";
import { useAppApi } from "../context/app-api-context";

export function useSchedulerConfig(revision = 0) {
  const api = useAppApi();
  const [config, setConfig] = useState<DeckSchedulerConfig>(() =>
    defaultDeckSchedulerConfig(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      setLoading(true);
      try {
        const next = await api.getSchedulerConfig();
        if (!cancelled) {
          setConfig(resolveDeckSchedulerConfig(next));
        }
      } catch (error) {
        console.error("scheduler config load failed", error);
        if (!cancelled) {
          setConfig(defaultDeckSchedulerConfig());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, [api, revision]);

  return { config, loading };
}
