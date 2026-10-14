import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import { JUMP_BY_ID } from "@/data/jumps";
import type { JumpId } from "@/data/types";
import { jumpModel, jumpTimeline, MISSING_TURNS } from "@/three/animation/jumps";
import { specialTimeline } from "@/three/animation/special";
import { TWO_PI, type RootState } from "@/three/animation/timeline";
import { ABSORB_TIME, AIR_TIME, DIP_PER_SPEED, airTimeFor, CHECK_TAU, checkOut, edgeLean, flight, G, I_OPEN, inertiaAt, inertiaSchedule, landingDip, landingSkid, preRotationRamp, rollToward, rotationProfile, TUCK_RATIO, verticalVelocityForAirTime, verticalVelocityForHeight } from "@/three/physics/jump";

/** World-space up vector of the skater, applied exactly as the Actor does. */
const upOf = (r: RootState) => new Vector3(0, 1, 0).applyEuler(new Euler(r.pitch ?? 0, r.yaw, r.roll ?? 0, "YXZ"));
/** Yaw rate by finite difference just before or just after t. */
const rateAt = (tl: { root: (t: number) => RootState }, t: number, side: -1 | 1) => (tl.root(t + side * 2e-6).yaw - tl.root(t + side * 1e-6).yaw) / (side * 1e-6);

const CASES: { id: JumpId; n: number }[] = [...[1, 2, 3, 4, 5].map((n) => ({ id: "T" as const, n })), { id: "A", n: 2 }, { id: "A", n: 4 }];

describe("ballistics", () => {
  it("flies for the calibrated air time within 2% and lands at ice level", () => {
    for (const [rot, T] of Object.entries(AIR_TIME)) {
      const f = flight(verticalVelocityForAirTime(T), 4);
      expect(Math.abs(f.T - T) / T).toBeLessThan(0.02);
      expect(f.y(0)).toBeCloseTo(0, 9);
      expect(f.y(f.T)).toBeCloseTo(0, 9);
      expect(f.y(f.T / 2)).toBeCloseTo(f.apex, 9);
      expect(f.apex).toBeCloseTo((G * T * T) / 8, 9);
      const tl = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: Number(rot) });
      expect(tl.rotation!.end - tl.rotation!.start).toBeCloseTo(T, 6);
      expect(tl.root(tl.rotation!.end - 1e-9).y).toBeCloseTo(0, 6);
    }
    expect(airTimeFor(3, true)).toBeCloseTo(AIR_TIME[3] + 0.03, 9);
    expect(flight(verticalVelocityForHeight(0.5), 4).apex).toBeCloseTo(0.5, 9);
  });
});

describe("angular momentum", () => {
  it("turns exactly the required revolutions in the air, including the Axel half and the calls", () => {
    for (const { id, n } of CASES) {
      const jump = JUMP_BY_ID[id];
      const tl = jumpTimeline({ jump, rotations: n });
      const r = tl.rotation!;
      expect((tl.root(r.end).yaw - tl.root(r.start).yaw) / TWO_PI).toBeCloseTo(r.nominal, 6);
      for (const call of ["q", "<", "<<"] as const) {
        const u = jumpTimeline({ jump, rotations: n, call });
        expect((u.root(u.rotation!.end).yaw - u.root(u.rotation!.start).yaw) / TWO_PI).toBeCloseTo(r.nominal - MISSING_TURNS[call], 6);
      }
    }
  });
  it("spins fastest in the middle third of the flight and slower at take-off and landing", () => {
    for (const { id, n } of CASES) {
      const { spin, T } = jumpModel({ jump: JUMP_BY_ID[id], rotations: n });
      let peak = 0;
      let midPeak = 0;
      for (let i = 0; i <= 300; i++) {
        const t = (T * i) / 300;
        const w = spin.omega(t);
        peak = Math.max(peak, w);
        if (t >= T / 3 && t <= (2 * T) / 3) midPeak = Math.max(midPeak, w);
      }
      expect(midPeak).toBeCloseTo(peak, 6);
      expect(peak).toBeCloseTo(spin.peakOmega, 6);
      expect(spin.omegaTakeoff).toBeLessThan(0.5 * peak);
      expect(spin.omegaLanding).toBeLessThan(0.5 * peak);
      expect(spin.omegaTakeoff).toBeCloseTo(spin.L / I_OPEN, 9);
    }
  });
  it("eases the inertia from open to a third and back, and integrates to the turns", () => {
    const T = 0.72;
    const s = inertiaSchedule(T);
    expect(inertiaAt(0, T, s)).toBeCloseTo(I_OPEN, 9);
    expect(inertiaAt(T / 2, T, s)).toBeCloseTo(I_OPEN * TUCK_RATIO, 9);
    expect(inertiaAt(T, T, s)).toBeCloseTo(I_OPEN, 9);
    const p = rotationProfile(4, T);
    expect(p.angle(0)).toBe(0);
    expect(p.angle(T) / TWO_PI).toBeCloseTo(4, 9);
    expect(rotationProfile(0, T).omega(T / 2)).toBe(0);
  });
  it("keeps yaw monotonic from the knee bend through the flight", () => {
    for (const id of ["T", "Lz", "A", "Lo"] as const) {
      for (const call of ["", "q", "<<"] as const) {
        const tl = jumpTimeline({ jump: JUMP_BY_ID[id], rotations: 3, call });
        const { start, end } = tl.rotation!;
        // the Lutz heading drifts clockwise on its counter edge, so start where the pre-rotation can outrun it
        const from = id === "Lz" ? start - 0.1 : start - 0.4;
        let prev = tl.root(from).yaw;
        for (let t = from; t <= end; t += 0.001) {
          const y = tl.root(t).yaw;
          expect(y, `${id}${call} at ${t.toFixed(3)}`).toBeGreaterThanOrEqual(prev - 1e-9);
          prev = y;
        }
      }
    }
  });
  it("runs the on-ice pre-rotation rate straight into the air rate", () => {
    for (const id of ["T", "Lz", "A", "Lo"] as const) {
      const tl = jumpTimeline({ jump: JUMP_BY_ID[id], rotations: 3 });
      const t0 = tl.rotation!.start;
      expect(rateAt(tl, t0, -1) / rateAt(tl, t0, 1), id).toBeCloseTo(1, 2);
    }
    const f = (x: number) => preRotationRamp(x, 0.45, 5);
    expect(f(0)).toBe(0);
    expect(f(1)).toBeCloseTo(0.45, 9);
    expect((f(1) - f(1 - 1e-6)) / 1e-6).toBeCloseTo(5, 3);
    expect(f(0.5)).toBeLessThan(f(0.75));
    expect(preRotationRamp(0.5, 0, 5)).toBe(0);
  });
});

describe("edge lean", () => {
  it("leans by atan(v²/gR) and tilts the body toward the point it is given", () => {
    expect(edgeLean(4.2, 7)).toBeCloseTo(Math.atan((4.2 * 4.2) / (G * 7)), 9);
    // facing -X (a backward take-off) with the circle centre at +Z: the head must tilt toward +Z
    const yaw = Math.atan2(-1, 0);
    const roll = rollToward(yaw, 0, 7, 0.25);
    expect(Math.abs(roll)).toBeCloseTo(0.25, 9);
    expect(upOf({ x: 0, y: 0, z: 0, yaw, roll }).z).toBeGreaterThan(0.2);
    expect(rollToward(yaw, -7, 0, 0.25)).toBeCloseTo(0, 9); // facing the point: a roll cannot lean toward it
  });
  it("leans into the Lutz entry (+Z) and the flip entry (-Z), stands up in the air and leans into the exit", () => {
    const lz = jumpTimeline({ jump: JUMP_BY_ID.Lz, rotations: 3 });
    const f = jumpTimeline({ jump: JUMP_BY_ID.F, rotations: 3 });
    const settled = 0.8; // on the entry edge, before the knee bend
    expect(upOf(lz.root(settled)).z).toBeGreaterThan(0.1);
    expect(upOf(f.root(settled)).z).toBeLessThan(-0.1);
    expect(Math.abs(lz.root(settled).roll!)).toBeCloseTo(edgeLean(4.2, 7), 6);
    expect(lz.root(0).roll).toBeCloseTo(0, 9);
    expect(lz.root(lz.rotation!.start).roll ?? 0).toBeCloseTo(0, 9);
    expect(lz.root((lz.rotation!.start + lz.rotation!.end) / 2).roll ?? 0).toBe(0);
    // the landing edge curves toward -Z for every jump
    expect(upOf(lz.root(lz.rotation!.end + 0.6)).z).toBeLessThan(-0.1);
    expect(upOf(f.root(f.rotation!.end + 0.6)).z).toBeLessThan(-0.1);
    expect(lz.root(lz.duration).roll).toBeCloseTo(0, 9);
    expect(specialTimeline("walley").root(settled).roll).not.toBe(0);
    expect(specialTimeline("backflip").root(settled).roll).toBe(0);
  });
});

describe("landing", () => {
  it("dips in proportion to the landing speed and returns to zero", () => {
    expect(landingDip(0, 3)).toBe(0);
    expect(landingDip(0.05, 3)).toBeLessThan(0);
    expect(landingDip(0.05, 3)).toBeCloseTo(2 * landingDip(0.05, 1.5), 9);
    expect(landingDip(ABSORB_TIME, 3)).toBe(0);
    expect(landingDip(1, 3)).toBe(0);
    let deepestAt = 0;
    let deepest = 0;
    for (let t = 0; t <= ABSORB_TIME; t += 0.005) {
      if (landingDip(t, 3) < deepest) {
        deepest = landingDip(t, 3);
        deepestAt = t;
      }
    }
    expect(deepestAt).toBeLessThan(ABSORB_TIME / 2);
    const tl = jumpTimeline({ jump: JUMP_BY_ID.S, rotations: 4 });
    const tLand = tl.rotation!.end;
    expect(tl.root(tLand + 0.07).y).toBeLessThan(-DIP_PER_SPEED * 3 * 0.5);
    expect(tl.root(tLand + ABSORB_TIME).y).toBe(0);
    expect(tl.root(tl.duration).y).toBe(0);
    const single = jumpTimeline({ jump: JUMP_BY_ID.S, rotations: 1 });
    expect(single.root(single.rotation!.end + 0.07).y).toBeGreaterThan(tl.root(tLand + 0.07).y);
  });
  it("checks out exponentially and finishes an under-rotation on the ice at the landing rate", () => {
    expect(checkOut(0)).toBe(0);
    expect(checkOut(0.5)).toBeGreaterThan(0.8);
    expect(checkOut(2)).toBeCloseTo(1, 4);
    // once under way the remainder at least halves every time constant
    expect(1 - checkOut(4 * CHECK_TAU)).toBeLessThan(0.5 * (1 - checkOut(3 * CHECK_TAU)));
    expect(landingSkid(0, Math.PI / 2, 10)).toBe(0);
    expect(landingSkid(1e-6, Math.PI / 2, 10) / 1e-6).toBeCloseTo(10, 3);
    expect(landingSkid(5, Math.PI / 2, 10)).toBeCloseTo(Math.PI / 2, 6);
    expect(landingSkid(1, 0, 10)).toBe(0);
    const clean = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3 });
    const q = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3, call: "q" });
    const tLand = q.rotation!.end;
    // a clean landing stops the spin; a q landing keeps turning at the air rate until the blade brakes it
    expect(rateAt(clean, tLand, 1)).toBeLessThan(0.2 * rateAt(clean, tLand, -1));
    expect(rateAt(q, tLand, 1) / rateAt(q, tLand, -1)).toBeGreaterThan(0.9);
    expect(rateAt(q, tLand, 1) / rateAt(q, tLand, -1)).toBeLessThan(1.2);
    // by the end the missing quarter is made up and the pre-rotation checked out, plus the curve of the exit edge
    const { preRotation } = jumpModel({ jump: JUMP_BY_ID.T, rotations: 3, call: "q" });
    const curve = ((q.duration - tLand) * 4.2 * 0.92) / 7; // the exit edge's own share of the yaw
    expect(q.root(q.duration).yaw - q.root(q.rotation!.start).yaw).toBeCloseTo(3 * TWO_PI - preRotation + curve, 2);
  });
});
