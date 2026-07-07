import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LibraryView } from "../../components/LibraryView";
import { StudyView } from "../../components/study/StudyView";
import { SettingsView } from "../../components/SettingsView";
import { OnboardingView } from "../../components/OnboardingView";
import { api } from "../../lib/tauri/api";
import { useAppStore } from "../../stores/appStore";
import type { PermissionStatus } from "../../types";

type Tab = "library" | "review" | "settings";

const NAV: { id: Tab; label: string; hint: string }[] = [
  { id: "library", label: "ライブラリ", hint: "Cards" },
  { id: "review", label: "学習", hint: "Study" },
  { id: "settings", label: "設定", hint: "Prefs" },
];

export function MainApp() {
  const {
    dueCount,
    decks,
    selectedDeckId,
    searchQuery,
    onboardingComplete,
    setDueCount,
    setDecks,
    setSelectedDeckId,
    setSearchQuery,
    setOnboardingComplete,
  } = useAppStore();

  const [tab, setTab] = useState<Tab>("library");
  const [permissions, setPermissions] = useState<PermissionStatus>({
    accessibility: false,
    screenRecording: false,
  });

  const refreshDecks = useCallback(async () => {
    setDecks(await api.listDecks());
  }, [setDecks]);

  const refreshDueCount = useCallback(async () => {
    setDueCount(await api.getDueCount());
  }, [setDueCount]);

  const refreshPermissions = useCallback(async () => {
    setPermissions(await api.checkPermissions());
  }, []);

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
      if (
        event.payload === "library" ||
        event.payload === "review" ||
        event.payload === "settings"
      ) {
        setTab(event.payload);
      }
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
  }, [refreshDecks, setDueCount]);

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
    <div className="app-frame">
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
              onClick={() => setTab(item.id)}
            >
              <span className="rail-link-label">{item.label}</span>
              <span className="rail-link-hint">{item.hint}</span>
              {item.id === "review" && dueCount > 0 && (
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
          <div className="topbar-copy">
            <p className="eyebrow">
              {tab === "library" ? "Library" : tab === "review" ? "Study" : "Settings"}
            </p>
            <h1>
              {tab === "library" && "カードライブラリ"}
              {tab === "review" && "学習モード"}
              {tab === "settings" && "設定"}
            </h1>
          </div>
          {tab === "library" && (
            <label className="search-field">
              <span className="sr-only">検索</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="カードを検索..."
              />
            </label>
          )}
          {tab === "review" && dueCount > 0 && (
            <div className="due-banner">
              <span className="due-banner-count">{dueCount}</span>
              <span>件が復習待ち</span>
            </div>
          )}
        </header>

        <div className="app-content">
          {tab === "library" && (
            <LibraryView
              decks={decks}
              selectedDeckId={selectedDeckId}
              searchQuery={searchQuery}
              onSelectDeck={setSelectedDeckId}
              onRefreshDecks={() => void refreshDecks()}
            />
          )}
          {tab === "review" && <StudyView deckId={selectedDeckId} />}
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
