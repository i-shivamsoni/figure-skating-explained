"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SkaterVariant = "female" | "male";

/**
 * Costume contract (Wave 0). The GLBs built by tools/blender/build_skater.py must keep these
 * material names, because the viewer recolours them at runtime by name: "top" (dress bodice /
 * shirt), "skirt" (female only), "legs" (tights / trousers), "glove", "boot", "hair".
 * Everything else in the model (skin, blades, laces, soles, eyelets, plates) keeps its built-in
 * colour. Colours are CSS hex strings; a preset that leaves a material out keeps the GLB colour.
 */
export const COSTUME_MATERIALS = ["top", "skirt", "legs", "glove", "boot", "hair"] as const;
export type CostumeMaterial = (typeof COSTUME_MATERIALS)[number];

export interface CostumeChoice {
  id: string;
  label: string;
  colours: Partial<Record<CostumeMaterial, string>>;
}

/** Presets offered in the viewer's Costume control, per model. The first one is the GLB's own look. */
export const COSTUME_PRESETS: Record<SkaterVariant, CostumeChoice[]> = {
  female: [
    { id: "classic", label: "Classic black", colours: {} },
    { id: "ruby", label: "Ruby", colours: { top: "#8f1230", skirt: "#8f1230", glove: "#8f1230" } },
    { id: "navy", label: "Navy", colours: { top: "#16264d", skirt: "#16264d", glove: "#16264d" } },
    { id: "ivory", label: "Ivory", colours: { top: "#f1ead9", skirt: "#f1ead9", glove: "#f1ead9", boot: "#f5f3ee" } },
    { id: "emerald", label: "Emerald", colours: { top: "#0f5a3f", skirt: "#0f5a3f", glove: "#0f5a3f" } },
  ],
  male: [
    { id: "classic", label: "Charcoal", colours: {} },
    { id: "midnight", label: "Midnight blue", colours: { top: "#1b2a4a", legs: "#0c1324" } },
    { id: "burgundy", label: "Burgundy", colours: { top: "#5a1424", legs: "#120a0e" } },
    { id: "white", label: "White shirt", colours: { top: "#ece9e4", legs: "#101014" } },
  ],
};

export function costumeFor(variant: SkaterVariant, id: string): CostumeChoice {
  const list = COSTUME_PRESETS[variant];
  return list.find((c) => c.id === id) ?? list[0];
}

interface SkaterState {
  variant: SkaterVariant;
  setVariant: (v: SkaterVariant) => void;
  /** Chosen costume preset id per model. */
  costume: Record<SkaterVariant, string>;
  setCostume: (variant: SkaterVariant, id: string) => void;
}

/** Which character model every viewer on the site uses, and its costume; remembered per browser. */
export const useSkaterStore = create<SkaterState>()(
  persist(
    (set) => ({
      variant: "female",
      setVariant: (variant) => set({ variant }),
      costume: { female: "classic", male: "classic" },
      setCostume: (variant, id) => set((s) => ({ costume: { ...s.costume, [variant]: id } })),
    }),
    { name: "fse-skater", version: 1, migrate: (state) => ({ costume: { female: "classic", male: "classic" }, ...(state as object) }) },
  ),
);

export function skaterUrl(variant: SkaterVariant): string {
  return `/models/skater-${variant}.glb`;
}
