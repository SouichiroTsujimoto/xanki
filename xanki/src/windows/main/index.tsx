import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  AppApiProvider,
  AppShell,
  AppShellProvider,
  AppTabLayer,
  BootstrapLoading,
  CloudAccountSection,
  DeckStudyView,
  HomeView,
  LeitnerStudyView,
  OnboardingView,
  SettingsView,
  useMainAppState,
  type AppTab,
  type PermissionStatus,
} from "@xanki/ui";
import { isCloudUnauthorized, mapApiDeck } from "@xanki/shared";
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
import { LoginPage } from "./LoginPage";

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
    <CloudAccountSection
      email={cloudAccount.accountEmail}
      statusNote={cloudAccount.status}
      error={cloudAccount.error}
      onUpgrade={() => void cloudAccount.upgrade()}
      onLogout={() => void cloudAccount.logout()}
    />
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

  const [permissions, setPermissions] = useState<PermissionStatus>({
    accessibility: false,
    screenRecording: false,
  });

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
      void flushLibraryRefresh();
    },
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
      setDecks(deckList.map(mapApiDeck));
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
      bumpCollectionRevision();
      await invoke("update_tray_due_count", { count });
    } catch (e) {
      if (isCloudUnauthorized(e)) {
        await auth.syncFromSession();
      }
    }
  }, [auth.syncFromSession, bumpCollectionRevision, setDecks, setDueCount, setSelectedDeckId]);

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
    const unlistenLibrary = listen("xanki:data-changed", () => {
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
    return <BootstrapLoading />;
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
