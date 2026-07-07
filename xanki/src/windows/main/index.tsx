import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  AppApiProvider,
  AppShell,
  AppShellProvider,
  AppTabLayer,
  copy,
  DeckStudyView,
  HomeView,
  LeitnerStudyView,
  OnboardingView,
  SettingsView,
  type AppTab,
  type StudySessionInfo,
} from "@xanki/ui";
import { isCloudUnauthorized } from "@xanki/shared";
import { createCloudAppApi } from "../../lib/cloud/app-api";
import { cloud } from "../../lib/cloud/client";
import {
  acquireRevisionSubscription,
  flushLibraryRefresh,
  scheduleLibraryRefresh,
  setLibraryRefreshHandler,
  setRevisionErrorHandler,
} from "../../lib/cloud/library-sync";
import {
  useAuthGate,
  useCloudAccount,
} from "../../lib/cloud/useCloudAccount";
import { nativeApi } from "../../lib/tauri/native-api";
import { useAppStore } from "../../stores/appStore";
import type { PermissionStatus } from "../../types";
import { LoginPage } from "./LoginPage";

const EMPTY_SESSION: StudySessionInfo = {
  active: false,
  modeLabel: null,
  exit: () => {},
};

function resolveTab(payload: string): AppTab | null {
  switch (payload) {
    case "home":
    case "library":
      return "home";
    case "deckStudy":
    case "study":
      return "deckStudy";
    case "leitner":
    case "review":
      return "leitner";
    case "settings":
      return "settings";
    default:
      return null;
  }
}

function CloudSettingsSection() {
  const cloudAccount = useCloudAccount();

  return (
    <>
      <p className="eyebrow">Cloud</p>
      <h2>{copy.account.title}</h2>
      {cloudAccount.accountEmail && (
        <p className="settings-note">{copy.account.loggedInAs(cloudAccount.accountEmail)}</p>
      )}
      <p className="settings-note">{cloudAccount.status}</p>
      <div className="settings-inline-actions">
        <button type="button" className="ghost-button" onClick={() => void cloudAccount.upgrade()}>
          {copy.billing.upgradePro}
        </button>
        <button type="button" className="text-button" onClick={() => void cloudAccount.logout()}>
          ログアウト
        </button>
      </div>
      {cloudAccount.error && <p className="settings-note">{cloudAccount.error}</p>}
    </>
  );
}

export function MainApp() {
  const auth = useAuthGate();
  const {
    dueCount,
    decks,
    selectedDeckId,
    searchQuery,
    sidebarOpen,
    studySessionActive,
    onboardingComplete,
    setDueCount,
    setDecks,
    setSelectedDeckId,
    setSearchQuery,
    setSidebarOpen,
    setStudySessionActive,
    setOnboardingComplete,
  } = useAppStore();

  const [tab, setTab] = useState<AppTab>("home");
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const [deckStudySession, setDeckStudySession] = useState<StudySessionInfo>(EMPTY_SESSION);
  const [leitnerSession, setLeitnerSession] = useState<StudySessionInfo>(EMPTY_SESSION);
  const [libraryRevision, setLibraryRevision] = useState(0);
  const [permissions, setPermissions] = useState<PermissionStatus>({
    accessibility: false,
    screenRecording: false,
  });

  useEffect(() => {
    document.documentElement.classList.add("tauri-desktop", "tauri-macos");
    return () => {
      document.documentElement.classList.remove("tauri-desktop", "tauri-macos");
    };
  }, []);

  const refreshLibrary = useCallback(async () => {
    try {
      const [deckList, allCards] = await Promise.all([cloud.listDecks(), cloud.listCards()]);
      setDecks(
        deckList.map((deck) => ({
          id: deck.id,
          name: deck.name,
          cardCount: deck.cardCount ?? 0,
          createdAt: deck.createdAt ?? Date.now(),
          updatedAt: deck.updatedAt ?? Date.now(),
        })),
      );
      const deckIds = new Set(deckList.map((deck) => deck.id));
      const lastUsed = localStorage.getItem("xanki:lastUsedDeckId");
      if (lastUsed && !deckIds.has(lastUsed)) {
        localStorage.removeItem("xanki:lastUsedDeckId");
        void invoke("set_capture_deck_id", { deckId: null });
      } else if (lastUsed && deckIds.has(lastUsed)) {
        setSelectedDeckId(lastUsed);
      }
      const now = Date.now();
      const count = allCards.filter((card) => Number(card.dueAt ?? 0) <= now).length;
      setDueCount(count);
      setLibraryRevision((value) => value + 1);
      await invoke("update_tray_due_count", { count });
    } catch (e) {
      if (isCloudUnauthorized(e)) {
        await auth.syncFromSession();
      }
    }
  }, [auth.syncFromSession, setDecks, setDueCount, setSelectedDeckId]);

  const refreshLibraryRef = useRef(refreshLibrary);
  refreshLibraryRef.current = refreshLibrary;

  useEffect(() => {
    setLibraryRefreshHandler(() => refreshLibraryRef.current());
    return () => setLibraryRefreshHandler(null);
  }, []);

  const appApi = useMemo(
    () => createCloudAppApi(() => scheduleLibraryRefresh()),
    [],
  );

  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId) ?? null;

  const refreshPermissions = useCallback(async () => {
    setPermissions(await nativeApi.checkPermissions());
  }, []);

  const handleTabChange = useCallback(
    (nextTab: AppTab) => {
      setTab(nextTab);
      if (nextTab === "deckStudy") {
        void flushLibraryRefresh();
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
    },
    [setStudySessionActive],
  );

  useEffect(() => {
    setStudySessionActive(deckStudySession.active || leitnerSession.active);
  }, [deckStudySession.active, leitnerSession.active, setStudySessionActive]);

  useEffect(() => {
    void getCurrentWindow().setTheme("light");
  }, []);

  useEffect(() => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  useEffect(() => {
    if (!auth.loggedIn) return;
    void flushLibraryRefresh();
    void refreshPermissions();
  }, [auth.loggedIn, refreshPermissions]);

  useEffect(() => {
    if (!auth.loggedIn || decks.length === 0) return;
    const selectedExists = selectedDeckId
      ? decks.some((deck) => deck.id === selectedDeckId)
      : false;
    if (selectedExists) return;
    const lastUsed = localStorage.getItem("xanki:lastUsedDeckId");
    const pick =
      lastUsed && decks.some((deck) => deck.id === lastUsed)
        ? lastUsed
        : decks[0]?.id ?? null;
    setSelectedDeckId(pick);
  }, [auth.loggedIn, decks, selectedDeckId, setSelectedDeckId]);

  useEffect(() => {
    if (!selectedDeckId) return;
    localStorage.setItem("xanki:lastUsedDeckId", selectedDeckId);
    void invoke("set_capture_deck_id", { deckId: selectedDeckId });
  }, [selectedDeckId]);

  useEffect(() => {
    if (!auth.loggedIn) return;
    setRevisionErrorHandler((error) => {
      if (isCloudUnauthorized(error)) {
        void auth.syncFromSession();
      }
    });
    const releaseRevision = acquireRevisionSubscription(() => {
      scheduleLibraryRefresh();
    });

    return () => {
      setRevisionErrorHandler(null);
      releaseRevision();
    };
  }, [auth.loggedIn, auth.syncFromSession]);

  useEffect(() => {
    if (!auth.loggedIn) return;
    const unlistenLibrary = listen("xanki:library-changed", () => {
      void flushLibraryRefresh();
    });
    const unlistenNavigate = listen<string>("navigate", (event) => {
      const nextTab = resolveTab(event.payload);
      if (nextTab) handleTabChange(nextTab);
    });
    const unlistenCount = listen<number>("review-count-changed", (event) => {
      setDueCount(event.payload);
    });

    return () => {
      void unlistenLibrary.then((fn) => fn());
      void unlistenNavigate.then((fn) => fn());
      void unlistenCount.then((fn) => fn());
    };
  }, [auth.loggedIn, handleTabChange, setDueCount]);

  if (!auth.ready) {
    return <div className="empty-panel">読み込み中…</div>;
  }

  if (!auth.loggedIn) {
    return <LoginPage onLoggedIn={() => void auth.syncFromSession()} />;
  }

  if (!onboardingComplete) {
    return (
      <OnboardingView
        permissions={permissions}
        onComplete={() => setOnboardingComplete(true)}
        onRefreshPermissions={() => void refreshPermissions()}
      />
    );
  }

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
              libraryRevision={libraryRevision}
              onSessionChange={setDeckStudySession}
            />
          </AppTabLayer>
          <AppTabLayer active={tab === "leitner"}>
            <LeitnerStudyView
              decks={decks}
              dueCount={dueCount}
              libraryRevision={libraryRevision}
              onSessionChange={setLeitnerSession}
            />
          </AppTabLayer>
          {tab === "settings" && (
            <SettingsView
              permissions={permissions}
              onRefresh={() => void refreshPermissions()}
              cloudSection={<CloudSettingsSection />}
            />
          )}
        </AppShell>
      </AppShellProvider>
    </AppApiProvider>
  );
}
