import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/three/animation/catalog";
import { EDGE_MARGIN, endOf, keepInRink, linkTimeline, placementAfter, placeTimeline, startOf, wrapAngle } from "@/three/animation/place";
import { insideRink } from "@/three/animation/rinkSize";

const near = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(eps);
const lutz = buildTimeline({ kind: "jump", slug: "lutz", rotations: 4 });

describe("placeTimeline", () => {
  const p = { x: 5, z: -3, yaw: 1.1 };
  const placed = placeTimeline(lutz, p);

  it("is a rigid motion: distances are kept, yaw is offset, height untouched", () => {
    for (const [t1, t2] of [
      [0, 1],
      [0.5, 2.2],
      [1, lutz.duration],
    ]) {
      const a = lutz.root(t1);
      const b = lutz.root(t2);
      const A = placed.root(t1);
      const B = placed.root(t2);
      near(Math.hypot(A.x - B.x, A.z - B.z), Math.hypot(a.x - b.x, a.z - b.z));
      near(A.yaw - a.yaw, p.yaw);
      near(A.y, a.y);
    }
  });

  it("moves the trace, arrows, focus, heading and the counted-rotation start together", () => {
    expect(placed.trace.length).toBe(lutz.trace.length);
    const s = lutz.trace[10];
    const S = placed.trace[10];
    const r = lutz.root(s.t);
    const R = placed.root(s.t);
    near(Math.hypot(S.x - R.x, S.z - R.z), Math.hypot(s.x - r.x, s.z - r.z));
    near(placed.heading - lutz.heading, p.yaw);
    const yawStart = (tl: typeof lutz) => tl.rotation!.yawStart ?? tl.root(tl.rotation!.start).yaw;
    near(yawStart(placed) - yawStart(lutz), p.yaw);
    expect(placed.arrows!.length).toBe(lutz.arrows!.length);
    const a = lutz.arrows![0];
    const A = placed.arrows![0];
    near(A.startAngle - a.startAngle, p.yaw);
    const pt = [a.x + a.radius * Math.sin(a.startAngle), a.z + a.radius * Math.cos(a.startAngle)];
    const PT = [A.x + A.radius * Math.sin(A.startAngle), A.z + A.radius * Math.cos(A.startAngle)];
    near(Math.hypot(PT[0] - placed.focus.x, PT[1] - placed.focus.z), Math.hypot(pt[0] - lutz.focus.x, pt[1] - lutz.focus.z));
  });

  it("leaves the clock, the poses and the markers alone", () => {
    expect(placed.duration).toBe(lutz.duration);
    expect(placed.keys).toBe(lutz.keys);
    expect(placed.markers).toBe(lutz.markers);
  });

  it("moves the pair partner with the primary skater", () => {
    const twist = buildTimeline({ kind: "pair", id: "3Tw" });
    const moved = placeTimeline(twist, p);
    const a = twist.root(1);
    const b = twist.partner!.root(1);
    const A = moved.root(1);
    const B = moved.partner!.root(1);
    near(Math.hypot(A.x - B.x, A.z - B.z), Math.hypot(a.x - b.x, a.z - b.z));
    near(B.yaw - b.yaw, p.yaw);
  });
});

describe("chaining", () => {
  it("placementAfter starts the element exactly at the given point and direction", () => {
    const from = { x: 10, z: 4, heading: 2.3 };
    const placed = placeTimeline(lutz, placementAfter(lutz, from));
    const s = startOf(placed);
    near(s.x, from.x);
    near(s.z, from.z);
    near(wrapAngle(s.heading - from.heading), 0);
  });

  it("knows a Lutz entry skates backward and a stroking link forward", () => {
    expect(startOf(lutz).facingBackward).toBe(true);
    expect(startOf(linkTimeline({ x: 0, z: 0, heading: 0 })).facingBackward).toBe(false);
  });

  it("endOf follows the placement", () => {
    const e = endOf(lutz);
    const p = { x: -2, z: 7, yaw: -0.7 };
    const E = endOf(placeTimeline(lutz, p));
    const c = Math.cos(p.yaw);
    const s = Math.sin(p.yaw);
    near(E.x, p.x + e.x * c + e.z * s);
    near(E.z, p.z - e.x * s + e.z * c);
    near(wrapAngle(E.heading - e.heading - p.yaw), 0);
  });

  it("a spin placed after a jump starts where the jump ended, travelling the same way", () => {
    const spin = buildTimeline({ kind: "spin", code: "CCoSp" });
    const end = endOf(lutz);
    const s = startOf(placeTimeline(spin, placementAfter(spin, end)));
    near(s.x, end.x);
    near(s.z, end.z);
    near(wrapAngle(s.heading - end.heading), 0);
  });
});

describe("linkTimeline", () => {
  const from = { x: 3, z: -1, heading: 0.4 };

  it("starts at the point, turns by the angle and strokes at speed", () => {
    const link = linkTimeline(from, { turn: 0.8, seconds: 2 });
    const s = startOf(link);
    const e = endOf(link);
    near(s.x, from.x);
    near(s.z, from.z);
    near(wrapAngle(s.heading - from.heading), 0, 1e-2);
    near(wrapAngle(e.heading - (from.heading + 0.8)), 0, 1e-2);
    const r0 = link.root(0);
    const r1 = link.root(2);
    expect(Math.hypot(r1.x - r0.x, r1.z - r0.z)).toBeGreaterThan(5);
    expect(link.trace.length).toBeGreaterThan(60);
    expect(link.duration).toBe(2);
  });

  it("faces forward while stroking and turns backward at the end when asked", () => {
    const f = linkTimeline(from, { seconds: 2 });
    near(wrapAngle(f.root(2).yaw - endOf(f).heading), 0, 1e-2);
    const b = linkTimeline(from, { seconds: 2, endBackward: true });
    near(wrapAngle(b.root(0.5).yaw - from.heading), 0, 1e-2);
    near(Math.abs(wrapAngle(b.root(2).yaw - endOf(b).heading)), Math.PI, 1e-2);
    expect(endOf(b).facingBackward).toBe(true);
  });

  it("strokes on alternate feet, in time order, and coasts on two feet when slow", () => {
    const link = linkTimeline(from, { seconds: 3 });
    for (let i = 1; i < link.keys.length; i++) expect(link.keys[i].t).toBeGreaterThan(link.keys[i - 1].t);
    const glides = link.keys.filter((k) => k.pose !== link.keys[0].pose && k.t < 2.5);
    expect(glides.length).toBeGreaterThanOrEqual(3);
    expect(new Set(glides.map((k) => k.pose)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(link.trace.map((s) => s.foot))).toEqual(new Set(["L", "R"]));
    const coast = linkTimeline(from, { seconds: 2, speed: 1.3 });
    expect(coast.trace.every((s) => s.foot === "both")).toBe(true);
  });

  it("blends into the next element's first pose", () => {
    const link = linkTimeline(from, { endPose: lutz.keys[0].pose });
    expect(link.keys[link.keys.length - 1].pose).toBe(lutz.keys[0].pose);
    expect(link.keys[link.keys.length - 1].t).toBe(link.duration);
  });
});

describe("keepInRink", () => {
  it("leaves a heading alone in the middle of the ice, and right up to the boards while there is room", () => {
    expect(keepInRink({ x: 0, z: 0, heading: 1 }, 10).turn).toBe(0);
    // 1.5 m from the side boards, skating along them: nothing to correct
    expect(keepInRink({ x: 0, z: 13.5, heading: Math.PI / 2 }, 2.5).turn).toBe(0);
  });

  it("turns toward centre ice before the end boards and the corners", () => {
    for (const p of [
      { x: 26, z: 2, heading: Math.PI / 2 },
      { x: -24, z: -11, heading: -2.3 },
      { x: 4, z: 13, heading: 0 },
    ]) {
      const k = keepInRink(p, 8);
      expect(k.turn, JSON.stringify(p)).not.toBe(0);
      expect(insideRink(p.x + 8 * Math.sin(k.heading), p.z + 8 * Math.cos(k.heading), EDGE_MARGIN), JSON.stringify(p)).toBe(true);
    }
  });
});

describe("insideRink", () => {
  it("knows the rounded corners", () => {
    expect(insideRink(0, 0)).toBe(true);
    expect(insideRink(29.9, 0)).toBe(true);
    expect(insideRink(29.9, 14.9)).toBe(false);
    expect(insideRink(22, 7, 1)).toBe(true);
    expect(insideRink(31, 0)).toBe(false);
  });
});
