import { useCallback, useEffect, useRef, useState } from "react";
import type { AppTab } from "../components/xanki/app-shell";
import type { StudySessionInfo } from "../components/xanki/study/deck-study-view";

const EMPTY_SESSION: StudySessionInfo = {
  active: false,
  modeLabel: null,
  exit: () => {},
};

export interface UseMainAppStateOptions {
  setStudySessionActive: (active: boolean) => void;
  onEnterDeckStudyTab?: () => void;
}

export function useMainAppState({
  setStudySessionActive,
  onEnterDeckStudyTab,
}: UseMainAppStateOptions) {
  const [tab, setTab] = useState<AppTab>("home");
  const [deckStudySession, setDeckStudySession] = useState<StudySessionInfo>(EMPTY_SESSION);
  const [leitnerSession, setLeitnerSession] = useState<StudySessionInfo>(EMPTY_SESSION);
  const [collectionRevision, setCollectionRevision] = useState(0);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const handleTabChange = useCallback(
    (nextTab: AppTab) => {
      const previousTab = tabRef.current;
      if (nextTab === previousTab) return;
      setTab(nextTab);
      if (nextTab === "deckStudy" && previousTab !== "deckStudy") {
        onEnterDeckStudyTab?.();
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
    [onEnterDeckStudyTab, setStudySessionActive],
  );

  useEffect(() => {
    setStudySessionActive(deckStudySession.active || leitnerSession.active);
  }, [deckStudySession.active, leitnerSession.active, setStudySessionActive]);

  const bumpCollectionRevision = useCallback(() => {
    setCollectionRevision((value) => value + 1);
  }, []);

  return {
    tab,
    handleTabChange,
    deckStudySession,
    setDeckStudySession,
    leitnerSession,
    setLeitnerSession,
    collectionRevision,
    bumpCollectionRevision,
  };
}
