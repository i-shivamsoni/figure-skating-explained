import { describe, expect, it } from "vitest";
import { applyAppearance, materialColours, visibleNodes, type Wardrobe } from "@/three/appearance";
import {
  DEFAULT_APPEARANCES,
  GLB_MATERIALS,
  HAIR_STYLES,
  hairNode,
  LOOKS,
  lookFor,
  mergeAppearance,
  migrateSkaterState,
  variantNodes,
  type Appearance,
  type SkaterVariant,
} from "@/three/skaterStore";

const VARIANTS: SkaterVariant[] = ["female", "male"];
const HEX = /^#[0-9a-f]{6}$/i;

function colourValues(a: Appearance): string[] {
  return [a.skin, a.hair.colour, ...Object.values(a.outfit.colours)];
}

describe("the GLB contract", () => {
  it("lists one hair node per style and length, and both skirts for the woman only", () => {
    const f = variantNodes("female");
    expect(f).toContain("hair.lowBun");
    expect(f).toContain("hair.ponytail.long");
    expect(f).toContain("hair.loose.short");
    expect(f).toContain("skirt.short");
    expect(f).toContain("skirt.long");
    expect(f).not.toContain("hair.quiff");
    const m = variantNodes("male");
    expect(m).toContain("hair.quiff");
    expect(m.some((n) => n.startsWith("skirt"))).toBe(false);
    for (const v of VARIANTS) expect(new Set(variantNodes(v)).size).toBe(variantNodes(v).length);
  });

  it("names hair nodes with a length only for the styles that have one", () => {
    expect(hairNode("ponytail", "long")).toBe("hair.ponytail.long");
    expect(hairNode("bob", "long")).toBe("hair.bob");
    expect(hairNode("ponytail")).toBe("hair.ponytail.medium");
  });
});

describe("default appearances and looks", () => {
  it("start from the GLB's own look", () => {
    expect(DEFAULT_APPEARANCES.female.hair.style).toBe("lowBun");
    expect(DEFAULT_APPEARANCES.female.outfit.skirt).toBe("short");
    expect(DEFAULT_APPEARANCES.female.outfit.sleeves).toBe("none");
    expect(DEFAULT_APPEARANCES.male.hair.style).toBe("quiff");
    expect(DEFAULT_APPEARANCES.male.outfit.skirt).toBe("none");
    expect(DEFAULT_APPEARANCES.male.outfit.sleeves).toBe("short");
    for (const v of VARIANTS) expect(LOOKS[v][0].appearance).toEqual(DEFAULT_APPEARANCES[v]);
  });

  it("are well formed: unique ids, hex colours, a hair style of the right body, no skirt on the man", () => {
    for (const v of VARIANTS) {
      const ids = LOOKS[v].map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThanOrEqual(6);
      for (const l of LOOKS[v]) {
        expect(l.variant).toBe(v);
        expect(l.label.trim().length).toBeGreaterThan(0);
        for (const hex of colourValues(l.appearance)) expect(hex, `${l.id}`).toMatch(HEX);
        expect(HAIR_STYLES[v]).toContain(l.appearance.hair.style);
        if (v === "male") expect(l.appearance.outfit.skirt).toBe("none");
      }
    }
  });

  it("keep the v1 costume ids so old choices migrate", () => {
    for (const id of ["classic", "ruby", "navy", "ivory", "emerald"]) expect(lookFor("female", id).id).toBe(id);
    for (const id of ["classic", "midnight", "burgundy", "white"]) expect(lookFor("male", id).id).toBe(id);
    expect(lookFor("female", "no-such-look").id).toBe("classic");
    expect(lookFor("male", "ruby").id).toBe("classic");
  });

  it("dye the dress, the skirt and the gloves together in the dress looks", () => {
    const ruby = lookFor("female", "ruby").appearance.outfit.colours;
    expect(ruby.top).toBe("#8f1230");
    expect(ruby.skirt).toBe("#8f1230");
    expect(ruby.glove).toBe("#8f1230");
  });
});

describe("mergeAppearance", () => {
  it("deep-merges hair, outfit and colours without touching the rest", () => {
    const base = DEFAULT_APPEARANCES.female;
    const out = mergeAppearance(base, { hair: { style: "bob" }, outfit: { gloves: false, colours: { boot: "#000000" } } });
    expect(out.hair).toEqual({ ...base.hair, style: "bob" });
    expect(out.outfit.gloves).toBe(false);
    expect(out.outfit.sleeves).toBe(base.outfit.sleeves);
    expect(out.outfit.colours).toEqual({ ...base.outfit.colours, boot: "#000000" });
    expect(out.skin).toBe(base.skin);
    expect(base.outfit.gloves).toBe(true);
  });
});

describe("migration from the costume store", () => {
  it("turns v1 costume ids into the matching looks and keeps the body", () => {
    const s = migrateSkaterState({ variant: "male", costume: { female: "ruby", male: "midnight" } }, 1);
    expect(s.variant).toBe("male");
    expect(s.appearance.female).toEqual(lookFor("female", "ruby").appearance);
    expect(s.appearance.male).toEqual(lookFor("male", "midnight").appearance);
  });

  it("copes with the screenshot script's bare v0 state and with garbage", () => {
    expect(migrateSkaterState({ variant: "male" }, 0).appearance).toEqual({ female: DEFAULT_APPEARANCES.female, male: DEFAULT_APPEARANCES.male });
    expect(migrateSkaterState(undefined, 0).variant).toBe("female");
    expect(migrateSkaterState({ variant: "cat" }, 1).variant).toBe("female");
  });

  it("fills missing fields of a v2 state from the defaults", () => {
    const s = migrateSkaterState({ variant: "female", appearance: { female: { skin: "#123456" } } }, 2);
    expect(s.appearance.female.skin).toBe("#123456");
    expect(s.appearance.female.hair).toEqual(DEFAULT_APPEARANCES.female.hair);
    expect(s.appearance.male).toEqual(DEFAULT_APPEARANCES.male);
  });
});

describe("materialColours", () => {
  const base = DEFAULT_APPEARANCES.female;
  it("paints sleeves with the top or the skin by length", () => {
    const none = materialColours(mergeAppearance(base, { outfit: { sleeves: "none" } }));
    expect(none.sleeve_upper).toBe(base.skin);
    expect(none.sleeve_lower).toBe(base.skin);
    const short = materialColours(mergeAppearance(base, { outfit: { sleeves: "short" } }));
    expect(short.sleeve_upper).toBe(base.outfit.colours.top);
    expect(short.sleeve_lower).toBe(base.skin);
    const long = materialColours(mergeAppearance(base, { outfit: { sleeves: "long" } }));
    expect(long.sleeve_upper).toBe(base.outfit.colours.top);
    expect(long.sleeve_lower).toBe(base.outfit.colours.top);
  });

  it("paints bare hands with the skin and covers every contract material", () => {
    const on = materialColours(base);
    expect(on.glove).toBe(base.outfit.colours.glove);
    const off = materialColours(mergeAppearance(base, { outfit: { gloves: false } }));
    expect(off.glove).toBe(base.skin);
    expect(Object.keys(on).sort()).toEqual([...GLB_MATERIALS].sort());
    expect(on.skin).toBe(base.skin);
    expect(on.hair).toBe(base.hair.colour);
  });
});

describe("applyAppearance", () => {
  function fake(variant: SkaterVariant): Wardrobe & { painted: Record<string, string> } {
    const painted: Record<string, string> = {};
    const materials = new Map(GLB_MATERIALS.map((n) => [n, [{ set: (hex: string) => void (painted[n] = hex) }]]));
    const nodes = new Map<string, { visible: boolean }>([...variantNodes(variant), "hair", "fringe", "body"].map((n) => [n, { visible: true }]));
    return { materials, nodes, painted };
  }

  it("shows one hair style and one skirt, hides the other variants, leaves unknown nodes alone", () => {
    const w = fake("female");
    const a = mergeAppearance(DEFAULT_APPEARANCES.female, { hair: { style: "ponytail", length: "long" }, outfit: { skirt: "long" } });
    applyAppearance(w, a, "female");
    expect(visibleNodes(a)).toEqual(new Set(["hair.ponytail.long", "skirt.long"]));
    for (const n of variantNodes("female")) expect(w.nodes.get(n)!.visible, n).toBe(n === "hair.ponytail.long" || n === "skirt.long");
    expect(w.nodes.get("hair")!.visible).toBe(true);
    expect(w.nodes.get("body")!.visible).toBe(true);
    expect(w.painted.hair).toBe(a.hair.colour);
    expect(w.painted.skirt).toBe(a.outfit.colours.skirt);
  });

  it("hides both skirts for a unitard and survives a model without variant nodes", () => {
    const w = fake("female");
    applyAppearance(w, lookFor("female", "unitard").appearance, "female");
    expect(w.nodes.get("skirt.short")!.visible).toBe(false);
    expect(w.nodes.get("skirt.long")!.visible).toBe(false);
    const bare: Wardrobe = { materials: new Map(), nodes: new Map() };
    expect(() => applyAppearance(bare, DEFAULT_APPEARANCES.male, "male")).not.toThrow();
  });
});
