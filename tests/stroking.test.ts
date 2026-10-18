import { describe, expect, it } from "vitest";
import { GEARS, GEAR_BY_ID, gearFor, shiftGear } from "@/three/animation/stroking";
import { strokePose } from "@/three/rig/poses-stroking";
import { defaultRest, describeViolations, validatePose } from "@/three/rig/limits";
import { poseFrames } from "@/three/rig/limits";
import { canTurnAway, clampRate, endOf, LEAN_MAX, linkPhaseAt, linkTimeline, minRadius, pointAt, startOf, STROKE_SPEED, wrapAngle, type IceState } from "@/three/animation/place";
import { poseAt } from "@/three/animation/timeline";
import { createProgramStore } from "@/three/animation/program";
import { insideRink } from "@/three/animation/rinkSize";
import type { ViewerSpec } from "@/three/animation/catalog";

const near = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(eps);
const rest = defaultRest;
const LUTZ: ViewerSpec = { kind: "jump", slug: "lutz", rotations: 3 };
const G = 9.81;

describe("stroking poses", () => {
  for (const gear of GEARS) {
    for (const backward of [false, true]) {
      for (const foot of ["L", "R", "both"] as const) {
        it(`${gear.id} on ${foot}${backward ? " backward" : ""} is within range`, () => {
          for (const look of ["L", "R"] as const) {
            const v = validatePose(strokePose({ ...gear, foot, backward, look }), rest);
            expect(v, describeViolations(v)).toEqual([]);
          }
        });
      }
    }
  }

  it("bends the skating knee and reaches the free leg behind (forward) or ahead (backward)", () => {
    const f = poseFrames(strokePose({ ...GEAR_BY_ID.sprint, foot: "L" }), rest);
    expect(f.get("thigh_L")!.dir[2]).toBeGreaterThan(0.3); // thigh forward: a bent knee
    expect(f.get("thigh_R")!.dir[2]).toBeLessThan(-0.5); // free leg behind
    expect(f.get("thigh_R")!.dir[0]).toBeLessThan(-0.3); // and out to the right
    const b = poseFrames(strokePose({ ...GEAR_BY_ID.stroke, foot: "L", backward: true }), rest);
    expect(b.get("thigh_R")!.dir[2]).toBeGreaterThan(0.3); // free leg ahead of the body
  });

  for (const cross of ["L", "R"] as const) {
    for (const backward of [false, true]) {
      it(`crossovers toward the ${cross} are within range${backward ? " backward" : ""}`, () => {
        for (const gear of GEARS) {
          for (const foot of ["L", "R", "both"] as const) {
            const v = validatePose(strokePose({ ...gear, foot, backward, cross, look: cross }), rest);
            expect(v, `${gear.id} ${foot}: ${describeViolations(v)}`).toEqual([]);
          }
        }
      });
    }
  }

  it("crosses the outside foot over toward the circle and under-pushes the inside leg across", () => {
    const f = poseFrames(strokePose({ ...GEAR_BY_ID.stroke, foot: "R", cross: "L" }), rest);
    expect(f.get("thigh_R")!.dir[0]).toBeGreaterThan(0.1); // the right (outside) thigh crosses to the left
    expect(f.get("thigh_L")!.dir[0]).toBeLessThan(-0.15); // the left leg finishes across to the right
    expect(f.get("thigh_L")!.dir[2]).toBeLessThan(-0.4); // and behind
  });

  it("gears step up and down and are found by speed", () => {
    expect(shiftGear("coast", 1)).toBe("stroke");
    expect(shiftGear("sprint", 1)).toBe("sprint");
    expect(shiftGear("run", -1)).toBe("stroke");
    expect(gearFor(STROKE_SPEED).id).toBe("stroke");
    expect(gearFor(1.3).id).toBe("coast");
    expect(gearFor(7).id).toBe("sprint");
  });
});

const from: IceState = { x: 0, z: 0, heading: 0.3 };

describe("the stroke cycle", () => {
  it("uses both legs: consecutive steered links carry the phase so the feet alternate", () => {
    let at: IceState = { ...from, speed: STROKE_SPEED, phase: 0 };
    const feet: string[] = [];
    let prev = linkTimeline(at, { seconds: 0.8, turn: 0.3 });
    for (let i = 0; i < 6; i++) {
      const link = i === 0 ? prev : linkTimeline(at, { seconds: 0.8, turn: 0.3 });
      if (i > 0) {
        // the same pose on both sides of the seam
        const a = poseFrames(poseAt(prev, prev.duration, rest), rest);
        const b = poseFrames(poseAt(link, 0, rest), rest);
        for (const bone of ["thigh_L", "thigh_R", "shin_L", "upper_arm_R"] as const) for (let k = 0; k < 3; k++) near(a.get(bone)!.dir[k], b.get(bone)!.dir[k], 1e-6);
      }
      for (const s of link.trace) feet.push(s.foot);
      at = { ...endOf(link), phase: linkPhaseAt(link, link.duration) };
      prev = link;
    }
    expect(new Set(feet)).toEqual(new Set(["L", "R"]));
    let changes = 0;
    for (let i = 1; i < feet.length; i++) if (feet[i] !== feet[i - 1]) changes++;
    expect(changes).toBeGreaterThanOrEqual(4);
  });

  for (const gear of GEARS) {
    for (const backward of [false, true]) {
      it(`every blended pose of a ${gear.id}${backward ? " backward" : ""} link is within range`, () => {
        const link = linkTimeline({ ...from, speed: gear.speed }, { seconds: 2.4, turn: 0.6, speed: gear.speed, backward });
        for (let t = 0; t <= link.duration + 1e-9; t += 0.1) {
          const v = validatePose(poseAt(link, t, rest), rest);
          expect(v, `t=${t.toFixed(1)}: ${describeViolations(v)}`).toEqual([]);
        }
      });
    }
  }

  it("turning forward from a backward start, and backward at the end for an element, blends within range", () => {
    const link = linkTimeline({ ...from, speed: 3, facingBackward: true }, { seconds: 2, endBackward: true });
    for (let t = 0; t <= 2; t += 0.1) {
      const v = validatePose(poseAt(link, t, rest), rest);
      expect(v, `t=${t.toFixed(1)}: ${describeViolations(v)}`).toEqual([]);
    }
  });
});

describe("link physics", () => {
  it("ramps the speed from where the skater was instead of jumping to it", () => {
    const link = linkTimeline({ ...from, speed: 0 }, { seconds: 3, speed: 7 });
    const v = (t: number) => {
      const a = link.root(t);
      const b = link.root(t + 0.05);
      return Math.hypot(b.x - a.x, b.z - a.z) / 0.05;
    };
    expect(v(0)).toBeLessThan(1);
    expect(v(1)).toBeGreaterThan(2);
    expect(v(1)).toBeLessThan(3.5);
    near(v(2.9), 7, 0.1);
    const nope = linkTimeline({ ...from, speed: 0 }, { seconds: 3, speed: 7, ramp: false });
    near(startOf(nope).speed, 7, 0.05);
  });

  it("leans into the arc: left on a left turn when facing forward, the other way when skating backward, level on a straight", () => {
    const left = linkTimeline({ ...from, speed: STROKE_SPEED }, { seconds: 2, turn: 0.8 });
    const lean = Math.atan((STROKE_SPEED * 0.4) / G);
    near(left.root(1).roll!, -lean, 1e-3);
    const right = linkTimeline({ ...from, speed: STROKE_SPEED }, { seconds: 2, turn: -0.8 });
    near(right.root(1).roll!, lean, 1e-3);
    const back = linkTimeline({ ...from, speed: STROKE_SPEED, facingBackward: true }, { seconds: 2, turn: 0.8, backward: true });
    near(back.root(1).roll!, lean, 1e-3);
    const straight = linkTimeline({ ...from, speed: STROKE_SPEED }, { seconds: 2 });
    near(straight.root(1).roll!, 0);
    // eased in from the lean she arrived with
    const arriving = linkTimeline({ ...from, speed: STROKE_SPEED, roll: 0.3 }, { seconds: 2 });
    near(arriving.root(0).roll!, 0.3);
    near(arriving.root(1).roll!, 0);
  });

  it("skates backward when asked, facing away from the travel the whole way", () => {
    const link = linkTimeline({ ...from, speed: STROKE_SPEED, facingBackward: true }, { seconds: 2, turn: 0.5, backward: true });
    for (let t = 0; t <= 2; t += 0.1) {
      const r = link.root(t);
      const h = from.heading + 0.25 * t;
      near(Math.abs(wrapAngle(r.yaw - h)), Math.PI, 1e-6);
    }
    expect(startOf(link).facingBackward).toBe(true);
    expect(endOf(link).facingBackward).toBe(true);
    expect(link.title).toBe("Stroking backward");
    expect(new Set(link.trace.map((s) => s.foot))).toEqual(new Set(["L", "R"]));
  });

  it("turns to the stroking direction over the first half second when it starts the other way", () => {
    const link = linkTimeline({ ...from, speed: STROKE_SPEED, facingBackward: true }, { seconds: 2 });
    near(Math.abs(wrapAngle(link.root(0).yaw - from.heading)), Math.PI);
    near(wrapAngle(link.root(0.5).yaw - from.heading), 0, 1e-6);
    near(wrapAngle(link.root(2).yaw - from.heading), 0, 1e-6);
  });

  it("skates a held turn with crossovers and a gentle wander with plain strokes", () => {
    const held = linkTimeline({ ...from, speed: STROKE_SPEED, phase: 0 }, { seconds: 0.8, turn: 1.1 * 0.8 });
    const plain = linkTimeline({ ...from, speed: STROKE_SPEED, phase: 0 }, { seconds: 3, turn: 0.5 });
    const crossed = (tl: ReturnType<typeof linkTimeline>) => {
      const f = poseFrames(poseAt(tl, 0, rest), rest);
      return Math.abs(f.get("thigh_L")!.dir[0] + f.get("thigh_R")!.dir[0]);
    };
    // crossing: the thighs are no longer mirror images about the midline at the feet-together moment
    expect(crossed(held)).toBeGreaterThan(0.1);
    expect(crossed(plain)).toBeLessThan(0.05);
    for (let t = 0; t <= held.duration; t += 0.05) {
      const v = validatePose(poseAt(held, t, rest), rest);
      expect(v, `t=${t.toFixed(2)}: ${describeViolations(v)}`).toEqual([]);
    }
  });

  it("rides the outside edge on the inner foot and the inside edge on the outer foot of an arc", () => {
    const left = linkTimeline({ ...from, speed: STROKE_SPEED, phase: 0 }, { seconds: 2, turn: 0.8 });
    for (const s of left.trace) {
      if (s.foot === "L") expect(s.edge).toBe("outside");
      if (s.foot === "R") expect(s.edge).toBe("inside");
    }
    const back = linkTimeline({ ...from, speed: STROKE_SPEED, phase: 0, facingBackward: true }, { seconds: 2, turn: 0.8, backward: true });
    for (const s of back.trace) {
      if (s.foot === "L") expect(s.edge).toBe("inside");
      if (s.foot === "R") expect(s.edge).toBe("outside");
    }
  });

  it("clampRate keeps the lean under the limit at any speed", () => {
    for (const speed of [1.3, 3.5, 5.2, 7]) {
      const rate = clampRate(1.1, speed);
      expect(Math.atan((speed * Math.abs(rate)) / G)).toBeLessThanOrEqual(LEAN_MAX + 1e-9);
      expect(rate).toBeGreaterThan(0);
    }
    near(clampRate(-1.1, 3.5), -1.1);
  });
});

describe("the program with gears and backward skating", () => {
  it("steps through the gears with the arrow keys and names them in the HUD", () => {
    const store = createProgramStore();
    const s = store.getState();
    s.setGear(1);
    expect(gearFor(store.getState().steer.speed).id).toBe("run");
    s.setGear(1);
    s.setGear(1);
    expect(store.getState().steer.speed).toBe(GEAR_BY_ID.sprint.speed);
    s.advance();
    expect(store.getState().playing.timeline.title).toBe("Sprinting");
    s.setGear(-1);
    expect(gearFor(store.getState().steer.speed).id).toBe("run");
    s.setGear("coast");
    s.advance();
    expect(store.getState().playing.timeline.title).toBe("Coasting");
  });

  it("the tightest arc follows the lean limit, and a safe state is one a full-lean circle fits from", () => {
    near(minRadius(7), 49 / (G * Math.tan(LEAN_MAX)), 1e-9);
    expect(minRadius(7)).toBeGreaterThan(6);
    expect(minRadius(STROKE_SPEED)).toBeLessThan(2.5);
    expect(canTurnAway({ x: 0, z: 0, heading: 0 }, 7)).toBe(true);
    // 3 m from the side boards, heading straight at them: fine when stroking, not when sprinting
    expect(canTurnAway({ x: 0, z: 12, heading: 0 }, STROKE_SPEED)).toBe(true);
    expect(canTurnAway({ x: 0, z: 12, heading: 0 }, 7)).toBe(false);
    // along the boards 1 m in: a stroking skater can still arc away toward the middle
    expect(canTurnAway({ x: 0, z: 14, heading: Math.PI / 2 }, STROKE_SPEED)).toBe(true);
  });

  it("sprints with a held turn: stays on the ice, never leans past the limit, never flips round in one segment", () => {
    for (const start of [
      { x: 0, z: 9, heading: 0 },
      { x: 20, z: 0, heading: Math.PI / 2 },
      { x: -10, z: -8, heading: -2.2 },
    ]) {
      const store = createProgramStore(start);
      const s = store.getState();
      s.setSteer(1.1, GEAR_BY_ID.sprint.speed);
      let fastest = 0;
      for (let i = 0; i < 30; i++) {
        s.advance();
        const tl = store.getState().playing.timeline;
        expect(tl.duration, `fallback hit at ${JSON.stringify(start)} step ${i}`).toBeGreaterThan(0.5);
        for (const sample of tl.trace) expect(insideRink(sample.x, sample.z, 0.3), `${JSON.stringify(start)} ${sample.x.toFixed(1)}, ${sample.z.toFixed(1)}`).toBe(true);
        for (let k = 0; k <= 20; k++) expect(Math.abs(tl.root((tl.duration * k) / 20).roll ?? 0)).toBeLessThanOrEqual(LEAN_MAX + 0.02);
        expect(Math.abs(wrapAngle(endOf(tl).heading - startOf(tl).heading))).toBeLessThan(Math.PI * 0.6);
        fastest = Math.max(fastest, endOf(tl).speed);
        if (i === 8) s.setSteer(0, GEAR_BY_ID.sprint.speed);
      }
      expect(fastest).toBeGreaterThan(6);
    }
  });

  it("sprinting straight at the boards, she brakes to the glass instead of swerving early", () => {
    const store = createProgramStore({ x: -20, z: 0, heading: Math.PI / 2 });
    const s = store.getState();
    s.setSteer(0, GEAR_BY_ID.sprint.speed);
    let closest = Infinity;
    let speedNearBoards = Infinity;
    let headingHeld = true;
    let reached = false;
    for (let i = 0; i < 30; i++) {
      s.advance();
      const tl = store.getState().playing.timeline;
      expect(tl.duration).toBeGreaterThan(0.5);
      for (const sample of tl.trace) expect(insideRink(sample.x, sample.z, 0.3)).toBe(true);
      const e = endOf(tl);
      const gap = 30 - e.x;
      if (gap < closest) {
        closest = gap;
        speedNearBoards = e.speed;
      }
      // she keeps her line until the last two metres; only there is a turn allowed
      if (gap < 2) reached = true;
      if (!reached && Math.abs(wrapAngle(e.heading - Math.PI / 2)) > 0.05) headingHeld = false;
    }
    expect(closest).toBeLessThan(1.5);
    expect(speedNearBoards).toBeLessThan(1.5);
    expect(headingHeld).toBe(true);
  });

  it("carries speed, lean, facing and stroke phase from one segment to the next", () => {
    const store = createProgramStore();
    const s = store.getState();
    s.setSteer(1.1, STROKE_SPEED);
    s.advance();
    const a = store.getState().playing.timeline;
    s.advance();
    const b = store.getState().playing.timeline;
    const ea = endOf(a);
    const sb = startOf(b);
    near(ea.x, sb.x);
    near(ea.z, sb.z);
    near(wrapAngle(a.root(a.duration).yaw - b.root(0).yaw), 0);
    near(a.root(a.duration).roll!, b.root(0).roll!);
    near(ea.speed, sb.speed, 0.05);
    near(store.getState().position.phase!, linkPhaseAt(a, a.duration));
  });

  it("lands a jump backward and strokes on from there, turning forward without a snap", () => {
    const store = createProgramStore();
    const s = store.getState();
    s.perform(LUTZ);
    s.advance();
    s.advance();
    const jump = store.getState().playing.timeline;
    expect(endOf(jump).facingBackward).toBe(true);
    s.advance();
    const idle = store.getState().playing.timeline;
    expect(store.getState().playing.kind).toBe("idle");
    near(wrapAngle(idle.root(0).yaw - jump.root(jump.duration).yaw), 0);
    expect(startOf(idle).facingBackward).toBe(true);
    expect(endOf(idle).facingBackward).toBe(false);
  });

  it("skates backward through the wander and straight into a backward-entry jump", () => {
    const store = createProgramStore();
    const s = store.getState();
    s.setBackward(true);
    s.advance();
    // the first backward link turns round over its first half second; the next starts backward
    const first = store.getState().playing.timeline;
    expect(first.title).toBe("Stroking backward");
    expect(startOf(first).facingBackward).toBe(false);
    expect(endOf(first).facingBackward).toBe(true);
    s.advance();
    const idle = store.getState().playing.timeline;
    expect(startOf(idle).facingBackward).toBe(true);
    expect(endOf(idle).facingBackward).toBe(true);
    s.perform(LUTZ);
    s.advance();
    const link = store.getState().playing.timeline;
    expect(store.getState().playing.kind).toBe("link");
    for (let t = 0; t <= link.duration; t += 0.1) expect(pointAt(link, t).facingBackward, `t=${t.toFixed(1)}`).toBe(true);
    expect(endOf(link).facingBackward).toBe(true);
    s.advance();
    expect(store.getState().playing.kind).toBe("element");
  });
});
