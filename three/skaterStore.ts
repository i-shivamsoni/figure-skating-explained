"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SkaterVariant = "female" | "male";

/*
 * GLB contract (overhaul Wave 0). tools/blender/build_skater.py must keep these names, because
 * the viewer recolours materials and shows variant meshes by name at runtime:
 * - materials: skin, hair, top (bodice / shirt), skirt (woman), legs (tights / trousers), glove,
 *   boot, sleeve_upper (shoulder to elbow), sleeve_lower (elbow to wrist). Sleeve length is a
 *   recolour (top colour or skin); gloves off recolours "glove" to the skin.
 * - variant nodes: hair.<style> (hair.ponytail.<length>, hair.loose.<length>), skirt.short,
 *   skirt.long. Exactly one hair node and at most one skirt node are visible.
 * - the GLB's built-in colours equal the default appearance below (the Blender palette uses the
 *   same hex values through srgb()), so the default look renders the same stills as before.
 * Bone names (three/rig/bones.ts) and the bind pose stay the hard contract they already were.
 */
export const GLB_MATERIALS = ["skin", "hair", "top", "skirt", "legs", "glove", "boot", "sleeve_upper", "sleeve_lower"] as const;
export type GlbMaterial = (typeof GLB_MATERIALS)[number];

export const HAIR_STYLES = {
  female: ["lowBun", "highBun", "ponytail", "loose", "bob"],
  male: ["quiff", "crop", "sidePart", "sweptBack"],
} as const;
export type HairStyle = (typeof HAIR_STYLES)["female"][number] | (typeof HAIR_STYLES)["male"][number];
export const HAIR_LENGTHS = ["short", "medium", "long"] as const;
export type HairLength = (typeof HAIR_LENGTHS)[number];
/** Styles that come in three lengths. */
export const HAIR_WITH_LENGTH: readonly HairStyle[] = ["ponytail", "loose"];
export const HAIR_LABELS: Record<HairStyle, string> = {
  lowBun: "Low bun",
  highBun: "High bun",
  ponytail: "Ponytail",
  loose: "Loose",
  bob: "Bob",
  quiff: "Quiff",
  crop: "Short crop",
  sidePart: "Side part",
  sweptBack: "Swept back",
};

export type Sleeves = "none" | "short" | "long";
export type Skirt = "short" | "long" | "none";
export const SLEEVES: { id: Sleeves; label: string }[] = [
  { id: "none", label: "Sleeveless" },
  { id: "short", label: "Short" },
  { id: "long", label: "Long" },
];
export const SKIRTS: { id: Skirt; label: string }[] = [
  { id: "short", label: "Short" },
  { id: "long", label: "Long" },
  { id: "none", label: "None" },
];

export function hairNode(style: HairStyle, length: HairLength = "medium"): string {
  return HAIR_WITH_LENGTH.includes(style) ? `hair.${style}.${length}` : `hair.${style}`;
}

export const skirtNode = (skirt: Skirt): string | undefined => (skirt === "none" ? undefined : `skirt.${skirt}`);

/** Every variant node a body's GLB must carry. */
export function variantNodes(variant: SkaterVariant): string[] {
  const hair = HAIR_STYLES[variant].flatMap((s) => (HAIR_WITH_LENGTH.includes(s) ? HAIR_LENGTHS.map((l) => hairNode(s, l)) : [hairNode(s)]));
  return variant === "female" ? [...hair, "skirt.short", "skirt.long"] : hair;
}

/* ---------------------------------------------------------------- appearance */

export type OutfitPiece = "top" | "skirt" | "legs" | "glove" | "boot";
export type OutfitColours = Record<OutfitPiece, string>;
export const OUTFIT_PIECES: { id: OutfitPiece; label: Record<SkaterVariant, string> }[] = [
  { id: "top", label: { female: "Dress", male: "Shirt" } },
  { id: "skirt", label: { female: "Skirt", male: "Skirt" } },
  { id: "legs", label: { female: "Tights", male: "Trousers" } },
  { id: "glove", label: { female: "Gloves", male: "Gloves" } },
  { id: "boot", label: { female: "Boots", male: "Boots" } },
];

export interface Appearance {
  /** CSS hex colours throughout. */
  skin: string;
  hair: { style: HairStyle; length: HairLength; colour: string };
  outfit: { sleeves: Sleeves; skirt: Skirt; gloves: boolean; colours: OutfitColours };
}

export interface AppearancePatch {
  skin?: string;
  hair?: Partial<Appearance["hair"]>;
  outfit?: Partial<Omit<Appearance["outfit"], "colours">> & { colours?: Partial<OutfitColours> };
}

export function mergeAppearance(base: Appearance, patch: AppearancePatch): Appearance {
  return {
    skin: patch.skin ?? base.skin,
    hair: { ...base.hair, ...patch.hair },
    outfit: { ...base.outfit, ...patch.outfit, colours: { ...base.outfit.colours, ...patch.outfit?.colours } },
  };
}

export interface ColourSwatch {
  id: string;
  hex: string;
  label: string;
}

/** The GLB's own colours (linear Blender values converted to sRGB). */
const BUILT = {
  skin: "#e5c5b3",
  femaleTop: "#353038",
  tights: "#e7cbbc",
  glove: "#303035",
  auburn: "#95593f",
  whiteBoot: "#f7f5f1",
  maleTop: "#59595d",
  maleLegs: "#38383f",
  darkHair: "#4b3c35",
  blackBoot: "#3f3f45",
};

export const SKIN_TONES: ColourSwatch[] = [
  { id: "porcelain", hex: "#f4dccb", label: "Porcelain" },
  { id: "fair", hex: BUILT.skin, label: "Fair" },
  { id: "tan", hex: "#d1a07f", label: "Tan" },
  { id: "olive", hex: "#b7855c", label: "Olive" },
  { id: "brown", hex: "#8a5a3c", label: "Brown" },
  { id: "deep", hex: "#4e3122", label: "Deep" },
];

export const HAIR_COLOURS: ColourSwatch[] = [
  { id: "black", hex: "#1c1a1d", label: "Black" },
  { id: "dark", hex: BUILT.darkHair, label: "Dark brown" },
  { id: "auburn", hex: BUILT.auburn, label: "Auburn" },
  { id: "chestnut", hex: "#6b4228", label: "Chestnut" },
  { id: "red", hex: "#a8402a", label: "Red" },
  { id: "blonde", hex: "#d8b571", label: "Blonde" },
  { id: "platinum", hex: "#ebdfc4", label: "Platinum" },
  { id: "grey", hex: "#9a9a9c", label: "Grey" },
];

export const OUTFIT_COLOURS: ColourSwatch[] = [
  { id: "black", hex: BUILT.femaleTop, label: "Black" },
  { id: "charcoal", hex: BUILT.maleTop, label: "Charcoal" },
  { id: "white", hex: "#ece9e4", label: "White" },
  { id: "ivory", hex: "#f1ead9", label: "Ivory" },
  { id: "ruby", hex: "#8f1230", label: "Ruby" },
  { id: "navy", hex: "#16264d", label: "Navy" },
  { id: "emerald", hex: "#0f5a3f", label: "Emerald" },
  { id: "lilac", hex: "#8c6bb1", label: "Lilac" },
  { id: "gold", hex: "#c9a227", label: "Gold" },
  { id: "teal", hex: "#1b7f8c", label: "Teal" },
  { id: "tights", hex: BUILT.tights, label: "Tights" },
];

export function defaultAppearance(variant: SkaterVariant): Appearance {
  return variant === "female"
    ? {
        skin: BUILT.skin,
        hair: { style: "lowBun", length: "medium", colour: BUILT.auburn },
        outfit: { sleeves: "none", skirt: "short", gloves: true, colours: { top: BUILT.femaleTop, skirt: BUILT.femaleTop, legs: BUILT.tights, glove: BUILT.glove, boot: BUILT.whiteBoot } },
      }
    : {
        skin: BUILT.skin,
        hair: { style: "quiff", length: "medium", colour: BUILT.darkHair },
        outfit: { sleeves: "short", skirt: "none", gloves: true, colours: { top: BUILT.maleTop, skirt: BUILT.maleTop, legs: BUILT.maleLegs, glove: BUILT.glove, boot: BUILT.blackBoot } },
      };
}

export interface Look {
  id: string;
  label: string;
  variant: SkaterVariant;
  appearance: Appearance;
}

const look = (variant: SkaterVariant, id: string, label: string, patch: AppearancePatch): Look => ({ id, label, variant, appearance: mergeAppearance(defaultAppearance(variant), patch) });
const dress = (top: string, extra: AppearancePatch = {}): AppearancePatch => mergeAppearance(defaultAppearance("female"), { outfit: { colours: { top, skirt: top, glove: top } } }) && { ...extra, outfit: { ...extra.outfit, colours: { top, skirt: top, glove: top, ...extra.outfit?.colours } } };

/** Preset looks per body. The first one is the GLB's own look (ids kept from the v1 costume presets). */
export const LOOKS: Record<SkaterVariant, Look[]> = {
  female: [
    look("female", "classic", "Classic black", {}),
    look("female", "ruby", "Ruby", dress("#8f1230")),
    look("female", "navy", "Navy", dress("#16264d")),
    look("female", "ivory", "Ivory", dress("#f1ead9", { outfit: { colours: { boot: "#f5f3ee" } } })),
    look("female", "emerald", "Emerald", dress("#0f5a3f")),
    look("female", "unitard", "Black unitard", { hair: { style: "ponytail", length: "long" }, outfit: { sleeves: "long", skirt: "none", colours: { legs: BUILT.femaleTop } } }),
    look("female", "ballet", "Ivory ballet", dress("#f1ead9", { hair: { style: "highBun" }, outfit: { sleeves: "short", skirt: "long", colours: { boot: "#f5f3ee" } } })),
    look("female", "crimson", "Crimson, hair down", dress("#a8162f", { hair: { style: "loose", length: "long", colour: "#1c1a1d" }, outfit: { sleeves: "long", gloves: false } })),
  ],
  male: [
    look("male", "classic", "Charcoal", {}),
    look("male", "midnight", "Midnight blue", { outfit: { colours: { top: "#1b2a4a", legs: "#0c1324" } } }),
    look("male", "burgundy", "Burgundy", { outfit: { colours: { top: "#5a1424", legs: "#120a0e" } } }),
    look("male", "white", "White shirt", { outfit: { colours: { top: "#ece9e4", legs: "#101014" } } }),
    look("male", "sprint", "Black, long sleeves", { hair: { style: "crop" }, outfit: { sleeves: "long", colours: { top: "#1c1a1d", legs: "#1c1a1d" } } }),
    look("male", "navyBack", "Navy, swept back", { hair: { style: "sweptBack" }, outfit: { sleeves: "long", gloves: false, colours: { top: "#16264d", legs: "#0c1324" } } }),
  ],
};

export function lookFor(variant: SkaterVariant, id: string): Look {
  const list = LOOKS[variant];
  return list.find((l) => l.id === id) ?? list[0];
}

/* ---------------------------------------------------------------- store */

interface SkaterState {
  variant: SkaterVariant;
  setVariant: (v: SkaterVariant) => void;
  appearance: Record<SkaterVariant, Appearance>;
  setAppearance: (variant: SkaterVariant, patch: AppearancePatch) => void;
  /** Applies a preset look to its body (and shows that body). */
  applyLook: (id: string, variant?: SkaterVariant) => void;
  resetAppearance: (variant: SkaterVariant) => void;
}

export const DEFAULT_APPEARANCES: Record<SkaterVariant, Appearance> = { female: defaultAppearance("female"), male: defaultAppearance("male") };

/** Upgrades a persisted state from any earlier version (v0/v1 kept a costume preset id per body). */
export function migrateSkaterState(persisted: unknown, version: number): { variant: SkaterVariant; appearance: Record<SkaterVariant, Appearance> } {
  const s = (persisted ?? {}) as { variant?: SkaterVariant; costume?: Partial<Record<SkaterVariant, string>>; appearance?: Partial<Record<SkaterVariant, Appearance>> };
  const variant: SkaterVariant = s.variant === "male" ? "male" : "female";
  if (version >= 2 && s.appearance) {
    return { variant, appearance: { female: mergeAppearance(DEFAULT_APPEARANCES.female, s.appearance.female ?? {}), male: mergeAppearance(DEFAULT_APPEARANCES.male, s.appearance.male ?? {}) } };
  }
  return {
    variant,
    appearance: { female: lookFor("female", s.costume?.female ?? "classic").appearance, male: lookFor("male", s.costume?.male ?? "classic").appearance },
  };
}

/** Which character model every viewer on the site uses, and how she or he looks; remembered per browser. */
export const useSkaterStore = create<SkaterState>()(
  persist(
    (set) => ({
      variant: "female",
      setVariant: (variant) => set({ variant }),
      appearance: DEFAULT_APPEARANCES,
      setAppearance: (variant, patch) => set((s) => ({ appearance: { ...s.appearance, [variant]: mergeAppearance(s.appearance[variant], patch) } })),
      applyLook: (id, variant) =>
        set((s) => {
          const v = variant ?? s.variant;
          return { variant: v, appearance: { ...s.appearance, [v]: lookFor(v, id).appearance } };
        }),
      resetAppearance: (variant) => set((s) => ({ appearance: { ...s.appearance, [variant]: defaultAppearance(variant) } })),
    }),
    {
      name: "fse-skater",
      version: 2,
      migrate: (state, version) => migrateSkaterState(state, version),
      // a partial or hand-written stored state must never lose fields: fill from the defaults every load
      merge: (persisted, current) => ({ ...current, ...migrateSkaterState(persisted, 2) }),
      partialize: (s) => ({ variant: s.variant, appearance: s.appearance }),
    },
  ),
);

export function skaterUrl(variant: SkaterVariant): string {
  return `/models/skater-${variant}.glb`;
}
