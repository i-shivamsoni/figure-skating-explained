import { describe, expect, it } from "vitest";
import { PAIR_IDS, PAIR_PRESETS, pairTimeline } from "@/three/animation/pairs";
import { buildTimeline, captionFor } from "@/three/animation/catalog";
import { poseAt, TWO_PI } from "@/three/animation/timeline";
import { POSES } from "@/three/rig/poses";
import { baseValueOf } from "@/lib/scoring/sov";

const rest = () => [0, -1, 0] as [number, number, number];

describe("pair presets", () => {
  it("builds every preset with a partner track, poses for both, markers and traces for both skaters", () => {
    for (const id of PAIR_IDS) {
      const tl = pairTimeline(id);
      expect(tl.partner, id).toBeDefined();
      expect(tl.partner!.variant).toBe("male");
      expect(tl.duration, id).toBeGreaterThan(3);
      const partnerTl = { ...tl, keys: tl.partner!.keys };
      for (let t = 0; t <= tl.duration; t += 0.3) {
        expect(Object.keys(poseAt(tl, t, rest).bones).length, `${id} woman @${t}`).toBeGreaterThan(0);
        expect(Object.keys(poseAt(partnerTl, t, rest).bones).length, `${id} man @${t}`).toBeGreaterThan(0);
        const r = tl.root(t);
        const m = tl.partner!.root(t);
        for (const v of [r.x, r.y, r.z, r.yaw, m.x, m.y, m.z, m.yaw]) expect(Number.isFinite(v), `${id} @${t}`).toBe(true);
      }
      expect(tl.markers.length, id).toBeGreaterThan(3);
      expect(tl.trace.some((s) => s.actor === "partner"), id).toBe(true);
      expect(tl.trace.some((s) => s.actor !== "partner"), id).toBe(true);
      // keys are in time order for both tracks
      for (const keys of [tl.keys, tl.partner!.keys]) for (let i = 1; i < keys.length; i++) expect(keys[i].t, `${id} key order`).toBeGreaterThanOrEqual(keys[i - 1].t);
    }
  });

  it("uses poses that exist for every key", () => {
    const known = new Set(Object.values(POSES));
    for (const id of PAIR_IDS) {
      const tl = pairTimeline(id);
      for (const k of [...tl.keys, ...tl.partner!.keys]) {
        expect(k.pose, `${id} key @${k.t}`).toBeDefined();
        expect(Object.keys(k.pose.bones).length, `${id} key @${k.t}`).toBeGreaterThan(0);
      }
      // the named lift, twist, death spiral and pair spin positions are registered in POSES
      expect(known.size).toBeGreaterThan(0);
    }
    for (const name of ["liftUpright", "liftPress", "liftStar", "liftPlatter", "twistSplit", "twistAir", "deathSpiralFi", "deathSpiralBo", "pairCamel", "pairSit", "pairSitBehind", "pairUpright", "liftHold", "liftHoldOne", "liftLoad", "liftLower", "twistSideways", "twistCatch", "throwAssist", "throwRelease", "pivot", "pivotEntry", "spiralHold", "spiralHoldBack"]) {
      expect(POSES[name], name).toBeDefined();
    }
  });

  it("lifts the woman above 1.8 m over the man's hands and brings her back to the ice", () => {
    for (const id of ["3Li", "4Li", "5RLi"] as const) {
      const tl = pairTimeline(id);
      let maxY = 0;
      let highest = 0;
      for (let t = 0; t <= tl.duration; t += 0.02) {
        const y = tl.root(t).y;
        if (y > maxY) {
          maxY = y;
          highest = t;
        }
      }
      expect(maxY, id).toBeGreaterThan(1.8);
      expect(tl.root(0).y, id).toBe(0);
      expect(tl.root(tl.duration).y, id).toBe(0);
      // at the top she is over the man: within reach of his hands, horizontally
      const r = tl.root(highest);
      const m = tl.partner!.root(highest);
      expect(Math.hypot(r.x - m.x, r.z - m.z), id).toBeLessThan(1.2);
      // the man revolves at least once between take-off and dismount
      const rot = tl.rotation!;
      expect((tl.partner!.root(rot.end).yaw - tl.partner!.root(rot.start).yaw) / TWO_PI, id).toBeGreaterThan(2);
      expect(tl.markers.some((mk) => /full extension/i.test(mk.label)), id).toBe(true);
    }
  });

  it("twists three revolutions in the air and catches the woman at the waist", () => {
    const tl = pairTimeline("3Tw");
    const r = tl.rotation!;
    const counted = (tl.root(r.end).yaw - r.yawStart!) / TWO_PI;
    expect(counted).toBeGreaterThan(2.7);
    expect(counted).toBeLessThanOrEqual(3);
    expect(r.nominal).toBe(3);
    expect(tl.root(r.start).y).toBeGreaterThan(0.9);
    expect(tl.root((r.start + r.end) / 2).y).toBeGreaterThan(tl.root(r.start).y + 0.5);
    expect(tl.root(tl.duration).y).toBe(0);
    expect(tl.markers.map((m) => m.label)).toContain("Catch");
    const landing = tl.trace.filter((s) => !s.actor && s.t > r.end + 0.4);
    expect(landing.every((s) => s.foot === "R" && s.edge === "outside")).toBe(true);
  });

  it("throws the woman further than she jumps and lands her alone on the right back outside edge", () => {
    const tl = pairTimeline("3LzTh");
    const r = tl.rotation!;
    const landing = tl.trace.filter((s) => !s.actor && s.t >= r.end);
    expect(landing.length).toBeGreaterThan(10);
    expect(landing.every((s) => s.foot === "R" && s.edge === "outside")).toBe(true);
    expect(tl.trace.some((s) => !s.actor && s.edge === "toe")).toBe(true);
    expect(tl.root(r.end).x - tl.root(r.start).x).toBeGreaterThan(3);
    expect((tl.root(r.end).yaw - r.yawStart!) / TWO_PI).toBeGreaterThan(2.7);
    // the man is beside her at the take-off and stays on the ice
    const m = tl.partner!.root(r.start);
    expect(Math.hypot(m.x, m.z)).toBeLessThan(1.5);
    for (let t = 0; t <= tl.duration; t += 0.2) expect(tl.partner!.root(t).y).toBe(0);
  });

  it("keeps the death spiral woman circling the pivoting man at arm's length while he stays put", () => {
    for (const id of ["FiDs", "BoDs"] as const) {
      const tl = pairTimeline(id);
      const r = tl.rotation!;
      const low = tl.markers.find((m) => m.label === "Low position")!.t;
      const rise = tl.markers.find((m) => m.label === "Exit")!.t;
      const pivot = tl.partner!.root(low);
      let angle = 0;
      let prev: number | null = null;
      for (let t = low; t <= rise; t += 0.02) {
        const w = tl.root(t);
        const m = tl.partner!.root(t);
        expect(Math.hypot(m.x - pivot.x, m.z - pivot.z), `${id} man stationary`).toBeLessThan(0.01);
        const d = Math.hypot(w.x - m.x, w.z - m.z);
        expect(d, `${id} radius @${t}`).toBeLessThan(1.95);
        expect(d, `${id} radius @${t}`).toBeGreaterThan(1.2);
        const a = Math.atan2(w.x - m.x, w.z - m.z);
        if (prev !== null) {
          let da = a - prev;
          if (da > Math.PI) da -= TWO_PI;
          if (da < -Math.PI) da += TWO_PI;
          angle += da;
        }
        prev = a;
      }
      expect(Math.abs(angle) / TWO_PI, `${id} revolutions around the man`).toBeGreaterThan(1);
      expect(r.turns, id).toBeGreaterThan(1);
      expect(tl.trace.some((s) => s.actor === "partner" && s.edge === "toe"), id).toBe(true);
      expect(tl.trace.filter((s) => !s.actor).every((s) => s.foot === "R" && s.edge === (id === "FiDs" ? "inside" : "outside")), id).toBe(true);
    }
  });

  it("spins both partners around a common axis facing each other", () => {
    const tl = pairTimeline("PCoSp");
    const r = tl.rotation!;
    for (let t = r.start + 0.5; t < r.end; t += 0.3) {
      const w = tl.root(t);
      const m = tl.partner!.root(t);
      expect(Math.hypot(w.x + m.x, w.z + m.z), `axis @${t}`).toBeLessThan(0.05);
      expect(Math.hypot(w.x - m.x, w.z - m.z), `spacing @${t}`).toBeCloseTo(0.84, 1);
    }
    expect((tl.root(r.end).yaw - tl.root(r.start).yaw) / TWO_PI).toBeGreaterThan(7);
    expect(tl.markers.map((m) => m.label)).toEqual(expect.arrayContaining(["Camel", "Change of foot", "Sit", "Upright"]));
  });

  it("jumps side by side two metres apart, in time", () => {
    const tl = pairTimeline("3T+3T");
    for (let t = 0; t <= tl.duration; t += 0.25) {
      const w = tl.root(t);
      const m = tl.partner!.root(t);
      expect(m.z - w.z).toBeCloseTo(2, 6);
      expect(m.y).toBeCloseTo(w.y, 6);
    }
    // two flights: the root leaves the ice twice
    let flights = 0;
    let up = false;
    for (let t = 0; t <= tl.duration; t += 0.01) {
      const inAir = tl.root(t).y > 0.05;
      if (inAir && !up) flights++;
      up = inAir;
    }
    expect(flights).toBe(2);
    expect(tl.markers.filter((m) => m.label === "Take-off").length).toBe(2);
  });

  it("is wired into the catalog with Scale of Values base values", () => {
    const tl = buildTimeline({ kind: "pair", id: "5RLi" });
    expect(tl.id).toBe("5RLi");
    expect(captionFor({ kind: "pair", id: "5RLi" })).toEqual({ caption: "Group 5 reverse lasso lift", value: baseValueOf("5RLi4") });
    expect(captionFor({ kind: "pair", id: "3Tw" }).value).toBe(baseValueOf("3Tw3"));
    expect(captionFor({ kind: "pair", id: "3T+3T" }).value).toBeCloseTo(2 * baseValueOf("3T"), 6);
    for (const id of PAIR_IDS) expect(PAIR_PRESETS[id].codes.length).toBeGreaterThan(0);
  });
});
