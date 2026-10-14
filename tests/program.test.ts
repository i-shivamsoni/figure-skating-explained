import { describe, expect, it } from "vitest";
import { createProgramStore, programTotal, programWarnings, staysOnIce, CENTRE_ICE } from "@/three/animation/program";
import { endOf, startOf, wrapAngle } from "@/three/animation/place";
import { insideRink } from "@/three/animation/rinkSize";
import { specFromCode, toElementSpecs } from "@/three/animation/catalog";
import type { ViewerSpec } from "@/three/animation/catalog";

const near = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(eps);
const LUTZ: ViewerSpec = { kind: "jump", slug: "lutz", rotations: 4 };
const COMBO: ViewerSpec = { kind: "spin", code: "CCoSp", features: { level: 4 } };

describe("the program store", () => {
  it("wanders while nothing is queued, then links into the element and records it", () => {
    const store = createProgramStore();
    let s = store.getState();
    expect(s.playing.kind).toBe("idle");
    near(startOf(s.playing.timeline).x, CENTRE_ICE.x);
    s.perform(LUTZ);
    s = store.getState();
    expect(s.queue).toHaveLength(1);
    const idleEnd = endOf(s.playing.timeline);
    s.advance();
    s = store.getState();
    expect(s.playing.kind).toBe("link");
    expect(s.pending).toEqual(LUTZ);
    expect(s.queue).toHaveLength(0);
    const link = s.playing.timeline;
    near(startOf(link).x, idleEnd.x);
    near(startOf(link).z, idleEnd.z);
    expect(endOf(link).facingBackward).toBe(true);
    s.advance();
    s = store.getState();
    expect(s.playing.kind).toBe("element");
    const element = s.playing.timeline;
    near(startOf(element).x, endOf(link).x);
    near(startOf(element).z, endOf(link).z);
    near(wrapAngle(startOf(element).heading - endOf(link).heading), 0);
    expect(s.marks).toHaveLength(2);
    s.advance();
    s = store.getState();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].caption).toBe("quadruple Lutz");
    expect(s.history[0].value).toBe(11.5);
    expect(s.playing.kind).toBe("idle");
    near(s.position.x, endOf(element).x);
  });

  it("cuts the wander short where the skater is when asked", () => {
    const store = createProgramStore();
    const s = store.getState();
    s.perform(COMBO);
    const mid = { x: 1.5, z: -2, heading: 0.3 };
    s.advance(mid);
    const link = store.getState().playing.timeline;
    near(startOf(link).x, mid.x);
    near(startOf(link).z, mid.z);
  });

  it("turns before the boards so the wander, the link and the element stay on the ice", () => {
    for (const start of [
      { x: 25, z: 1, heading: Math.PI / 2 },
      { x: 2, z: 11.5, heading: 0 },
      { x: -24, z: -10, heading: -2.4 },
    ]) {
      const store = createProgramStore(start);
      const s = store.getState();
      const idle = s.playing.timeline;
      expect(insideRink(endOf(idle).x, endOf(idle).z, 0.3), JSON.stringify(start)).toBe(true);
      s.perform(LUTZ);
      s.advance();
      const link = store.getState().playing.timeline;
      for (const sample of link.trace) expect(insideRink(sample.x, sample.z), `link ${JSON.stringify(start)}`).toBe(true);
      s.advance();
      const element = store.getState().playing.timeline;
      for (const sample of element.trace) expect(insideRink(sample.x, sample.z), `element ${JSON.stringify(start)} ${sample.x.toFixed(1)}, ${sample.z.toFixed(1)}`).toBe(true);
      const r = element.root(element.duration);
      expect(insideRink(r.x, r.z), JSON.stringify(start)).toBe(true);
    }
  });

  it("adds up the protocol at GOE 0 and flags a third quad Lutz", () => {
    const store = createProgramStore();
    const s = store.getState();
    for (const spec of [LUTZ, COMBO]) {
      s.perform(spec);
      s.advance();
      s.advance();
      s.advance();
    }
    expect(store.getState().history.map((h) => h.value)).toEqual([11.5, 4.2]);
    expect(programTotal(store.getState().history)).toBe(15.7);
    expect(programWarnings(store.getState().history, "female").filter((w) => w.severity === "error")).toHaveLength(0);
    for (let i = 0; i < 2; i++) {
      s.perform(LUTZ);
      s.advance();
      s.advance();
      s.advance();
    }
    const errors = programWarnings(store.getState().history, "female").filter((w) => w.severity === "error");
    expect(errors.some((w) => /quad Lutz/.test(w.message) && /twice/.test(w.message))).toBe(true);
  });

  it("keeps at most forty marks and clears them on resurfacing", () => {
    const store = createProgramStore();
    const s = store.getState();
    for (let i = 0; i < 50; i++) s.advance();
    expect(store.getState().marks.length).toBe(40);
    s.resurface();
    expect(store.getState().marks).toHaveLength(0);
    s.reset();
    expect(store.getState().playing.kind).toBe("idle");
    near(store.getState().position.x, CENTRE_ICE.x);
  });
});

describe("codes and element specs", () => {
  it("reads deep-link codes", () => {
    expect(specFromCode("4Lz")).toEqual({ kind: "jump", slug: "lutz", rotations: 4, call: "", edge: "" });
    expect(specFromCode("3F!q")).toEqual({ kind: "jump", slug: "flip", rotations: 3, call: "q", edge: "!" });
    expect(specFromCode("2A")).toEqual({ kind: "jump", slug: "axel", rotations: 2, call: "", edge: undefined });
    expect(specFromCode("CCoSp4V")).toEqual({ kind: "spin", code: "CCoSp", features: { level: 4, v: true } });
    expect(specFromCode("FCSp")).toEqual({ kind: "spin", code: "FCSp", features: { level: 4, v: false } });
    expect(specFromCode("twizzle")).toEqual({ kind: "turn", id: "twizzle" });
    expect(specFromCode("3Tw")).toEqual({ kind: "pair", id: "3Tw" });
    expect(specFromCode("nonsense")).toBeUndefined();
  });

  it("maps viewer specs to scored elements", () => {
    expect(toElementSpecs(LUTZ)).toEqual([{ kind: "jump", jumps: [{ jump: "Lz", rotations: 4, rotationCall: "", edgeCall: "" }] }]);
    expect(toElementSpecs(COMBO)).toEqual([{ kind: "spin", family: "CCoSp", level: 4, v: undefined }]);
    expect(toElementSpecs({ kind: "turn", id: "bracket" })).toEqual([]);
    expect(toElementSpecs({ kind: "pair", id: "3Tw" })).toEqual([{ kind: "code", code: "3Tw3" }]);
  });
});

describe("steering near the boards", () => {
  it("lets the skater reach the boards and keeps her on the ice there", () => {
    const store = createProgramStore({ x: 0, z: 9, heading: 0 });
    const s = store.getState();
    s.setSteer(0, 3.5);
    // stroke straight at the side boards, segment after segment
    let closest = Infinity;
    for (let i = 0; i < 12; i++) {
      s.advance();
      const tl = store.getState().playing.timeline;
      for (const sample of tl.trace) {
        expect(insideRink(sample.x, sample.z, 0.3), `${sample.x.toFixed(1)}, ${sample.z.toFixed(1)}`).toBe(true);
        closest = Math.min(closest, 15 - Math.abs(sample.z));
      }
    }
    expect(closest).toBeLessThan(1.5);
  });
});

describe("elements placed along the boards", () => {
  it("keeps a Lutz's entry lobe and a spin's travel on the ice from anywhere, including the glass", () => {
    const starts = [
      { x: 10, z: 13.6, heading: Math.PI / 2 }, // along the side boards, 1.4 m from the glass
      { x: -10, z: -13.6, heading: -Math.PI / 2 },
      { x: 28.5, z: 0, heading: Math.PI / 2 }, // nose to the end boards
      { x: -22, z: 9, heading: 0.8 }, // toward a corner
      { x: 0, z: 14.2, heading: 0 }, // at the glass, facing it
    ];
    for (const start of starts) {
      for (const spec of [LUTZ, COMBO, { kind: "jump", slug: "axel", rotations: 3 } as ViewerSpec, { kind: "pair", id: "3Tw" } as ViewerSpec]) {
        const store = createProgramStore(start);
        const s = store.getState();
        s.perform(spec);
        s.advance(start); // cut the wander: start exactly here
        const link = store.getState().playing.timeline;
        expect(staysOnIce(link), `link ${JSON.stringify(start)} ${JSON.stringify(spec)}`).toBe(true);
        s.advance();
        const placed = store.getState().playing.timeline;
        expect(store.getState().playing.kind).toBe("element");
        expect(staysOnIce(placed), `element ${JSON.stringify(start)} ${JSON.stringify(spec)}`).toBe(true);
      }
    }
  });
});
