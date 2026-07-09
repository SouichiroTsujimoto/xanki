import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Browser } from "@capacitor/browser";
import {
  AppApiProvider,
  AppShell,
  AppShellProvider,
  AppTabLayer,
  BillingSection,
  BootstrapLoading,
  CloudAccountSection,
  copy,
  HomeView,
  DeckStudyView,
  LeitnerStudyView,
  PlatformCapabilitiesProvider,
  SettingsView,
  Toaster,
  useMainAppState,
  type Deck,
} from "@xanki/ui";
import { countDueCards, mapApiDeck, CLOUD_UNAUTHORIZED } from "@xanki/shared";
import {
  AUTH_COMPLETE_EVENT,
  cloudApi,
  CLOUD_URL,
  logout,
  SESSION_CLEARED_EVENT,
} from "./lib/cloud/client";
import { createCloudAppApi } from "./lib/cloud/app-api";
import {
  scheduleMobileLibraryRefresh,
  setLibraryRefreshHandler,
  subscribeMobileRevisions,
  flushLibraryRefresh,
} from "./lib/cloud/library-sync";
import { getLastUsedDeckIdPref, setLastUsedDeckIdPref } from "./lib/cloud/session";
import { LoginPage } from "./pages/LoginPage";

const MOBILE_CAPABILITIES = {
  deckImportExport: false,
  cardEditor: false,
} as const;

function AuthenticatedApp({
  email,
  plan,
  onLogout,
}: {
  email: string;
  plan: string;
  onLogout: () => void;
}) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [studySessionActive, setStudySessionActive] = useState(false);

  const {
    tab,
    handleTabChange,
    deckStudySession,
    setDeckStudySession,
    leitnerSession,
    setLeitnerSession,
    collectionRevision,
    bumpCollectionRevision,
  } = useMainAppState({
    setStudySessionActive,
    onEnterDeckStudyTab: () => {
      void refreshLibraryRef.current();
    },
  });

  const refreshLibrary = useCallback(async () => {
    const items = await cloudApi.listDecks();
    setDecks(items.map(mapApiDeck));
    const lastUsed = await getLastUsedDeckIdPref();
    setSelectedDeckId((current) => {
      if (items.length === 0) return null;
      if (current && items.some((deck) => deck.id === current)) return current;
      if (lastUsed && items.some((deck) => deck.id === lastUsed)) return lastUsed;
      return items[0]?.id ?? null;
    });
    const cards = await cloudApi.listCards();
    setDueCount(countDueCards(cards));
    bumpCollectionRevision();
  }, [bumpCollectionRevision]);

  const refreshLibraryRef = useRef(refreshLibrary);
  refreshLibraryRef.current = refreshLibrary;

  useEffect(() => {
    setLibraryRefreshHandler(() => refreshLibraryRef.current());
    return () => setLibraryRefreshHandler(null);
  }, []);

  const appApi = useMemo(
    () => createCloudAppApi(() => scheduleMobileLibraryRefresh()),
    [],
  );

  useEffect(() => {
    void refreshLibraryRef.current();
  }, []);

  useEffect(() => {
    return subscribeMobileRevisions(() => {
      scheduleMobileLibraryRefresh();
    });
  }, []);

  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId) ?? null;

  useEffect(() => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedDeckId) return;
    void setLastUsedDeckIdPref(selectedDeckId);
  }, [selectedDeckId]);

  return (
    <PlatformCapabilitiesProvider capabilities={MOBILE_CAPABILITIES}>
      <AppApiProvider api={appApi}>
        <AppShellProvider
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setStudySessionActive={setStudySessionActive}
        >
          <AppShell
            tab={tab}
            onTabChange={handleTabChange}
            sidebarOpen={sidebarOpen}
            onSidebarOpenChange={setSidebarOpen}
            studySessionActive={studySessionActive}
            deckStudySessionActive={deckStudySession.active}
            deckStudySessionModeLabel={deckStudySession.modeLabel}
            onDeckStudySessionExit={deckStudySession.exit}
            leitnerSessionActive={leitnerSession.active}
            leitnerSessionModeLabel={leitnerSession.modeLabel}
            onLeitnerSessionExit={leitnerSession.exit}
            dueCount={dueCount}
            selectedDeck={selectedDeck}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            showCaptureShortcuts={false}
          >
            {tab === "home" && (
              <HomeView
                decks={decks}
                selectedDeckId={selectedDeckId}
                dueCount={dueCount}
                collectionRevision={collectionRevision}
                onSelectDeck={setSelectedDeckId}
                onGoToDeckStudy={() => handleTabChange("deckStudy")}
                onGoToLeitner={() => handleTabChange("leitner")}
              />
            )}
            <AppTabLayer active={tab === "deckStudy"}>
              <DeckStudyView
                deckId={selectedDeckId}
                searchQuery={searchQuery}
                collectionRevision={collectionRevision}
                onSessionChange={setDeckStudySession}
              />
            </AppTabLayer>
            <AppTabLayer active={tab === "leitner"}>
              <LeitnerStudyView
                decks={decks}
                dueCount={dueCount}
                collectionRevision={collectionRevision}
                onSessionChange={setLeitnerSession}
              />
            </AppTabLayer>
            {tab === "settings" && (
              <SettingsView
                permissions={{ accessibility: true, screenRecording: true }}
                onRefresh={() => {}}
                cloudSection={
                  <CloudAccountSection
                    email={email}
                    showUpgrade={plan !== "pro"}
                    onUpgrade={() => {
                      void cloudApi.checkout().then(({ url }) => {
                        void Browser.open({ url });
                      });
                    }}
                    onLogout={() => {
                      void logout().finally(onLogout);
                    }}
                  />
                }
                billingSection={
                  <BillingSection plan={plan} extraNote={copy.billing.webOcrNote} />
                }
              />
            )}
          </AppShell>
        </AppShellProvider>
      </AppApiProvider>
    </PlatformCapabilitiesProvider>
  );
}

export function App() {
  const [user, setUser] = useState<{ email: string; plan: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadUser = useCallback(() => {
    setLoading(true);
    setAuthError(null);
    cloudApi
      .me()
      .then((me) => setUser({ email: me.email, plan: me.plan }))
      .catch((error) => {
        setUser(null);
        if (error instanceof Error && error.message !== CLOUD_UNAUTHORIZED) {
          setAuthError(
            `ログイン後の接続に失敗しました（${CLOUD_URL}）。${error.message}`,
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    function onSessionCleared() {
      setUser(null);
    }
    function onAuthComplete() {
      loadUser();
      void flushLibraryRefresh();
    }
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
    window.addEventListener(AUTH_COMPLETE_EVENT, onAuthComplete);
    return () => {
      window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
      window.removeEventListener(AUTH_COMPLETE_EVENT, onAuthComplete);
    };
  }, [loadUser]);

  if (loading) {
    return <BootstrapLoading />;
  }

  if (!user) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <LoginPage
              onAuthComplete={loadUser}
              initialError={authError}
            />
          }
        />
      </Routes>
    );
  }

  return (
    <>
      <Toaster />
      <Routes>
        <Route
          path="/"
          element={
            <AuthenticatedApp
              email={user.email}
              plan={user.plan}
              onLogout={() => setUser(null)}
            />
          }
        />
        <Route path="/study" element={<Navigate to="/" replace />} />
        <Route path="/settings" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
