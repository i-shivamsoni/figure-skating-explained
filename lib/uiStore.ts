"use client";

import { create } from "zustand";

interface UiState {
  /** The "Your skater" appearance drawer. */
  skaterDrawer: boolean;
  openSkaterDrawer: () => void;
  closeSkaterDrawer: () => void;
}

/** Site-wide UI state that is not persisted. */
export const useUiStore = create<UiState>()((set) => ({
  skaterDrawer: false,
  openSkaterDrawer: () => set({ skaterDrawer: true }),
  closeSkaterDrawer: () => set({ skaterDrawer: false }),
}));
