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
