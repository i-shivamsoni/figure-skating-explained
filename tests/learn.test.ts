import { describe, expect, it } from "vitest";
import { buildTimeline, captionFor, learnFor, specFromCode, type ViewerSpec } from "@/three/animation/catalog";
import { programTotal, type Performed } from "@/three/animation/program";
import { JUMPS } from "@/data/jumps";
import { SPIN_FAMILIES } from "@/data/spins";
import { PAIR_ELEMENT_FAMILIES } from "@/data/pairs";
import { PAIR_PRESETS, type PairId } from "@/three/animation/pairs";
import { SPECIALS, type SpecialId } from "@/three/animation/special";
import { CHOREO, TURN_SPECS, type ChoreoId, type TurnId } from "@/three/animation/steps";
import { MINI_PROGRAMS, QUICK_CODES } from "@/app/rink/programs";

/** Every page the learn card may point at (path only; queries and hashes are checked separately). */
const PAGES = new Set(["/jumps", "/spins", "/steps", "/choreo", "/pairs", "/scoring", ...JUMPS.map((j) => `/jumps/${j.slug}`), ...SPIN_FAMILIES.map((f) => `/spins/${f.code}`), ...PAIR_ELEMENT_FAMILIES.map((f) => `/pairs/${f.id}`)]);
const path = (href: string) => href.split(/[?#]/)[0];

const SPECS: ViewerSpec[] = [
  ...JUMPS.map((j): ViewerSpec => ({ kind: "jump", slug: j.slug, rotations: j.rotations[j.rotations.length - 1] })),
  { kind: "jump", slug: "lutz", rotations: 3, call: "<", edge: "e" },
  ...SPIN_FAMILIES.map((f): ViewerSpec => ({ kind: "spin", code: f.code, features: { level: 4 } })),
  { kind: "spin", code: "variations" },
  { kind: "spin", code: "ChSp" },
  ...(Object.keys(TURN_SPECS) as TurnId[]).map((id): ViewerSpec => ({ kind: "turn", id })),
  ...(Object.keys(CHOREO) as ChoreoId[]).map((id): ViewerSpec => ({ kind: "choreo", id })),
  ...(Object.keys(SPECIALS) as SpecialId[]).map((id): ViewerSpec => ({ kind: "special", id })),
  ...(Object.keys(PAIR_PRESETS) as PairId[]).map((id): ViewerSpec => ({ kind: "pair", id })),
];

describe("learnFor", () => {
  it("points every kind of element at a page that exists, with a blurb and the caption's value", () => {
    for (const spec of SPECS) {
      const learn = learnFor(spec);
      expect(PAGES.has(path(learn.href)), `${learn.href} for ${JSON.stringify(spec)}`).toBe(true);
      expect(learn.blurb.length).toBeGreaterThan(20);
      expect(learn.about.length).toBeGreaterThan(2);
      expect(learn.title).toBe(captionFor(spec).caption);
      expect(learn.value).toBe(captionFor(spec).value);
      if (learn.value !== undefined) expect(learn.scoringHref).toMatch(/^\/scoring#/);
    }
  });
  it("carries the protocol code of jumps, spins and pairs", () => {
    expect(learnFor({ kind: "jump", slug: "lutz", rotations: 4 })).toMatchObject({ code: "4Lz", value: 11.5, href: "/jumps/lutz", about: "the Lutz" });
    expect(learnFor({ kind: "jump", slug: "lutz", rotations: 3, call: "<", edge: "e" })).toMatchObject({ code: "3Lze<", href: "/jumps/lutz" });
    expect(learnFor({ kind: "spin", code: "CCoSp", features: { level: 4 } })).toMatchObject({ code: "CCoSp4", value: 4.2, href: "/spins/CCoSp" });
    expect(learnFor({ kind: "pair", id: "5RLi" })).toMatchObject({ code: "5RLi4", value: 7, href: "/pairs/lift" });
    expect(learnFor({ kind: "turn", id: "bracket" }).href).toBe("/steps?turn=bracket");
    expect(learnFor({ kind: "choreo", id: "spiral" }).href).toBe("/choreo?move=spiral");
    expect(learnFor({ kind: "special", id: "backflip" }).href).toBe("/jumps?special=backflip#not-listed");
  });
});

describe("mini programs and the quick strip", () => {
  it("build a timeline for every element and add up as the protocol does", () => {
    for (const p of MINI_PROGRAMS) {
      expect(p.specs.length).toBeGreaterThanOrEqual(4);
      const history: Performed[] = p.specs.map((spec, i) => {
        const timeline = buildTimeline(spec);
        expect(timeline.duration).toBeGreaterThan(0);
        const { caption, value } = captionFor(spec);
        return { id: i + 1, spec, timeline, caption, value };
      });
      const expected = Math.round(p.specs.reduce((sum, s) => sum + (captionFor(s).value ?? 0), 0) * 100) / 100;
      expect(programTotal(history)).toBe(expected);
    }
    expect(programTotal(MINI_PROGRAMS[1].specs.map((spec, i) => ({ id: i, spec, timeline: buildTimeline(spec), caption: "", value: captionFor(spec).value })))).toBe(9.5 + 9.7 + 11 + 11.5);
  });
  it("resolves every quick-strip code", () => {
    for (const code of QUICK_CODES) expect(specFromCode(code), code).toBeDefined();
  });
});
