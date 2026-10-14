import { POSES, mirrorPose } from "../rig/poses";
import type { Pose } from "../rig/pose";
import { edgeLean, flight, inertiaSchedule, landingDip, landingSkid, preRotationAngle, rollToward, rotationProfile, SKID_CAP, SKID_TAU, VAULT_TIME, verticalVelocityForAirTime } from "../physics/jump";
import { clamp01, easeInOut, easeOut, headingOf, linear, TWO_PI, type RootState, type Timeline, type TraceSample } from "./timeline";

export type SpecialId = "split-jump" | "walley" | "inside-axel" | "backflip";

interface SpecialSpec {
  label: string;
  detail: string;
  /** Revolutions about the vertical axis in the air. */
  turns: number;
  /** Somersault revolutions (backflip). */
  flips: number;
  forwardTakeoff: boolean;
  /** +1 curves the entry against the rotation (Walley), -1 with it. */
  entrySign: 1 | -1;
  takeOffFoot: "L" | "R";
  takeOffEdge: "outside" | "inside";
  toePick: boolean;
  airPose: string;
  airTime: number;
  /** Lands forward (half-revolution jumps). */
  landsForward: boolean;
}

export const SPECIALS: Record<SpecialId, SpecialSpec> = {
  "split-jump": { label: "Split jump", detail: "a toe-assisted half-revolution jump with a full split in the air; not a listed jump, so it has no value and can decorate a step sequence", turns: 0.5, flips: 0, forwardTakeoff: false, entrySign: -1, takeOffFoot: "L", takeOffEdge: "inside", toePick: true, airPose: "splitAir", airTime: 0.5, landsForward: true },
  walley: { label: "Walley", detail: "an edge jump from the right back inside edge, rotating against the curve like a Lutz; not listed, so it is not called (a toe Walley is called as a toe loop)", turns: 1, flips: 0, forwardTakeoff: false, entrySign: 1, takeOffFoot: "R", takeOffEdge: "inside", toePick: false, airPose: "tuck", airTime: 0.42, landsForward: false },
  "inside-axel": { label: "Inside Axel", detail: "an Axel-type jump from the forward inside edge; the handbook lists it among non-listed jumps whatever its rotations, so it never counts as a jump element", turns: 1.5, flips: 0, forwardTakeoff: true, entrySign: -1, takeOffFoot: "R", takeOffEdge: "inside", toePick: false, airPose: "tuck", airTime: 0.45, landsForward: false },
  backflip: { label: "Backflip", detail: "a backward somersault from two feet; illegal only in Novice since 2024, with a 2.0 deduction there. Senior and Junior judges reflect it in Composition, it is not an element", turns: 0, flips: 1, forwardTakeoff: false, entrySign: -1, takeOffFoot: "L", takeOffEdge: "flat" as never, toePick: false, airPose: "flipTuck", airTime: 0.85, landsForward: false },
};

const SPEED = 4.0;
const RADIUS = 7;
const APPROACH = 1.3;
const LOAD = 0.4;
const LAND = 0.55;
const EXIT = 1.1;
const LEAN_RAMP = 0.3;

/** Non-listed jumps and the backflip, built like a listed jump but without a Scale of Values code. */
export function specialTimeline(id: SpecialId): Timeline {
  const spec = SPECIALS[id];
  const T = spec.airTime;
  const tLoad = APPROACH;
  const tTakeoff = APPROACH + LOAD;
  const tLand = tTakeoff + T;
  const tExit = tLand + LAND;
  const duration = tExit + EXIT;
  const f = flight(verticalVelocityForAirTime(T), SPEED * 0.9);
  const D = f.range;
  const tuck = inertiaSchedule(T);
  const entryCentreZ = spec.entrySign * RADIUS;
  const exitSign = spec.landsForward ? 1 : -1;
  const exitCentreZ = exitSign * RADIUS;
  const facing = spec.forwardTakeoff ? headingOf(1, 0) : headingOf(-1, 0);
  // two-footed flat take-off and landing for the backflip: no edge, so no lean
  const lean = spec.flips ? 0 : edgeLean(SPEED, RADIUS);
  const driftRate = (-spec.entrySign * SPEED) / RADIUS;
  // as for the listed jumps: the on-ice vault and the blade skid take their share of the rotation
  const vaultTime = spec.flips || !spec.turns ? 0 : spec.forwardTakeoff ? VAULT_TIME.axel : spec.toePick ? VAULT_TIME.toe : VAULT_TIME.edge;
  let spin = rotationProfile(spec.turns, T);
  let pre = 0;
  let skid = 0;
  let airTurns = spec.turns;
  let omegaIce = 0;
  for (let pass = 0; pass < 8 && vaultTime > 0; pass++) {
    omegaIce = Math.max(0.5, spin.omegaTakeoff - driftRate);
    pre = (omegaIce * vaultTime) / 2;
    skid = Math.min(spin.omegaLanding * SKID_TAU, SKID_CAP);
    airTurns = Math.max(0.25, spec.turns - (pre + skid) / TWO_PI);
    spin = rotationProfile(airTurns, T);
  }
  if (vaultTime > 0) omegaIce = (2 * pre) / vaultTime;

  const root = (t: number): RootState => {
    if (t < tTakeoff) {
      const phi = ((t - tTakeoff) * SPEED) / RADIUS;
      const x = RADIUS * Math.sin(phi);
      const z = entryCentreZ - spec.entrySign * RADIUS * Math.cos(phi);
      const yaw = facing - spec.entrySign * phi + preRotationAngle(tTakeoff - t, vaultTime, omegaIce);
      const onEdge = easeInOut(clamp01(t / LEAN_RAMP)) * (1 - easeInOut(clamp01((t - (tTakeoff - LEAN_RAMP)) / LEAN_RAMP)));
      return { x, y: 0, z, yaw, roll: rollToward(yaw, -x, entryCentreZ - z, lean) * onEdge };
    }
    if (t < tLand) {
      const ta = t - tTakeoff;
      const u = ta / T;
      const pitch = spec.flips ? -spec.flips * TWO_PI * easeInOut(u) : 0;
      // the somersault folds the body over its root, which rides above the ballistic path
      return { x: f.x(ta), y: f.y(ta) + (spec.flips ? 0.4 * Math.sin(Math.PI * u) : 0), z: 0, yaw: facing + pre + spin.angle(ta), pitch };
    }
    const tl = t - tLand;
    const phi = (tl * SPEED * 0.9) / RADIUS;
    const x = D + RADIUS * Math.sin(phi);
    const z = exitCentreZ - exitSign * RADIUS * Math.cos(phi);
    const yaw = facing + pre + airTurns * TWO_PI + landingSkid(tl, skid, spin.omegaLanding) + (spec.landsForward ? -phi : phi);
    const onEdge = easeInOut(clamp01((tl - 0.1) / LEAN_RAMP)) * (1 - easeInOut(clamp01((t - (duration - LEAN_RAMP)) / LEAN_RAMP)));
    return { x, y: landingDip(tl, f.vy), z, yaw, roll: rollToward(yaw, D - x, exitCentreZ - z, lean) * onEdge };
  };

  // forward glides are authored on the left foot, back glides, the pick and the launch on the right:
  // mirror whichever does not match the take-off foot (the two-footed backflip keeps the authored poses)
  const leftFoot = spec.takeOffFoot === "L";
  const onFoot = (pose: Pose, authoredLeft: boolean): Pose => (spec.flips || leftFoot === authoredLeft ? pose : mirrorPose(pose));
  const glide = spec.forwardTakeoff ? onFoot(POSES.glideFO, true) : onFoot(POSES.glideBO, false);
  const prep = spec.toePick ? onFoot(POSES.pickBack, false) : spec.forwardTakeoff ? onFoot(POSES.loadFO, true) : onFoot(POSES.loadBO, false);
  const launch = onFoot(POSES.launch, false);
  // a half-revolution jump lands forward on the other foot; the rest land on the right back outside edge
  const landFoot: TraceSample["foot"] = spec.flips ? "both" : spec.landsForward ? (leftFoot ? "R" : "L") : "R";
  const landPose = spec.landsForward ? (landFoot === "L" ? POSES.glideFO : mirrorPose(POSES.glideFO)) : POSES.land;
  const exitPose = spec.landsForward ? landPose : POSES.glideBO;
  const keys = [
    { t: 0, pose: glide },
    { t: tLoad - 0.2, pose: glide },
    { t: tLoad + LOAD * 0.55, pose: prep, ease: easeInOut },
    { t: tTakeoff, pose: launch, ease: easeOut },
    { t: tTakeoff + tuck.tuckIn, pose: POSES[spec.airPose], ease: easeOut },
    { t: tTakeoff + tuck.openOut, pose: POSES[spec.airPose], ease: linear },
    { t: tLand, pose: POSES.open, ease: easeOut },
    { t: tLand + 0.14, pose: landPose, ease: easeOut },
    { t: tExit + 0.5, pose: exitPose, ease: easeInOut },
    { t: duration, pose: exitPose, ease: linear },
  ];
  const trace: TraceSample[] = [];
  for (let t = 0; t < tTakeoff; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: spec.flips ? "both" : spec.takeOffFoot, edge: spec.flips ? "flat" : spec.takeOffEdge });
  }
  if (spec.toePick) trace.push({ t: tTakeoff, x: -0.35, z: -0.12, foot: leftFoot ? "R" : "L", edge: "toe" });
  for (let t = tLand; t <= duration; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: landFoot, edge: spec.flips ? "flat" : "outside" });
  }
  const markers = [
    { t: 0, label: "Entry", detail: spec.flips ? "backward on two feet" : `${spec.takeOffFoot === "L" ? "left" : "right"} ${spec.forwardTakeoff ? "forward" : "backward"} ${spec.takeOffEdge} edge` },
    { t: tLoad, label: "Preparation", detail: spec.toePick ? "toe pick reaches back" : "knee bend" },
    { t: tTakeoff, label: spec.label, detail: spec.detail },
    { t: tLand, label: "Landing", detail: spec.landsForward ? "forward, on the other foot" : spec.flips ? "two feet, backward" : "right back outside edge" },
  ];
  return {
    id,
    title: spec.label,
    duration,
    keys,
    root,
    markers,
    trace,
    rotation: spec.turns ? { start: tTakeoff, end: tLand, turns: spec.turns, nominal: spec.turns, yawStart: facing } : undefined,
    focus: { x: D / 2, z: 0 },
    heading: 0,
  };
}
