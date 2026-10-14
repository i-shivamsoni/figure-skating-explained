import { GLB_MATERIALS, hairNode, skirtNode, variantNodes, type Appearance, type GlbMaterial, type SkaterVariant } from "./skaterStore";

/** Something with a colour that can be set from a CSS hex string (three's Color). */
export interface Paintable {
  set(hex: string): unknown;
}

/** A model instance's recolourable materials and variant nodes, indexed by their GLB names. */
export interface Wardrobe {
  materials: Map<string, Paintable[]>;
  nodes: Map<string, { visible: boolean }>;
}

/** The colour every contract material takes for an appearance. */
export function materialColours(a: Appearance): Record<GlbMaterial, string> {
  const { colours, sleeves, gloves } = a.outfit;
  return {
    skin: a.skin,
    hair: a.hair.colour,
    top: colours.top,
    skirt: colours.skirt,
    legs: colours.legs,
    glove: gloves ? colours.glove : a.skin,
    boot: colours.boot,
    sleeve_upper: sleeves === "none" ? a.skin : colours.top,
    sleeve_lower: sleeves === "long" ? colours.top : a.skin,
  };
}

/** The variant nodes an appearance shows: one hair style and at most one skirt. */
export function visibleNodes(a: Appearance): Set<string> {
  const shown = new Set([hairNode(a.hair.style, a.hair.length)]);
  const skirt = skirtNode(a.outfit.skirt);
  if (skirt) shown.add(skirt);
  return shown;
}

/** Recolours and shows/hides by name; nodes or materials the model lacks are skipped. */
export function applyAppearance(wardrobe: Wardrobe, a: Appearance, variant: SkaterVariant): void {
  const colours = materialColours(a);
  for (const name of GLB_MATERIALS) for (const m of wardrobe.materials.get(name) ?? []) m.set(colours[name]);
  const shown = visibleNodes(a);
  for (const name of variantNodes(variant)) {
    const node = wardrobe.nodes.get(name);
    if (node) node.visible = shown.has(name);
  }
}

/** A short signature of the look, set on <body data-appearance> for tests. */
export function appearanceSignature(a: Appearance): string {
  return [hairNode(a.hair.style, a.hair.length), a.outfit.skirt, a.outfit.sleeves, a.outfit.gloves ? "gloves" : "bare", a.skin, a.hair.colour, a.outfit.colours.top].join(" ");
}
