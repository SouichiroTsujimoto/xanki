import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { AppTabTransition } from "../motion/app-tab-transition";
import { copy } from "../../copy";
import {
  springDrawer,
  transitionForReduced,
} from "../../lib/motion-presets";
import { useReducedMotion } from "../../lib/use-reduced-motion";
import type { Deck } from "../../types";
import xankiLogo from "../../assets/xanki-logo.png";

const NARROW_BREAKPOINT = "(max-width: 900px)";

function useNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(NARROW_BREAKPOINT).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(NARROW_BREAKPOINT);
    const update = () => setIsNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isNarrow;
}

export type AppTab = "home" | "deckStudy" | "leitner" | "settings";

const NAV: { id: AppTab; label: string; hint: string }[] = [
  { id: "home", label: copy.nav.home, hint: copy.nav.homeHint },
  { id: "deckStudy", label: copy.nav.deckStudy, hint: copy.nav.deckStudyHint },
  { id: "leitner", label: copy.nav.leitner, hint: copy.nav.leitnerHint },
  { id: "settings", label: copy.nav.settings, hint: copy.nav.settingsHint },
];

export interface AppShellProps {
  tab: AppTab;
  onTabChange: (tab: AppTab) => void;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  studySessionActive: boolean;
  deckStudySessionActive: boolean;
  deckStudySessionModeLabel: string | null;
  onDeckStudySessionExit: () => void;
  leitnerSessionActive: boolean;
  leitnerSessionModeLabel: string | null;
  onLeitnerSessionExit: () => void;
  dueCount: number;
  selectedDeck: Deck | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  children: ReactNode;
  showCaptureShortcuts?: boolean;
}

export function AppShell({
  tab,
  onTabChange,
  sidebarOpen,
  onSidebarOpenChange,
  studySessionActive,
  deckStudySessionActive,
  deckStudySessionModeLabel,
  onDeckStudySessionExit,
  leitnerSessionActive,
  leitnerSessionModeLabel,
  onLeitnerSessionExit,
  dueCount,
  selectedDeck,
  searchQuery,
  onSearchQueryChange,
  children,
  showCaptureShortcuts = true,
}: AppShellProps) {
  const isNarrow = useNarrowViewport();
  const reduced = useReducedMotion();
  const drawerTransition = transitionForReduced(reduced, springDrawer);

  const handleTabChange = (nextTab: AppTab) => {
    if (nextTab === tab) return;
    onTabChange(nextTab);
    if (isNarrow) {
      onSidebarOpenChange(false);
    }
  };

  const frameClassName = [
    "app-frame",
    isNarrow && "app-frame-narrow",
    !sidebarOpen && "sidebar-collapsed",
    studySessionActive && "study-session-shell",
    studySessionActive && sidebarOpen && "sidebar-overlay-open",
  ]
    .filter(Boolean)
    .join(" ");

  const topbarEyebrow =
    tab === "home"
      ? copy.topbar.home
      : tab === "deckStudy"
        ? copy.topbar.deckStudyDefault
        : tab === "leitner"
          ? copy.topbar.leitnerDefault
          : copy.topbar.settings;

  const topbarTitle =
    tab === "home"
      ? copy.topbar.home
      : tab === "deckStudy"
        ? deckStudySessionActive && deckStudySessionModeLabel
          ? deckStudySessionModeLabel
          : (selectedDeck?.name ?? copy.topbar.deckStudyDefault)
        : tab === "leitner"
          ? leitnerSessionActive && leitnerSessionModeLabel
            ? leitnerSessionModeLabel
            : copy.topbar.leitnerDefault
          : copy.topbar.settings;

  const railContent = (
    <>
      <div className="brand-block">
        <div className="brand-mark" aria-hidden>
          <img src={xankiLogo} alt="" />
        </div>
        <div className="brand-copy">
          <strong>xanki</strong>
          <span>mask & recall</span>
        </div>
      </div>

      <nav className="rail-nav" data-tauri-drag-region="false">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rail-link ${tab === item.id ? "active" : ""}`}
            data-tauri-drag-region="false"
            onClick={() => handleTabChange(item.id)}
          >
            <span className="rail-link-label">{item.label}</span>
            <span className="rail-link-hint">{item.hint}</span>
            {item.id === "leitner" && dueCount > 0 && (
              <span className="rail-badge">{dueCount}</span>
            )}
          </button>
        ))}
      </nav>

      {showCaptureShortcuts && (
        <div className="rail-shortcuts" data-tauri-drag-region="false">
          <p className="rail-section-title">{copy.sidebar.captureSection}</p>
          <div className="shortcut-chip">
            <kbd>⌥⌘M</kbd>
            <span>{copy.sidebar.textCapture}</span>
          </div>
          <div className="shortcut-chip">
            <kbd>⌥⌘S</kbd>
            <span>{copy.sidebar.screenshotCapture}</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className={frameClassName}>
      {isNarrow && (
        <motion.button
          type="button"
          className="sidebar-scrim"
          aria-label={copy.sidebar.closeScrim}
          initial={false}
          animate={{ opacity: sidebarOpen ? 1 : 0 }}
          transition={drawerTransition}
          style={{ pointerEvents: sidebarOpen ? "auto" : "none" }}
          onClick={() => onSidebarOpenChange(false)}
        />
      )}
      {isNarrow ? (
        <motion.aside
          className="app-rail app-rail-motion"
          data-tauri-drag-region
          initial={false}
          animate={{ x: sidebarOpen ? "0%" : "-100%" }}
          transition={drawerTransition}
        >
          {railContent}
        </motion.aside>
      ) : (
        <aside className="app-rail" data-tauri-drag-region>
          {railContent}
        </aside>
      )}

      <div className="app-main">
        <header className="app-topbar" data-tauri-drag-region>
          <button
            type="button"
            className="sidebar-toggle"
            data-tauri-drag-region="false"
            aria-label={sidebarOpen ? copy.sidebar.close : copy.sidebar.open}
            onClick={() => onSidebarOpenChange(!sidebarOpen)}
          >
            <span aria-hidden>☰</span>
          </button>

          <div className="topbar-copy">
            <p className="eyebrow">{topbarEyebrow}</p>
            <h1>{topbarTitle}</h1>
          </div>

          <div className="topbar-actions" data-tauri-drag-region="false">
            {tab === "deckStudy" && deckStudySessionActive && (
              <button
                type="button"
                className="ghost-button study-back-button"
                data-tauri-drag-region="false"
                onClick={onDeckStudySessionExit}
              >
                {copy.deckStudy.back}
              </button>
            )}
            {tab === "leitner" && leitnerSessionActive && (
              <button
                type="button"
                className="ghost-button study-back-button"
                data-tauri-drag-region="false"
                onClick={onLeitnerSessionExit}
              >
                {copy.leitnerStudy.back}
              </button>
            )}
            {tab === "deckStudy" && !deckStudySessionActive && (
              <label className="search-field" data-tauri-drag-region="false">
                <span className="sr-only">{copy.common.search}</span>
                <input
                  data-tauri-drag-region="false"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder={copy.deckStudy.searchPlaceholder}
                />
              </label>
            )}
            {tab === "leitner" && !leitnerSessionActive && dueCount > 0 && (
              <div className="due-banner">
                <span className="due-banner-count">{dueCount}</span>
                <span>{copy.leitnerStudy.dueBannerSuffix}</span>
              </div>
            )}
          </div>
        </header>

        <div className="app-content">
          <AppTabTransition tab={tab}>{children}</AppTabTransition>
        </div>
      </div>
    </div>
  );
}
