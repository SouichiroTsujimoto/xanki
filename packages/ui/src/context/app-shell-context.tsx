import { createContext, useContext, type ReactNode } from "react";

interface AppShellContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setStudySessionActive: (active: boolean) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({
  sidebarOpen,
  setSidebarOpen,
  setStudySessionActive,
  children,
}: AppShellContextValue & { children: ReactNode }) {
  return (
    <AppShellContext.Provider value={{ sidebarOpen, setSidebarOpen, setStudySessionActive }}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return ctx;
}
