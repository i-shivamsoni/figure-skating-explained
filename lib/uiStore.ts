"use client";

import { create } from "zustand";

interface UiState {
  /** The "Your skater" appearance drawer. */
  skaterDrawer: boolean;
  openSkaterDrawer: () => void;
  closeSkaterDrawer: () => void;
  /** The keyboard shortcuts panel. */
  shortcuts: boolean;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  /** Bumps to show the rink's first-visit intro again. */
  rinkIntroVersion: number;
  showRinkIntro: () => void;
}

/** Site-wide UI state that is not persisted. */
export const useUiStore = create<UiState>()((set) => ({
  skaterDrawer: false,
  openSkaterDrawer: () => set({ skaterDrawer: true }),
  closeSkaterDrawer: () => set({ skaterDrawer: false }),
  shortcuts: false,
  openShortcuts: () => set({ shortcuts: true }),
  closeShortcuts: () => set({ shortcuts: false }),
  rinkIntroVersion: 0,
  showRinkIntro: () => set((s) => ({ rinkIntroVersion: s.rinkIntroVersion + 1, shortcuts: false })),
}));
