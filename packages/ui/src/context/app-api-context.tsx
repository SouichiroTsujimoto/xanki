import { createContext, useContext, type ReactNode } from "react";
import type { AppApi } from "../types";

const AppApiContext = createContext<AppApi | null>(null);

export function AppApiProvider({
  api,
  children,
}: {
  api: AppApi;
  children: ReactNode;
}) {
  return <AppApiContext.Provider value={api}>{children}</AppApiContext.Provider>;
}

export function useAppApi(): AppApi {
  const api = useContext(AppApiContext);
  if (!api) {
    throw new Error("useAppApi must be used within AppApiProvider");
  }
  return api;
}
