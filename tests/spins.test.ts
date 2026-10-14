import { describe, expect, it } from "vitest";
import { poseAt, TWO_PI, type RootState } from "@/three/animation/timeline";
import { spinPreset } from "@/three/animation/spins";
import { SPIN_FAMILIES } from "@/data/spins";
import { baseValueOf, hasCode } from "@/lib/scoring/sov";

/** Yaw rate by finite difference just before or just after t. */
const rateAt = (tl: { root: (t: number) => RootState }, t: number, side: -1 | 1) => (tl.root(t + side * 2e-6).yaw - tl.root(t + side * 1e-6).yaw) / (side * 1e-6);
const rest = () => [0, -1, 0] as [number, number, number];

describe("spin timeline", async () => {
  const { spinPreset, SPIN_PRESETS } = await import("@/three/animation/spins");
  it("rotates counter-clockwise for the held revolutions", () => {
    const tl = spinPreset("CSp");
    const r = tl.rotation!;
    const turns = (tl.root(r.end).yaw - tl.root(r.start).yaw) / TWO_PI;
    expect(turns).toBeGreaterThan(6);
    expect(turns).toBeCloseTo(r.turns, 1);
    expect(tl.root(r.start + 1).y).toBe(0);
  });
  it("lifts off the ice on a flying entry", () => {
    const tl = spinPreset("FCSp");
    let maxY = 0;
    for (let t = 0; t < tl.rotation!.start; t += 0.02) maxY = Math.max(maxY, tl.root(t).y);
    expect(maxY).toBeGreaterThan(0.4);
    expect(tl.markers.some((m) => m.label === "Fly")).toBe(true);
  });
  it("builds every preset with poses throughout", () => {
    for (const code of Object.keys(SPIN_PRESETS)) {
      const tl = spinPreset(code);
      for (let t = 0; t <= tl.duration; t += 0.5) expect(Object.keys(poseAt(tl, t, rest).bones).length, code).toBeGreaterThan(0);
      expect(tl.trace.length).toBeGreaterThan(50);
    }
  });
  it("keeps the root continuous through the hook, the spin and the exit", () => {
    for (const code of ["CSp", "FCSp", "CCoSp", "edgeChange", "jumpChange"]) {
      const tl = spinPreset(code);
      for (let t = 0.01; t < tl.duration; t += 0.01) {
        const a = tl.root(t - 0.01);
        const b = tl.root(t);
        expect(Math.hypot(a.x - b.x, a.z - b.z), `${code} at ${t.toFixed(2)}`).toBeLessThan(0.06);
      }
    }
  });
});

describe("spin angular momentum", async () => {
  const { spinPreset, spinRateFactor } = await import("@/three/animation/spins");
  it("spins faster in tight positions than in the camel", () => {
    expect(spinRateFactor("upright")).toBeGreaterThan(2 * spinRateFactor("camel"));
    expect(spinRateFactor("sit")).toBeGreaterThan(spinRateFactor("camel"));
    const tl = spinPreset("CCoSp");
    const rate = (t: number) => (tl.root(t + 0.05).yaw - tl.root(t).yaw) / 0.05 / TWO_PI;
    const camelPhase = tl.markers.find((m) => m.label === "Camel")!.t + 0.6;
    const uprightPhase = tl.markers.find((m) => m.label === "Upright")!.t + 0.8;
    expect(rate(uprightPhase)).toBeGreaterThan(rate(camelPhase) * 1.8);
    // revolutions still add up to the preset's count plus the blended transitions
    const r = tl.rotation!;
    expect((tl.root(r.end).yaw - tl.root(r.start).yaw) / TWO_PI).toBeCloseTo(r.turns, 1);
  });
});

describe("spin entry and exit", () => {
  it("ramps the hook into the first position's rate and turns half a revolution in the air on a flying entry", () => {
    for (const code of ["CSp", "FCSp", "CCoSp", "FSSp", "threes"]) {
      const tl = spinPreset(code);
      const start = tl.rotation!.start;
      expect(rateAt(tl, start, 1) / rateAt(tl, start, -1), code).toBeCloseTo(1, 2);
      let prev = tl.root(0.2).yaw;
      for (let t = 0.2; t <= start; t += 0.005) {
        expect(tl.root(t).yaw, `${code} at ${t.toFixed(3)}`).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = tl.root(t).yaw;
      }
      if (code.startsWith("F")) {
        const fly = tl.markers.find((m) => m.label === "Fly")!.t;
        expect((tl.root(start).yaw - tl.root(fly).yaw) / TWO_PI, code).toBeGreaterThanOrEqual(0.4);
      }
    }
  });
  it("brakes the exit at a constant rate from the last position's speed to rest", () => {
    const tl = spinPreset("CCoSp");
    const end = tl.rotation!.end;
    expect(rateAt(tl, end, 1) / rateAt(tl, end, -1)).toBeCloseTo(1, 2);
    const w0 = rateAt(tl, end, 1);
    expect(rateAt(tl, end + 0.2, 1) / w0).toBeCloseTo(0.5, 2);
    expect(rateAt(tl, end + 0.4, -1) / w0).toBeLessThan(0.02);
    let prev = tl.root(end).yaw;
    for (let t = end; t <= tl.duration; t += 0.002) {
      expect(tl.root(t).yaw).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = tl.root(t).yaw;
    }
  });
});

describe("spins built from a family code and level features (the explorer)", async () => {
  const { spinFromSpec, spinTimeline, spinRevolutions, spinCode, spinFeatureNotes, spinPositions } = await import("@/three/animation/spins");
  const { POSES } = await import("@/three/rig/allPoses");
  const { captionFor } = await import("@/three/animation/catalog");
  const POSITION_OF: Record<string, string> = { U: "upright", L: "layback", C: "camel", S: "sit" };

  it("follows the code: positions, flying entry and change of foot per family, with poses throughout", () => {
    for (const fam of SPIN_FAMILIES) {
      const p = spinFromSpec(fam.code);
      const basics = p.phases.filter((ph) => ph.basic).map((ph) => ph.basic);
      if (fam.combination) expect(new Set(basics), fam.code).toEqual(new Set(["camel", "sit", "upright"]));
      else expect(new Set(basics), fam.code).toEqual(new Set([POSITION_OF[fam.position!]]));
      expect(p.entry, fam.code).toBe(fam.flying ? "fly" : "step");
      const feet = new Set(p.phases.filter((ph) => ph.basic).map((ph) => ph.foot ?? "L"));
      expect(feet.has("R"), fam.code).toBe(fam.changeOfFoot);
      for (const ph of p.phases) expect(POSES[ph.pose], `${fam.code}: ${ph.pose}`).toBeDefined();
      const tl = spinTimeline(p);
      for (let t = 0; t <= tl.duration; t += 0.5) expect(Object.keys(poseAt(tl, t, rest).bones).length, fam.code).toBeGreaterThan(0);
      expect(tl.rotation!.turns).toBeGreaterThan(3);
    }
  });

  it("counts the handbook minimums: two revolutions per position, three on each foot around a change of foot", () => {
    for (const fam of SPIN_FAMILIES) {
      const r = spinRevolutions(spinFromSpec(fam.code));
      for (const ph of r.phases.filter((x) => x.basic)) expect(ph.held, `${fam.code} ${ph.label}`).toBeGreaterThanOrEqual(2);
      if (fam.changeOfFoot) {
        expect(r.perFoot.L, fam.code).toBeGreaterThanOrEqual(3);
        expect(r.perFoot.R, fam.code).toBeGreaterThanOrEqual(3);
      } else expect(r.perFoot.R, fam.code).toBe(0);
      expect(r.total).toBeCloseTo(spinTimeline(spinFromSpec(fam.code)).rotation!.turns, 6);
    }
    // the V of a change-of-foot spin: fewer than three held on the second foot
    const v = spinRevolutions(spinFromSpec("CCSp", { v: true }));
    expect(v.phases.filter((x) => x.basic && x.foot === "R").map((x) => x.held)).toEqual([2]);
    // the V of a combination: only two basic positions
    expect(spinPositions("CCoSp", { v: true })).toEqual(["camel", "sit"]);
  });

  it("flips the lean and the trace edge at a clear change of edge, with two revolutions on each edge", () => {
    for (const code of ["CSp", "SSp", "CCoSp"]) {
      const tl = spinTimeline(spinFromSpec(code, { changeOfEdge: true }));
      const flip = tl.markers.find((m) => m.label.endsWith("change of edge"))!;
      expect(flip, code).toBeDefined();
      const before = tl.root(flip.t - 0.5).roll!;
      const after = tl.root(flip.t + 0.5).roll!;
      expect(before, code).toBeGreaterThan(0.05);
      expect(after, code).toBeLessThan(-0.05);
      const phaseStart = [...tl.markers].reverse().find((m) => m.t < flip.t && !m.label.includes("·"))!;
      const edgesBefore = new Set(tl.trace.filter((s) => s.t > phaseStart.t + 0.5 && s.t < flip.t).map((s) => s.edge));
      const edgesAfter = new Set(tl.trace.filter((s) => s.t > flip.t && s.t < flip.t + 1).map((s) => s.edge));
      expect(edgesBefore, code).toEqual(new Set(["inside"]));
      expect(edgesAfter, code).toEqual(new Set(["outside"]));
      const revs = (a: number, b: number) => (tl.root(b).yaw - tl.root(a).yaw) / TWO_PI;
      expect(revs(phaseStart.t, flip.t), code).toBeGreaterThanOrEqual(2 - 1e-6);
      const phaseEnd = tl.markers.find((m) => m.t > flip.t && !m.label.includes("·"))!;
      expect(revs(flip.t, phaseEnd.t), code).toBeGreaterThanOrEqual(2 - 1e-6);
    }
    // a plain spin keeps one edge and one lean
    const plain = spinTimeline(spinFromSpec("CSp"));
    expect(plain.markers.some((m) => m.label.endsWith("change of edge"))).toBe(false);
    expect(plain.root(plain.rotation!.start + 1).roll).toBeGreaterThan(0.05);
  });

  it("leaves the ice between the feet on a change of foot executed by jump and keeps the trace on the ice", () => {
    for (const code of ["CSSp", "CCSp", "CCoSp", "FCCoSp"]) {
      const tl = spinTimeline(spinFromSpec(code, { changeByJump: true }));
      const m = tl.markers.find((x) => x.label === "Change of foot executed by jump")!;
      expect(m, code).toBeDefined();
      let maxY = 0;
      for (let t = m.t; t < m.t + 1.2; t += 0.01) maxY = Math.max(maxY, tl.root(t).y);
      expect(maxY, code).toBeGreaterThan(0.15);
      expect(tl.trace.some((s) => tl.root(s.t).y > 0.01), code).toBe(false);
      expect(tl.trace.some((s) => s.foot === "R"), code).toBe(true);
    }
    const step = spinTimeline(spinFromSpec("CSSp"));
    for (let t = step.rotation!.start; t < step.rotation!.end; t += 0.02) expect(step.root(t).y).toBe(0);
  });

  it("gives every flying family air time in its family's air position, higher for the difficult fly", () => {
    const airTime = (tl: ReturnType<typeof spinTimeline>) => {
      let first = -1;
      let last = -1;
      for (let t = 0; t < tl.rotation!.start; t += 0.005) {
        if (tl.root(t).y > 0.02) {
          if (first < 0) first = t;
          last = t;
        }
      }
      return first < 0 ? 0 : last - first;
    };
    const maxY = (tl: ReturnType<typeof spinTimeline>) => {
      let y = 0;
      for (let t = 0; t < tl.rotation!.start; t += 0.005) y = Math.max(y, tl.root(t).y);
      return y;
    };
    for (const fam of SPIN_FAMILIES.filter((f) => f.flying)) {
      const p = spinFromSpec(fam.code);
      const tl = spinTimeline(p);
      expect(airTime(tl), fam.code).toBeGreaterThan(0.3);
      expect(tl.markers.find((m) => m.label === "Fly"), fam.code).toBeDefined();
      const expectedPose = { C: "flyCamel", S: "flySitOpen", U: "flyUpright", L: "flyLayback" }[fam.position ?? "C"];
      expect(p.flyPose, fam.code).toBe(expectedPose);
      const hard = spinTimeline(spinFromSpec(fam.code, { difficultFly: true }));
      expect(maxY(hard), fam.code).toBeGreaterThan(maxY(tl));
      expect(hard.markers.find((m) => m.label === "Fly")!.detail).toMatch(/difficult variation of flying entry/i);
      // stepped over: V, no air time
      expect(airTime(spinTimeline(spinFromSpec(fam.code, { v: true }))), fam.code).toBe(0);
    }
    for (const fam of SPIN_FAMILIES.filter((f) => !f.flying)) expect(airTime(spinTimeline(spinFromSpec(fam.code))), fam.code).toBe(0);
  });

  it("holds eight revolutions, enters on travelling threes and winds up the windmills on request", () => {
    const eight = spinFromSpec("CSp", { eightRevolutions: true });
    expect(eight.phases.some((ph) => ph.basic === "camel" && ph.revolutions >= 8)).toBe(true);
    expect(spinTimeline(eight).markers.some((m) => m.label.endsWith("8 revolutions"))).toBe(true);
    // never in the phase that changes edge
    const both = spinFromSpec("CSp", { eightRevolutions: true, changeOfEdge: true });
    expect(both.phases.some((ph) => ph.changeEdge && ph.revolutions >= 8)).toBe(false);
    expect(both.phases.some((ph) => !ph.changeEdge && ph.revolutions >= 8)).toBe(true);
    const threes = spinTimeline(spinFromSpec("SSp", { difficultEntrance: true }));
    expect(threes.markers[0].detail).toMatch(/travelling threes/);
    expect(spinTimeline(spinFromSpec("FSSp", { difficultEntrance: true })).markers[0].detail).not.toMatch(/travelling threes/);
    const mills = spinFromSpec("CCSp", { windmills: true });
    expect(mills.phases.filter((ph) => ph.pose === "windmillUp")).toHaveLength(3);
  });

  it("names the protocol code and base value the way the Scale of Values does", () => {
    expect(spinCode("FCCoSp", { level: 4, v: true })).toBe("FCCoSp4V");
    expect(baseValueOf("FCCoSp4V")).toBe(3.15);
    expect(spinCode("CCoSp", { level: 4 })).toBe("CCoSp4");
    expect(baseValueOf("CCoSp4")).toBe(4.2);
    expect(captionFor({ kind: "spin", code: "FCCoSp", features: { level: 4, v: true } })).toEqual({ caption: "Flying change-foot combination spin (Level 4, reduced value)", value: 3.15 });
    expect(captionFor({ kind: "spin", code: "CCoSp", features: { level: 4 } })).toEqual({ caption: "Change-foot combination spin (Level 4)", value: 4.2 });
    expect(captionFor({ kind: "spin", code: "CCoSp" })).toEqual({ caption: "Change-foot combination spin (Level 4)", value: 4.2 });
    expect(spinCode("LSp", { level: "B" })).toBe("LSpB");
    expect(hasCode("CSpBV")).toBe(false);
  });

  it("lists what counts for the level in the handbook's words", () => {
    const none = spinFeatureNotes("USp");
    expect(none.features).toEqual([]);
    expect(none.supported).toBe("B");
    const l4 = spinFeatureNotes("CCoSp", { changeOfEdge: true, changeByJump: true, variations: { camel: "CS", sit: "SB" } });
    expect(l4.features.map((f) => f.number)).toEqual([1, 1, 2, 7]);
    expect(l4.features.every((f) => f.counted)).toBe(true);
    expect(l4.mandatoryCounted).toBe(true);
    expect(l4.supported).toBe(4);
    // four features without a mandatory one stop at Level 3
    const l3 = spinFeatureNotes("CCoSp", { changeByJump: true, eightRevolutions: true, variations: { camel: "CS", sit: "SB" } });
    expect(l3.features.filter((f) => f.counted)).toHaveLength(4);
    expect(l3.supported).toBe(3);
    // only two difficult variations count in any spin
    const three = spinFeatureNotes("CoSp", { variations: { camel: "CF", sit: "SS", upright: "UB" } });
    expect(three.features.filter((f) => f.counted)).toHaveLength(2);
    // a change of edge in a plain upright is not credited; a jump into an upright is not credited
    expect(spinFeatureNotes("USp", { changeOfEdge: true }).features[0].counted).toBe(false);
    expect(spinFeatureNotes("CUSp", { changeByJump: true }).features[0].counted).toBe(false);
    expect(spinFeatureNotes("CSSp", { changeByJump: true }).features[0].counted).toBe(true);
    // a stepped-over flying entry has no flying feature
    expect(spinFeatureNotes("FCSp", { difficultFly: true, v: true }).features[0].counted).toBe(false);
  });
});
