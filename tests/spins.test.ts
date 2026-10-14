import { describe, expect, it } from "vitest";
import { poseAt, TWO_PI, type RootState } from "@/three/animation/timeline";
import { spinPreset } from "@/three/animation/spins";

/** Yaw rate by finite difference just before or just after t. */
const rateAt = (tl: { root: (t: number) => RootState }, t: number, side: -1 | 1) => (tl.root(t + side * 2e-6).yaw - tl.root(t + side * 1e-6).yaw) / (side * 1e-6);
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
    const rest = () => [0, -1, 0] as [number, number, number];
    for (const code of Object.keys(SPIN_PRESETS)) {
      const tl = spinPreset(code);
      for (let t = 0; t <= tl.duration; t += 0.5) expect(Object.keys(poseAt(tl, t, rest).bones).length, code).toBeGreaterThan(0);
      expect(tl.trace.length).toBeGreaterThan(50);
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
