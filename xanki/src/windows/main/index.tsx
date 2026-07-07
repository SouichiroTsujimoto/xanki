import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { HomeView } from "../../components/HomeView";
import { StudyView, type StudySessionInfo } from "../../components/study/StudyView";
import { SettingsView } from "../../components/SettingsView";
import { OnboardingView } from "../../components/OnboardingView";
import { api } from "../../lib/tauri/api";
import { useAppStore } from "../../stores/appStore";
import type { PermissionStatus } from "../../types";

type Tab = "home" | "study" | "settings";

const NAV: { id: Tab; label: string; hint: string }[] = [
  { id: "home", label: "Home", hint: "Decks" },
  { id: "study", label: "学習", hint: "Study" },
  { id: "settings", label: "設定", hint: "Prefs" },
];

const EMPTY_SESSION: StudySessionInfo = {
  active: false,
  modeLabel: null,
  exit: () => {},
};

function resolveTab(payload: string): Tab | null {
  switch (payload) {
    case "home":
    case "library":
      return "home";
    case "study":
    case "review":
      return "study";
    case "settings":
      return "settings";
    default:
      return null;
  }
}

export function MainApp() {
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

  const [tab, setTab] = useState<Tab>("home");
  const [studySession, setStudySession] = useState<StudySessionInfo>(EMPTY_SESSION);
  const [permissions, setPermissions] = useState<PermissionStatus>({
    accessibility: false,
    screenRecording: false,
  });

  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId) ?? null;

  const refreshDecks = useCallback(async () => {
    setDecks(await api.listDecks());
  }, [setDecks]);

  const refreshDueCount = useCallback(async () => {
    setDueCount(await api.getDueCount());
  }, [setDueCount]);

  const refreshPermissions = useCallback(async () => {
    setPermissions(await api.checkPermissions());
  }, []);

  const handleTabChange = useCallback(
    (nextTab: Tab) => {
      setTab(nextTab);
      if (nextTab !== "study") {
        setStudySession(EMPTY_SESSION);
        setStudySessionActive(false);
      }
    },
    [setStudySessionActive],
  );

  useEffect(() => {
    void getCurrentWindow().setTheme("light");
  }, []);

  useEffect(() => {
    void refreshDecks();
    void refreshDueCount();
    void refreshPermissions();
  }, [refreshDecks, refreshDueCount, refreshPermissions]);

  useEffect(() => {
    if (decks.length === 0) {
      if (selectedDeckId !== null) setSelectedDeckId(null);
      return;
    }

    const selectedExists = selectedDeckId
      ? decks.some((deck) => deck.id === selectedDeckId)
      : false;
    if (selectedExists) return;

    void (async () => {
      const lastUsed = await api.getLastUsedDeckId();
      const pick =
        lastUsed && decks.some((deck) => deck.id === lastUsed)
          ? lastUsed
          : decks[0]?.id ?? null;
      setSelectedDeckId(pick);
    })();
  }, [decks, selectedDeckId, setSelectedDeckId]);

  useEffect(() => {
    const unlistenNavigate = listen<string>("navigate", (event) => {
      const nextTab = resolveTab(event.payload);
      if (nextTab) handleTabChange(nextTab);
    });
    const unlistenCount = listen<number>("review-count-changed", (event) => {
      setDueCount(event.payload);
    });
    const unlistenLibrary = listen("library-changed", () => {
      void refreshDecks();
    });

    return () => {
      void unlistenNavigate.then((fn) => fn());
      void unlistenCount.then((fn) => fn());
      void unlistenLibrary.then((fn) => fn());
    };
  }, [handleTabChange, refreshDecks, setDueCount]);

  const frameClassName = [
    "app-frame",
    !sidebarOpen && "sidebar-collapsed",
    studySessionActive && "study-session-shell",
    studySessionActive && sidebarOpen && "sidebar-overlay-open",
  ]
    .filter(Boolean)
    .join(" ");

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
    <div className={frameClassName}>
      <aside className="app-rail">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden>
            x
          </div>
          <div className="brand-copy">
            <strong>xanki</strong>
            <span>mask & recall</span>
          </div>
        </div>

        <nav className="rail-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rail-link ${tab === item.id ? "active" : ""}`}
              onClick={() => handleTabChange(item.id)}
            >
              <span className="rail-link-label">{item.label}</span>
              <span className="rail-link-hint">{item.hint}</span>
              {item.id === "study" && dueCount > 0 && (
                <span className="rail-badge">{dueCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="rail-shortcuts">
          <p className="rail-section-title">Capture</p>
          <div className="shortcut-chip">
            <kbd>⌥⌘M</kbd>
            <span>テキスト</span>
          </div>
          <div className="shortcut-chip">
            <kbd>⌥⌘S</kbd>
            <span>スクショ</span>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span aria-hidden>☰</span>
          </button>

          <div className="topbar-copy">
            <p className="eyebrow">
              {tab === "home" ? "Home" : tab === "study" ? "Study" : "Settings"}
            </p>
            <h1>
              {tab === "home" && "デッキ管理"}
              {tab === "study" &&
                (studySession.active && studySession.modeLabel
                  ? studySession.modeLabel
                  : selectedDeck?.name ?? "学習")}
              {tab === "settings" && "設定"}
            </h1>
          </div>

          <div className="topbar-actions">
            {tab === "study" && studySession.active && (
              <button
                type="button"
                className="ghost-button study-back-button"
                onClick={studySession.exit}
              >
                戻る
              </button>
            )}
            {tab === "study" && !studySession.active && (
              <label className="search-field">
                <span className="sr-only">検索</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="カードを検索..."
                />
              </label>
            )}
            {tab === "study" && !studySession.active && dueCount > 0 && (
              <div className="due-banner">
                <span className="due-banner-count">{dueCount}</span>
                <span>件が復習待ち</span>
              </div>
            )}
          </div>
        </header>

        <div className="app-content">
          {tab === "home" && (
            <HomeView
              decks={decks}
              selectedDeckId={selectedDeckId}
              dueCount={dueCount}
              onSelectDeck={setSelectedDeckId}
              onRefreshDecks={() => void refreshDecks()}
              onGoToStudy={() => handleTabChange("study")}
            />
          )}
          {tab === "study" && (
            <StudyView
              deckId={selectedDeckId}
              searchQuery={searchQuery}
              onRefreshDecks={() => void refreshDecks()}
              onSessionChange={setStudySession}
            />
          )}
          {tab === "settings" && (
            <SettingsView
              permissions={permissions}
              onRefresh={() => void refreshPermissions()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
