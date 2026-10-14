import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import { JUMP_BY_ID } from "@/data/jumps";
import type { JumpId } from "@/data/types";
import { jumpModel, jumpTimeline, MISSING_TURNS } from "@/three/animation/jumps";
import { specialTimeline } from "@/three/animation/special";
import { TWO_PI, type RootState } from "@/three/animation/timeline";
import { ABSORB_TIME, AIR_TIME, DIP_PER_SPEED, airTimeFor, edgeLean, flight, G, I_OPEN, inertiaAt, inertiaSchedule, landingDip, landingSkid, preRotationAngle, rollToward, rotationProfile, SKID_CAP, SKID_MAX, SKID_TAU, TUCK_RATIO, VAULT_TIME, verticalVelocityForAirTime, verticalVelocityForHeight } from "@/three/physics/jump";
import { spinPreset } from "@/three/animation/spins";
import { poseAt } from "@/three/animation/timeline";
import type { Pose } from "@/three/rig/pose";

/** World-space up vector of the skater, applied exactly as the Actor does. */
const upOf = (r: RootState) => new Vector3(0, 1, 0).applyEuler(new Euler(r.pitch ?? 0, r.yaw, r.roll ?? 0, "YXZ"));
/** Yaw rate by finite difference just before or just after t. */
const rateAt = (tl: { root: (t: number) => RootState }, t: number, side: -1 | 1) => (tl.root(t + side * 2e-6).yaw - tl.root(t + side * 1e-6).yaw) / (side * 1e-6);

const CASES: { id: JumpId; n: number }[] = [...[1, 2, 3, 4, 5].map((n) => ({ id: "T" as const, n })), { id: "A", n: 2 }, { id: "A", n: 4 }];
/** Yaw of the landing edge's own curve after `tl` seconds on it (exit speed 4.2 × 0.92 m/s on a 7 m lobe). */
const exitCurve = (tl: number) => (tl * 4.2 * 0.92) / 7;
/** The leg a pose stands on: the shin pointing closest to straight down (the free leg's shin trails behind). */
const standingLeg = (pose: Pose): "L" | "R" => ((pose.bones.shin_L?.dir[1] ?? 0) < (pose.bones.shin_R?.dir[1] ?? 0) ? "L" : "R");

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
  it("counts the nominal revolutions minus the blade skid at touchdown, and finishes them on the ice", () => {
    for (const { id, n } of CASES) {
      const jump = JUMP_BY_ID[id];
      for (const call of ["", "q", "<", "<<"] as const) {
        const tl = jumpTimeline({ jump, rotations: n, call });
        const m = jumpModel({ jump, rotations: n, call });
        const r = tl.rotation!;
        const counted = (t: number) => (tl.root(t).yaw - r.yawStart!) / TWO_PI;
        // the counted rotation = vault + air + skid; at touchdown the skid is still to come
        expect(counted(r.end), `${n}${id}${call}`).toBeCloseTo(r.nominal - m.skid / TWO_PI, 6);
        expect(m.skid / TWO_PI).toBeGreaterThanOrEqual(MISSING_TURNS[call] - 1e-9);
        if (call) expect(m.skid / TWO_PI).toBeCloseTo(MISSING_TURNS[call], 6);
        else expect(m.skid).toBeLessThanOrEqual(SKID_CAP + 1e-9);
        expect(m.preRotation + m.airTurns * TWO_PI + m.skid).toBeCloseTo(r.nominal * TWO_PI, 6);
        expect(r.turns).toBeCloseTo(r.nominal - MISSING_TURNS[call], 6);
        // the skid finishes the rotation within SKID_MAX; after that only the landing lobe turns the skater
        expect(counted(r.end + SKID_MAX) - exitCurve(SKID_MAX) / TWO_PI, `${n}${id}${call} skid`).toBeCloseTo(r.nominal, 6);
      }
    }
  });
  it("stands on the take-off foot through the approach and lands on the listed foot", () => {
    const rest = () => [0, -1, 0] as [number, number, number];
    for (const id of ["T", "S", "Lo", "F", "Lz", "A", "Eu"] as const) {
      const jump = JUMP_BY_ID[id];
      const tl = jumpTimeline({ jump, rotations: id === "Eu" ? 1 : 3 });
      const foot = jump.takeOff.foot === "left" ? "L" : "R";
      // the Axel glides in on the right foot and steps forward onto the left; every other entry stays on one foot
      const first = tl.markers.find((m) => m.label === "Step forward");
      expect(standingLeg(poseAt(tl, 0, rest)), `${id} at 0`).toBe(first ? "R" : foot);
      for (const t of [tl.rotation!.start - 0.5, tl.rotation!.start - 0.25]) expect(standingLeg(poseAt(tl, t, rest)), `${id} at ${t}`).toBe(foot);
      const landFoot = jump.landing.foot === "left" ? "L" : "R";
      expect(standingLeg(poseAt(tl, tl.rotation!.end + 0.4, rest)), `${id} landing`).toBe(landFoot);
      expect(tl.trace.filter((s) => s.t > tl.rotation!.end).every((s) => s.foot === landFoot && s.edge === jump.landing.edge)).toBe(true);
    }
    // the split jump takes off from the left toe and lands forward on the right
    const split = specialTimeline("split-jump");
    expect(standingLeg(poseAt(split, 0, rest))).toBe("L");
    expect(standingLeg(poseAt(split, split.duration, rest))).toBe("R");
    expect(standingLeg(poseAt(specialTimeline("walley"), 0, rest))).toBe("R");
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
    // the vault ramps the on-ice rate with a smoothstep: half the peak rate times its length in total
    const f = (tBefore: number) => preRotationAngle(tBefore, 0.2, 5);
    expect(f(0.2)).toBe(0);
    expect(f(1)).toBe(0);
    expect(f(0)).toBeCloseTo(0.5, 9);
    expect((f(0) - f(1e-6)) / 1e-6).toBeCloseTo(5, 3);
    expect(f(0.1)).toBeLessThan(f(0.05));
    expect(preRotationAngle(0.1, 0.2, 0)).toBe(0);
    // the last quarter of the vault holds under half of the pre-rotation, so it never bunches into the final frames
    expect(1 - f(0.05) / f(0)).toBeLessThan(0.5);
    for (const id of ["T", "Lz", "A", "Lo"] as const) {
      const m = jumpModel({ jump: JUMP_BY_ID[id], rotations: 3 });
      expect(m.preRotation, id).toBeGreaterThan(0.3);
      expect(m.vaultTime).toBe(id === "A" ? VAULT_TIME.axel : id === "Lo" ? VAULT_TIME.edge : VAULT_TIME.toe);
      expect(m.preRotation).toBeCloseTo((m.omegaIce * m.vaultTime) / 2, 9);
    }
  });
});

describe("entries", () => {
  it("turns a forward three onto the take-off edge for Flip, Salchow and toe loop, with a cusp on the ice", () => {
    for (const id of ["F", "S", "T"] as const) {
      const tl = jumpTimeline({ jump: JUMP_BY_ID[id], rotations: 3 });
      const turn = tl.markers.find((m) => m.label === "Three turn")!;
      expect(turn, id).toBeDefined();
      const foot = JUMP_BY_ID[id].takeOff.foot === "left" ? "L" : "R";
      const before = tl.trace.filter((s) => s.t < turn.t - 0.05);
      const after = tl.trace.filter((s) => s.t > turn.t + 0.4 && s.t < tl.rotation!.start && s.edge !== "toe");
      expect(before.length).toBeGreaterThan(10);
      expect(before.every((s) => s.foot === foot && s.edge !== JUMP_BY_ID[id].takeOff.edge), `${id} before`).toBe(true);
      expect(after.every((s) => s.foot === foot && s.edge === JUMP_BY_ID[id].takeOff.edge), `${id} after`).toBe(true);
      // facing forward along the travel before the turn, backward after it: half a revolution counter-clockwise
      const yawBefore = tl.root(turn.t - 0.1).yaw;
      const yawAfter = tl.root(turn.t + 0.45).yaw;
      expect(yawAfter - yawBefore).toBeGreaterThan(Math.PI * 0.9);
      expect(yawAfter - yawBefore).toBeLessThan(Math.PI * 1.25);
      const vel = { x: tl.root(turn.t - 0.1 + 1e-3).x - tl.root(turn.t - 0.1).x, z: tl.root(turn.t - 0.1 + 1e-3).z - tl.root(turn.t - 0.1).z };
      expect(Math.cos(yawBefore - Math.atan2(vel.x, vel.z))).toBeGreaterThan(0.9);
      // the cusp reaches into the circle at the middle of the turn
      const mid = tl.root(turn.t + 0.15);
      const base = tl.root(turn.t);
      expect(Math.abs(mid.z - base.z)).toBeGreaterThan(0.08);
    }
  });
  it("steps the Axel forward from the right back outside edge, turning clockwise toward the circle", () => {
    const tl = jumpTimeline({ jump: JUMP_BY_ID.A, rotations: 2 });
    const step = tl.markers.find((m) => m.label === "Step forward")!;
    expect(step).toBeDefined();
    expect(tl.trace.filter((s) => s.t < step.t).every((s) => s.foot === "R" && s.edge === "outside")).toBe(true);
    expect(tl.trace.filter((s) => s.t > step.t + 0.4 && s.t < tl.rotation!.start).every((s) => s.foot === "L" && s.edge === "outside")).toBe(true);
    // half a revolution clockwise, less the lobe's own counter-clockwise drift over those 0.55 s
    const d = tl.root(step.t + 0.45).yaw - tl.root(step.t - 0.1).yaw;
    expect(d).toBeLessThan(-Math.PI * 0.8);
    expect(d).toBeGreaterThan(-Math.PI * 1.1);
  });
  it("keeps the Lutz on one long back outside edge curving the other way from the Flip", () => {
    const lz = jumpTimeline({ jump: JUMP_BY_ID.Lz, rotations: 3 });
    const f = jumpTimeline({ jump: JUMP_BY_ID.F, rotations: 3 });
    expect(lz.markers.some((m) => m.label === "Three turn" || m.label === "Step forward")).toBe(false);
    expect(lz.trace.filter((s) => s.t < lz.rotation!.start && s.edge !== "toe").every((s) => s.foot === "L" && s.edge === "outside")).toBe(true);
    const tLoad = lz.rotation!.start - 0.4;
    expect(lz.root(tLoad - 1).z).toBeGreaterThan(0.05);
    expect(f.root(f.rotation!.start - 0.4 - 0.3).z).toBeLessThan(-0.05);
    // the Lutz approach is longer and straighter: for a circle |z| / x² ≈ 1 / 2R, so about half the Flip's curvature
    const curv = (tl: ReturnType<typeof jumpTimeline>, t: number) => Math.abs(tl.root(t).z) / (tl.root(t).x * tl.root(t).x);
    expect(curv(lz, tLoad - 1)).toBeLessThan(curv(f, f.rotation!.start - 0.4 - 0.3) * 0.7);
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
    // the Lutz rides a shallower 13 m edge, so it leans less than the Flip's 7 m lobe
    expect(Math.abs(lz.root(settled).roll!)).toBeCloseTo(jumpModel({ jump: JUMP_BY_ID.Lz, rotations: 3 }).lean, 6);
    expect(Math.abs(lz.root(settled).roll!)).toBeLessThan(Math.abs(f.root(settled).roll!));
    expect(Math.abs(f.root(settled).roll!)).toBeCloseTo(edgeLean(4.2, 7), 6);
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
  it("brakes the rotation on the blade in finite time, starting at the landing rate", () => {
    expect(landingSkid(0, Math.PI / 2, 10)).toBe(0);
    expect(landingSkid(1e-6, Math.PI / 2, 10) / 1e-6).toBeCloseTo(10, 3);
    // linear braking: done in 2·missing/ω, never later than SKID_MAX
    expect(landingSkid(Math.PI / 10 - 1e-3, Math.PI / 2, 10)).toBeLessThan(Math.PI / 2);
    expect(landingSkid(Math.PI / 10, Math.PI / 2, 10)).toBeCloseTo(Math.PI / 2, 9);
    expect(landingSkid(5, Math.PI / 2, 10)).toBeCloseTo(Math.PI / 2, 6);
    expect(landingSkid(SKID_MAX, TWO_PI, 3)).toBeCloseTo(TWO_PI, 9);
    expect(landingSkid(1, 0, 10)).toBe(0);
    // the rate never reverses, whether the brake is linear or capped by SKID_MAX
    for (const [missing, w] of [[Math.PI / 2, 10], [TWO_PI, 3], [0.3, 12]] as const) {
      let prev = 0;
      for (let t = 0; t <= SKID_MAX; t += 0.001) {
        const y = landingSkid(t, missing, w);
        expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = y;
      }
    }
    const clean = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3 });
    const q = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3, call: "q" });
    const tLand = q.rotation!.end;
    // the rate is continuous through touchdown for clean and called landings alike (the exit lobe adds its share)
    for (const tl of [clean, q]) {
      expect(rateAt(tl, tLand, 1) / rateAt(tl, tLand, -1)).toBeGreaterThan(0.95);
      expect(rateAt(tl, tLand, 1) / rateAt(tl, tLand, -1)).toBeLessThan(1.3);
    }
    // a clean landing carries a short natural skid; a q landing finishes its quarter on the ice
    expect(jumpModel({ jump: JUMP_BY_ID.T, rotations: 3 }).skid).toBeCloseTo(Math.min(jumpModel({ jump: JUMP_BY_ID.T, rotations: 3 }).spin.omegaLanding * SKID_TAU, SKID_CAP), 6);
    expect(jumpModel({ jump: JUMP_BY_ID.T, rotations: 3, call: "q" }).skid).toBeCloseTo(Math.PI / 2, 9);
    // by the end the yaw has finished the three revolutions plus the curve of the exit edge
    expect(q.root(q.duration).yaw - q.rotation!.yawStart!).toBeCloseTo(3 * TWO_PI + exitCurve(q.duration - tLand), 6);
    // a downgraded single pivots its missing rotation out within SKID_MAX
    const dg = jumpTimeline({ jump: JUMP_BY_ID.S, rotations: 1, call: "<<" });
    const end = dg.rotation!.end;
    expect((dg.root(end + SKID_MAX).yaw - dg.rotation!.yawStart! - exitCurve(SKID_MAX)) / TWO_PI).toBeCloseTo(1, 6);
    let prev = dg.root(end).yaw;
    for (let t = end; t <= dg.duration; t += 0.002) {
      expect(dg.root(t).yaw).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = dg.root(t).yaw;
    }
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
