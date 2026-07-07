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

export type AppTab = "home" | "study" | "settings";

const NAV: { id: AppTab; label: string; hint: string }[] = [
  { id: "home", label: copy.nav.home, hint: copy.nav.homeHint },
  { id: "study", label: copy.nav.study, hint: copy.nav.studyHint },
  { id: "settings", label: copy.nav.settings, hint: copy.nav.settingsHint },
];

export interface AppShellProps {
  tab: AppTab;
  onTabChange: (tab: AppTab) => void;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  studySessionActive: boolean;
  studySessionModeLabel: string | null;
  onStudySessionExit: () => void;
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
  studySessionModeLabel,
  onStudySessionExit,
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

  const railContent = (
    <>
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

      {showCaptureShortcuts && (
        <div className="rail-shortcuts">
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
          initial={false}
          animate={{ x: sidebarOpen ? "0%" : "-100%" }}
          transition={drawerTransition}
        >
          {railContent}
        </motion.aside>
      ) : (
        <aside className="app-rail">{railContent}</aside>
      )}

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarOpen ? copy.sidebar.close : copy.sidebar.open}
            onClick={() => onSidebarOpenChange(!sidebarOpen)}
          >
            <span aria-hidden>☰</span>
          </button>

          <div className="topbar-copy">
            <p className="eyebrow">
              {tab === "home"
                ? copy.topbar.home
                : tab === "study"
                  ? copy.topbar.studyDefault
                  : copy.topbar.settings}
            </p>
            <h1>
              {tab === "home" && copy.topbar.home}
              {tab === "study" &&
                (studySessionActive && studySessionModeLabel
                  ? studySessionModeLabel
                  : selectedDeck?.name ?? copy.topbar.studyDefault)}
              {tab === "settings" && copy.topbar.settings}
            </h1>
          </div>

          <div className="topbar-actions">
            {tab === "study" && studySessionActive && (
              <button
                type="button"
                className="ghost-button study-back-button"
                onClick={onStudySessionExit}
              >
                {copy.study.back}
              </button>
            )}
            {tab === "study" && !studySessionActive && (
              <label className="search-field">
                <span className="sr-only">{copy.common.search}</span>
                <input
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder={copy.study.searchPlaceholder}
                />
              </label>
            )}
            {tab === "study" && !studySessionActive && dueCount > 0 && (
              <div className="due-banner">
                <span className="due-banner-count">{dueCount}</span>
                <span>{copy.study.dueBannerSuffix}</span>
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
