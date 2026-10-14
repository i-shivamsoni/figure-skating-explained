"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SkaterVariant = "female" | "male";

interface SkaterState {
  variant: SkaterVariant;
  setVariant: (v: SkaterVariant) => void;
}

/** Which character model every viewer on the site uses; remembered per browser. */
export const useSkaterStore = create<SkaterState>()(
  persist((set) => ({ variant: "female", setVariant: (variant) => set({ variant }) }), { name: "fse-skater" }),
);

export function skaterUrl(variant: SkaterVariant): string {
  return `/models/skater-${variant}.glb`;
}
