import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  AppApiProvider,
  AppShell,
  AppShellProvider,
  AppTabLayer,
  copy,
  HomeView,
  DeckStudyView,
  LeitnerStudyView,
  SettingsView,
  Toaster,
  type AppTab,
  type Deck,
  type StudySessionInfo,
} from "@xanki/ui";
import { authClient } from "./auth-client";
import { cloudApi, SESSION_CLEARED_EVENT } from "./api";
import { createCloudAppApi } from "./app-api";
import { countDueCards } from "@xanki/shared";
import {
  scheduleWebLibraryRefresh,
  setLibraryRefreshHandler,
  subscribeWebRevisions,
} from "./library-sync";
import { LoginPage } from "./pages/LoginPage";

const EMPTY_SESSION: StudySessionInfo = {
  active: false,
  modeLabel: null,
  exit: () => {},
};

function AuthenticatedApp({
  email,
  plan,
  onLogout,
}: {
  email: string;
  plan: string;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<AppTab>("home");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [studySessionActive, setStudySessionActive] = useState(false);
  const [deckStudySession, setDeckStudySession] = useState<StudySessionInfo>(EMPTY_SESSION);
  const [leitnerSession, setLeitnerSession] = useState<StudySessionInfo>(EMPTY_SESSION);
  const [collectionRevision, setCollectionRevision] = useState(0);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const refreshDecks = useCallback(async () => {
    const items = await cloudApi.listDecks();
    setDecks(items.map((d) => ({
      id: d.id,
      name: d.name,
      cardCount: d.cardCount ?? 0,
      createdAt: d.createdAt ?? Date.now(),
      updatedAt: d.updatedAt ?? Date.now(),
    })));
    setSelectedDeckId((current) => {
      if (items.length === 0) return null;
      if (current && items.some((deck) => deck.id === current)) return current;
      const lastUsed = localStorage.getItem("xanki:lastUsedDeckId");
      if (lastUsed && items.some((deck) => deck.id === lastUsed)) return lastUsed;
      return items[0]?.id ?? null;
    });
  }, []);

  const refreshDueCount = useCallback(async () => {
    const cards = await cloudApi.listCards();
    setDueCount(countDueCards(cards));
  }, []);

  const refreshLibrary = useCallback(async () => {
    await Promise.all([refreshDecks(), refreshDueCount()]);
    setCollectionRevision((value) => value + 1);
  }, [refreshDecks, refreshDueCount]);

  const refreshLibraryRef = useRef(refreshLibrary);
  refreshLibraryRef.current = refreshLibrary;

  useEffect(() => {
    setLibraryRefreshHandler(() => refreshLibraryRef.current());
    return () => setLibraryRefreshHandler(null);
  }, []);

  const appApi = useMemo(
    () => createCloudAppApi(() => scheduleWebLibraryRefresh()),
    [],
  );

  useEffect(() => {
    void refreshLibraryRef.current();
  }, []);

  useEffect(() => {
    return subscribeWebRevisions(() => {
      scheduleWebLibraryRefresh();
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
    localStorage.setItem("xanki:lastUsedDeckId", selectedDeckId);
  }, [selectedDeckId]);

  const handleTabChange = useCallback((nextTab: AppTab) => {
    const previousTab = tabRef.current;
    if (nextTab === previousTab) return;
    setTab(nextTab);
    if (nextTab === "deckStudy" && previousTab !== "deckStudy") {
      void refreshLibraryRef.current();
    }
    if (nextTab !== "deckStudy") {
      setDeckStudySession(EMPTY_SESSION);
    }
    if (nextTab !== "leitner") {
      setLeitnerSession(EMPTY_SESSION);
    }
    if (nextTab !== "deckStudy" && nextTab !== "leitner") {
      setStudySessionActive(false);
    }
  }, []);

  useEffect(() => {
    setStudySessionActive(deckStudySession.active || leitnerSession.active);
  }, [deckStudySession.active, leitnerSession.active]);

  return (
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
                <>
                  <p className="eyebrow">Cloud</p>
                  <h2>{copy.account.title}</h2>
                  <p className="settings-note">{copy.account.loggedInAs(email)}</p>
                  <div className="settings-inline-actions">
                    {plan !== "pro" && (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => {
                          void cloudApi.checkout().then(({ url }) => {
                            window.location.href = url;
                          });
                        }}
                      >
                        {copy.billing.upgradePro}
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        void authClient.signOut().finally(onLogout);
                      }}
                    >
                      ログアウト
                    </button>
                  </div>
                </>
              }
              billingSection={
                <>
                  <p className="eyebrow">{copy.billing.eyebrow}</p>
                  <h2>{copy.billing.title}</h2>
                  <p className="settings-note">{copy.billing.currentPlan(plan)}</p>
                  <p className="settings-note">{copy.billing.webOcrNote}</p>
                </>
              }
            />
          )}
        </AppShell>
      </AppShellProvider>
    </AppApiProvider>
  );
}

export function App() {
  const [user, setUser] = useState<{ email: string; plan: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cloudApi
      .me()
      .then((me) => setUser({ email: me.email, plan: me.plan }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onSessionCleared() {
      setUser(null);
    }
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
  }, []);

  if (loading) {
    return (
      <div className="app-bootstrap">
        <div className="empty-panel">
          <p className="empty-title">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route
          path="*"
          element={<LoginPage />}
        />
      </Routes>
    );
  }

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={<AuthenticatedApp email={user.email} plan={user.plan} onLogout={() => setUser(null)} />} />
        <Route path="/study" element={<Navigate to="/" replace />} />
        <Route path="/settings" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
