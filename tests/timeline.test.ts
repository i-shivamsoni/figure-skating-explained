import { describe, expect, it } from "vitest";
import { JUMP_BY_ID } from "@/data/jumps";
import { jumpTimeline, MISSING_TURNS } from "@/three/animation/jumps";
import { markerAt, poseAt, TWO_PI } from "@/three/animation/timeline";

describe("jump timeline", () => {
  it("rotates the named number of revolutions in the air", () => {
    const tl = jumpTimeline({ jump: JUMP_BY_ID.Lz, rotations: 4 });
    const r = tl.rotation!;
    const a = tl.root(r.start).yaw;
    const b = tl.root(r.end).yaw;
    expect((b - a) / TWO_PI).toBeCloseTo(4, 5);
    expect(tl.root(r.start).y).toBeCloseTo(0, 5);
    expect(tl.root((r.start + r.end) / 2).y).toBeGreaterThan(0.5);
  });
  it("gives the Axel an extra half revolution and a forward take-off", () => {
    const tl = jumpTimeline({ jump: JUMP_BY_ID.A, rotations: 3 });
    expect(tl.rotation!.nominal).toBe(3.5);
    const r = tl.rotation!;
    expect((tl.root(r.end).yaw - tl.root(r.start).yaw) / TWO_PI).toBeCloseTo(3.5, 5);
    // facing +X (direction of travel) at take-off, unlike the backward toe loop
    expect(Math.sin(tl.root(r.start).yaw)).toBeGreaterThan(0.8);
    const toe = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3 });
    expect(Math.sin(toe.root(toe.rotation!.start).yaw)).toBeLessThan(-0.8);
  });
  it("short-changes the air rotation for q, < and <<", () => {
    for (const call of ["q", "<", "<<"] as const) {
      const tl = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3, call });
      expect(tl.rotation!.turns).toBeCloseTo(3 - MISSING_TURNS[call], 5);
    }
  });
  it("curves the Lutz entry the opposite way to the flip", () => {
    const lz = jumpTimeline({ jump: JUMP_BY_ID.Lz, rotations: 3 });
    const f = jumpTimeline({ jump: JUMP_BY_ID.F, rotations: 3 });
    expect(lz.root(0).z).toBeGreaterThan(0);
    expect(f.root(0).z).toBeLessThan(0);
    expect(Math.abs(lz.root(lz.rotation!.start).x)).toBeLessThan(1e-6);
  });
  it("lands backward on the right foot and provides poses and markers throughout", () => {
    const tl = jumpTimeline({ jump: JUMP_BY_ID.S, rotations: 2 });
    const landing = tl.trace.filter((s) => s.t >= tl.rotation!.end);
    expect(landing.every((s) => s.foot === "R" && s.edge === "outside")).toBe(true);
    const entry = tl.trace.filter((s) => s.t < tl.rotation!.start);
    expect(entry.every((s) => s.foot === "L" && s.edge === "inside")).toBe(true);
    const rest = () => [0, -1, 0] as [number, number, number];
    for (let t = 0; t <= tl.duration; t += 0.37) expect(Object.keys(poseAt(tl, t, rest).bones).length).toBeGreaterThan(0);
    expect(markerAt(tl, tl.rotation!.start + 0.2)?.label).toBe("Rotation");
    expect(tl.duration).toBeGreaterThan(3.5);
  });
});

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

describe("turn and choreo timelines", async () => {
  const { turnTimeline, choreoTimeline, TURN_SPECS } = await import("@/three/animation/steps");
  const rest = () => [0, -1, 0] as [number, number, number];
  /** +1 when the skater faces the direction of travel, -1 when skating backward. */
  const facing = (tl: { root: (t: number) => { x: number; z: number; yaw: number } }, t: number) => {
    const a = tl.root(t);
    const b = tl.root(t + 0.02);
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const l = Math.hypot(vx, vz) || 1;
    return (Math.sin(a.yaw) * vx + Math.cos(a.yaw) * vz) / l;
  };
  it("flips the facing by a half turn and changes edge on a three turn", () => {
    const tl = turnTimeline("three-turn");
    expect(facing(tl, 0.5)).toBeGreaterThan(0.95);
    expect(facing(tl, tl.duration - 0.5)).toBeLessThan(-0.95);
    const edges = new Set(tl.trace.map((s) => s.edge));
    expect(edges).toEqual(new Set(["outside", "inside"]));
    expect(tl.trace.every((s) => s.foot === "L")).toBe(true);
  });
  it("keeps the edge and changes lobe on a rocker", () => {
    const tl = turnTimeline("rocker");
    expect(new Set(tl.trace.map((s) => s.edge))).toEqual(new Set(["outside"]));
    expect(tl.root(0.3).z).toBeLessThan(0);
    expect(tl.root(tl.duration - 0.3).z).toBeGreaterThan(0);
  });
  it("turns twice on a twizzle and ends facing forward", () => {
    const tl = turnTimeline("twizzle");
    expect(tl.rotation!.turns).toBe(2);
    expect(facing(tl, 0.5)).toBeGreaterThan(0.95);
    expect(facing(tl, tl.duration - 0.5)).toBeGreaterThan(0.95);
    expect(facing(turnTimeline("rocker"), tl.duration - 0.5)).toBeLessThan(-0.95);
  });
  it("changes foot on a mohawk and choctaw", () => {
    expect(new Set(turnTimeline("mohawk").trace.map((s) => s.foot))).toEqual(new Set(["L", "R"]));
    expect(new Set(turnTimeline("choctaw").trace.map((s) => s.edge))).toEqual(new Set(["outside", "inside"]));
  });
  it("builds every turn and choreo movement with poses throughout", () => {
    for (const id of Object.keys(TURN_SPECS) as (keyof typeof TURN_SPECS)[]) {
      const tl = turnTimeline(id);
      for (let t = 0; t <= tl.duration; t += 0.4) expect(Object.keys(poseAt(tl, t, rest).bones).length, id).toBeGreaterThan(0);
    }
    for (const id of ["spiral", "spread-eagle", "ina-bauer", "hydroblade"] as const) {
      const tl = choreoTimeline(id);
      expect(tl.duration).toBeGreaterThan(3);
      expect(tl.markers.map((m) => m.label)).toContain(tl.title);
    }
  });
});

describe("audit additions", async () => {
  const { specialTimeline, SPECIALS } = await import("@/three/animation/special");
  const { choreoTimeline, turnTimeline, CHOREO, TURN_SPECS } = await import("@/three/animation/steps");
  const { spinPreset } = await import("@/three/animation/spins");
  const rest = () => [0, -1, 0] as [number, number, number];
  it("builds the non-listed jumps and the backflip", () => {
    for (const id of Object.keys(SPECIALS) as (keyof typeof SPECIALS)[]) {
      const tl = specialTimeline(id);
      for (let t = 0; t <= tl.duration; t += 0.4) expect(Object.keys(poseAt(tl, t, rest).bones).length, id).toBeGreaterThan(0);
    }
    const flip = specialTimeline("backflip");
    const mid = flip.root(flip.markers[2].t + 0.4);
    expect(Math.abs(mid.pitch ?? 0)).toBeGreaterThan(1);
    expect(mid.y).toBeGreaterThan(0.5);
    const walley = specialTimeline("walley");
    expect(walley.root(0).z).toBeGreaterThan(0); // counter-rotated entry like the Lutz
    expect(walley.rotation!.turns).toBe(1);
  });
  it("builds every field move and basic step", () => {
    for (const id of Object.keys(CHOREO) as (keyof typeof CHOREO)[]) expect(choreoTimeline(id).markers.map((m) => m.label)).toContain(CHOREO[id].label);
    const facing = (tl: { root: (t: number) => { x: number; z: number; yaw: number } }, t: number) => {
      const a = tl.root(t);
      const b = tl.root(t + 0.02);
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return (Math.sin(a.yaw) * (b.x - a.x) + Math.cos(a.yaw) * (b.z - a.z)) / l;
    };
    for (const id of ["change-of-edge", "cross-roll", "chasse", "toe-step"] as const) {
      const tl = turnTimeline(id);
      expect(TURN_SPECS[id].noTurn).toBe(true);
      // still skating forward after the step
      expect(facing(tl, 0.3), id).toBeGreaterThan(0.9);
      expect(facing(tl, tl.duration - 0.3), id).toBeGreaterThan(0.9);
    }
    expect(turnTimeline("toe-step").trace.some((s) => s.edge === "toe")).toBe(true);
    expect(turnTimeline("chasse").trace.some((s) => s.foot === "R")).toBe(true);
    expect(new Set(turnTimeline("change-of-edge").trace.map((s) => s.edge))).toEqual(new Set(["outside", "inside"]));
  });
  it("builds the spin shape and entry presets", () => {
    for (const code of ["shapes", "FCSpToeArabian", "threes"]) {
      const tl = spinPreset(code);
      expect(tl.trace.length).toBeGreaterThan(50);
      for (let t = 0; t <= tl.duration; t += 0.6) expect(Object.keys(poseAt(tl, t, rest).bones).length, code).toBeGreaterThan(0);
    }
    const threes = spinPreset("threes");
    expect(threes.root(1.2).yaw - threes.root(0.1).yaw).toBeGreaterThan(TWO_PI * 1.5);
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
