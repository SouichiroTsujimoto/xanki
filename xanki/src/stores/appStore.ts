import { create } from "zustand";
import type { Deck } from "../types";

interface AppStore {
  dueCount: number;
  decks: Deck[];
  selectedDeckId: string | null;
  searchQuery: string;
  onboardingComplete: boolean;
  setDueCount: (count: number) => void;
  setDecks: (decks: Deck[]) => void;
  setSelectedDeckId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setOnboardingComplete: (value: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  dueCount: 0,
  decks: [],
  selectedDeckId: null,
  searchQuery: "",
  onboardingComplete: localStorage.getItem("xanki-onboarding") === "done",
  setDueCount: (dueCount) => set({ dueCount }),
  setDecks: (decks) => set({ decks }),
  setSelectedDeckId: (selectedDeckId) => set({ selectedDeckId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setOnboardingComplete: (value) => {
    localStorage.setItem("xanki-onboarding", value ? "done" : "");
    set({ onboardingComplete: value });
  },
}));
