import { createContext, useContext, type ReactNode } from "react";

export interface PlatformCapabilities {
  deckImportExport: boolean;
  cardEditor: boolean;
}

const defaultCapabilities: PlatformCapabilities = {
  deckImportExport: false,
  cardEditor: false,
};

const PlatformCapabilitiesContext = createContext<PlatformCapabilities>(defaultCapabilities);

export function PlatformCapabilitiesProvider({
  capabilities,
  children,
}: {
  capabilities: PlatformCapabilities;
  children: ReactNode;
}) {
  return (
    <PlatformCapabilitiesContext.Provider value={capabilities}>
      {children}
    </PlatformCapabilitiesContext.Provider>
  );
}

export function usePlatformCapabilities(): PlatformCapabilities {
  return useContext(PlatformCapabilitiesContext);
}
