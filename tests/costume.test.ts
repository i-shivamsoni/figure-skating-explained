import { describe, expect, it } from "vitest";
import { COSTUME_MATERIALS, COSTUME_PRESETS, costumeFor, type SkaterVariant } from "@/three/skaterStore";

const VARIANTS: SkaterVariant[] = ["female", "male"];
const HEX = /^#[0-9a-f]{6}$/i;

describe("costume presets", () => {
  it("start with a classic preset that keeps the GLB colours", () => {
    for (const v of VARIANTS) {
      const first = COSTUME_PRESETS[v][0];
      expect(first.id).toBe("classic");
      expect(first.colours).toEqual({});
    }
  });

  it("have unique ids, labels and well-formed colours on contract materials only", () => {
    for (const v of VARIANTS) {
      const ids = COSTUME_PRESETS[v].map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThanOrEqual(3);
      for (const c of COSTUME_PRESETS[v]) {
        expect(c.label.trim().length).toBeGreaterThan(0);
        for (const [material, hex] of Object.entries(c.colours)) {
          expect(COSTUME_MATERIALS).toContain(material);
          expect(hex).toMatch(HEX);
        }
      }
    }
  });

  it("only recolour the skirt on the woman", () => {
    for (const c of COSTUME_PRESETS.male) expect(c.colours.skirt).toBeUndefined();
    expect(COSTUME_PRESETS.female.some((c) => c.colours.skirt)).toBe(true);
  });

  it("dye the dress and the skirt the same colour", () => {
    for (const c of COSTUME_PRESETS.female) if (c.colours.skirt) expect(c.colours.skirt).toBe(c.colours.top);
  });
});

describe("costumeFor", () => {
  it("finds a preset by id for the given model", () => {
    expect(costumeFor("female", "ruby").label).toBe("Ruby");
    expect(costumeFor("male", "midnight").colours.top).toMatch(HEX);
  });

  it("falls back to the classic preset for unknown ids or another model's preset", () => {
    expect(costumeFor("female", "no-such-preset").id).toBe("classic");
    expect(costumeFor("male", "ruby").id).toBe("classic");
    expect(costumeFor("female", "").id).toBe("classic");
  });
});
