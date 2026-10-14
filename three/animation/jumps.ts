import type { JumpType } from "@/data/types";
import { POSES, mirrorPose } from "../rig/poses";
import { lerpPose, limb, mergePoses, vec, type Pose } from "../rig/pose";
import { airTimeFor, edgeLean, flight, inertiaSchedule, landingDip, landingSkid, preRotationAngle, rollToward, rotationProfile, SKID_CAP, SKID_TAU, VAULT_TIME, verticalVelocityForAirTime, type Flight, type RotationProfile } from "../physics/jump";
import { clamp01, easeInOut, easeOut, headingOf, linear, TWO_PI, type IceArrow, type RootState, type Timeline, type TraceSample } from "./timeline";

export type RotationCall = "" | "q" | "<" | "<<";

export interface JumpParams {
  jump: JumpType;
  rotations: number;
  call?: RotationCall;
}

const SPEED = 4.2; // m/s along the ice at take-off
const RADIUS = 7; // exit edge radius in metres (and the entry lobe of most jumps)

/**
 * How each jump is approached, so the entries look as different as they are on the ice:
 * Flip and Salchow turn a left forward outside three onto the back inside edge; the toe loop
 * a right forward inside three onto the back outside edge; the Axel steps forward from the
 * right back outside edge; the Lutz rides a long, shallow back outside edge that curves
 * against the rotation; the loop and the Euler simply glide in on their edge.
 */
export type EntryKind = "three-turn" | "step-forward" | "long-edge" | "edge";
export const ENTRY_KIND: Record<string, EntryKind> = { T: "three-turn", S: "three-turn", F: "three-turn", Lz: "long-edge", A: "step-forward" };
interface EntrySpec {
  /** Seconds from the start to the knee bend. */
  approach: number;
  /** Entry lobe radius in metres. */
  radius: number;
  /** Seconds before the knee bend at which the turn or step starts. */
  turnAt?: number;
  /** +1 turns with the jump's rotation (a three turn), -1 against it (the Axel's step forward opens to the circle). */
  turnSign?: 1 | -1;
}
const ENTRIES: Record<EntryKind, EntrySpec> = {
  "three-turn": { approach: 1.9, radius: 7, turnAt: 0.75, turnSign: 1 },
  "step-forward": { approach: 1.8, radius: 7, turnAt: 0.85, turnSign: -1 },
  "long-edge": { approach: 2.0, radius: 13 },
  edge: { approach: 1.35, radius: 7 },
};
export const entryKindOf = (jump: JumpType): EntryKind => ENTRY_KIND[jump.id] ?? "edge";
const entryRadius = (jump: JumpType): number => ENTRIES[entryKindOf(jump)].radius;
/** Seconds a three turn or a step forward takes. */
const TURN_TIME = 0.3;
/** Metres the blade's cusp reaches into the circle on a three turn. */
const CUSP = 0.16;
/** Share of the skating speed carried into the air; the vault costs the rest. */
const AIR_SPEED = 0.9;

/** Fraction of a revolution missing for each call. */
export const MISSING_TURNS: Record<RotationCall, number> = { "": 0, q: 0.25, "<": 0.4, "<<": 0.6 };

const LOAD = 0.4;
const LAND = 0.55;
const EXIT = 1.1;
/** Seconds the edge lean takes to settle in or straighten out. */
const LEAN_RAMP = 0.3;

export const airTime = airTimeFor;

/** The physics behind a jump, exposed so a HUD can plot ω(t) or quote L. */
export interface JumpModel {
  nominal: number;
  turns: number;
  /** Radians short at touchdown, finished on the ice. */
  missing: number;
  T: number;
  flight: Flight;
  spin: RotationProfile;
  /** Radians turned on the ice before leaving it. */
  preRotation: number;
  /** Revolutions made in the air (the counted rotation minus the on-ice parts). */
  airTurns: number;
  /** Radians finished on the ice after touchdown: the called shortfall, or the natural blade skid. */
  skid: number;
  /** Seconds the vault takes on the ice, and the on-ice rate it reaches at take-off. */
  vaultTime: number;
  omegaIce: number;
  lean: number;
}

export function jumpModel(p: JumpParams): JumpModel {
  const axel = p.jump.id === "A";
  const nominal = p.rotations + (axel ? 0.5 : 0);
  const turns = Math.max(0, nominal - MISSING_TURNS[p.call ?? ""]);
  const T = airTimeFor(p.rotations, axel);
  const vaultTime = axel ? VAULT_TIME.axel : p.jump.takeOff.toePick ? VAULT_TIME.toe : VAULT_TIME.edge;
  const entrySign = p.jump.id === "Lz" ? 1 : -1;
  const driftRate = (-entrySign * SPEED) / entryRadius(p.jump);
  const missingCalled = (nominal - turns) * TWO_PI;
  // The counted rotation = on-ice pre-rotation + air + skid on the blade. The pre-rotation and
  // the natural skid depend on the air rates, which depend on the air turns: two passes settle it.
  let spin = rotationProfile(turns, T);
  let preRotation = 0;
  let skid = missingCalled;
  let airTurns = turns;
  for (let pass = 0; pass < 8; pass++) {
    const omegaIce = Math.max(0.5, spin.omegaTakeoff - driftRate);
    preRotation = (omegaIce * vaultTime) / 2;
    skid = Math.max(missingCalled, Math.min(spin.omegaLanding * SKID_TAU, SKID_CAP));
    airTurns = Math.max(0.25, nominal - (preRotation + skid) / TWO_PI);
    spin = rotationProfile(airTurns, T);
  }
  // the fixed point converges to well under a millidegree; the ramp's peak is tied to the settled pre-rotation
  const omegaIce = (2 * preRotation) / vaultTime;
  return {
    nominal,
    turns,
    missing: missingCalled,
    T,
    flight: flight(verticalVelocityForAirTime(T), SPEED * AIR_SPEED),
    spin,
    preRotation,
    airTurns,
    skid,
    vaultTime,
    omegaIce,
    lean: edgeLean(SPEED, entryRadius(p.jump)),
  };
}

/**
 * Builds the timeline of a single jump: approach on the take-off edge, knee bend, flight
 * with the named number of revolutions, landing on the right back outside edge and exit.
 * The take-off point is the origin and the skater travels toward +X.
 */
export function jumpTimeline(p: JumpParams): Timeline {
  const { jump, rotations } = p;
  const call = p.call ?? "";
  const forwardTakeoff = jump.takeOff.direction === "forward";
  const counterRotated = jump.id === "Lz";
  const { nominal, turns, T, flight: f, spin, preRotation, airTurns, skid, vaultTime, omegaIce, lean } = jumpModel(p);
  const kind = entryKindOf(jump);
  const entry = ENTRIES[kind];
  const R = entry.radius;
  const tLoad = entry.approach;
  const tTakeoff = tLoad + LOAD;
  const tTurn = entry.turnAt === undefined ? -1 : tLoad - entry.turnAt;
  const turnSign = entry.turnSign ?? 1;
  // 0 before the turn or step, 1 after it: the facing swings half a revolution in between
  const turnFrac = (t: number) => (entry.turnAt === undefined ? 1 : easeInOut(clamp01((t - tTurn) / TURN_TIME)));
  const tLand = tTakeoff + T;
  const tExit = tLand + LAND;
  const duration = tExit + EXIT;
  const D = f.range;
  const tuck = inertiaSchedule(T);

  // entry arc: centre on the -Z side for natural edges, +Z for the counter-rotated Lutz
  const entrySign = counterRotated ? 1 : -1;
  const entryCentreZ = entrySign * R;
  const exitCentreZ = -RADIUS; // landing on the right back outside edge curves naturally
  const facing = forwardTakeoff ? headingOf(1, 0) : headingOf(-1, 0);
  const yawTakeoff = facing + preRotation;
  const yawLanding = yawTakeoff + airTurns * TWO_PI;

  const root = (t: number): RootState => {
    if (t < tTakeoff) {
      // position along the entry circle, phi = 0 at take-off
      const phi = ((t - tTakeoff) * SPEED) / R; // negative before take-off
      let x = R * Math.sin(phi);
      let z = entryCentreZ - entrySign * R * Math.cos(phi);
      // a three turn draws a cusp into the circle; the step forward only changes feet
      if (kind === "three-turn") {
        const c = CUSP * Math.sin(Math.PI * clamp01((t - tTurn) / TURN_TIME));
        x -= c * Math.sin(phi);
        z += c * entrySign * Math.cos(phi);
      }
      // the vault: the on-ice rate ramps up smoothly into the air rate over the last vaultTime seconds
      const pre = preRotationAngle(tTakeoff - t, vaultTime, omegaIce);
      const yaw = facing - turnSign * Math.PI * (1 - turnFrac(t)) - entrySign * phi + pre;
      // lean into the entry circle: settle onto the edge, then stand up for the vault
      const onEdge = easeInOut(clamp01(t / LEAN_RAMP)) * (1 - easeInOut(clamp01((t - (tTakeoff - LEAN_RAMP)) / LEAN_RAMP)));
      return { x, y: 0, z, yaw, roll: rollToward(yaw, -x, entryCentreZ - z, lean) * onEdge };
    }
    if (t < tLand) {
      const ta = t - tTakeoff;
      return { x: f.x(ta), y: f.y(ta), z: 0, yaw: yawTakeoff + spin.angle(ta) };
    }
    // landing and exit on the right back outside edge, curving toward -Z
    const tl = t - tLand;
    const phi = (tl * SPEED * 0.92) / RADIUS;
    const x = D + RADIUS * Math.sin(phi);
    const z = exitCentreZ + RADIUS * Math.cos(phi);
    // the blade brakes the spin and finishes the last part of the rotation on the ice, then follows the curve
    const yaw = yawLanding + landingSkid(tl, skid, spin.omegaLanding) + phi;
    const onEdge = easeInOut(clamp01((tl - 0.1) / LEAN_RAMP)) * (1 - easeInOut(clamp01((t - (duration - LEAN_RAMP)) / LEAN_RAMP)));
    return { x, y: landingDip(tl, f.vy), z, yaw, roll: rollToward(yaw, D - x, exitCentreZ - z, lean) * onEdge };
  };

  // back-edge glides, the pick and the launch are authored on the right foot, the forward-edge glides on the
  // left; mirror whichever does not match this jump's take-off foot (left for Salchow, Flip, Lutz and Axel)
  const leftFoot = jump.takeOff.foot === "left";
  const onFoot = (pose: Pose, authoredLeft: boolean): Pose => (leftFoot === authoredLeft ? pose : mirrorPose(pose));
  let glide = forwardTakeoff ? onFoot(POSES.glideFO, true) : onFoot(POSES.glideBO, false);
  if (kind === "long-edge") {
    // the Lutz glide: free leg and that arm stretched back along the line of travel, the other arm
    // leading, head turned to look over the shoulder down the long edge
    const freeRight = leftFoot;
    const lead = freeRight ? ("upper_arm_L" as const) : ("upper_arm_R" as const);
    const trail = freeRight ? ("upper_arm_R" as const) : ("upper_arm_L" as const);
    const leadFore = freeRight ? ("forearm_L" as const) : ("forearm_R" as const);
    const trailFore = freeRight ? ("forearm_R" as const) : ("forearm_L" as const);
    const side = freeRight ? -1 : 1;
    glide = mergePoses(glide, {
      bones: {
        [lead]: { dir: limb(55, -side * 55) },
        [leadFore]: { dir: limb(60, -side * 55) },
        [trail]: { dir: limb(-45, side * 40) },
        [trailFore]: { dir: limb(-50, side * 40) },
        chest: { dir: vec(0, 0.97, 0.08), twist: side * 0.35 },
        head: { dir: vec(0, 0.98, -0.12), twist: side * 0.7 },
      },
    });
  }
  const load = forwardTakeoff ? onFoot(POSES.loadFO, true) : onFoot(POSES.loadBO, false);
  const prep: Pose = jump.takeOff.toePick ? onFoot(POSES.pickBack, false) : load;
  const launch = onFoot(POSES.launch, false);
  // what the skater does before the turn or step: forward on the take-off foot for a three turn,
  // backward on the right foot before the Axel's step forward
  const entryKeys: { t: number; pose: Pose; ease?: (u: number) => number }[] = [];
  if (kind === "three-turn") {
    const forwardGlide = onFoot(POSES.glideFO, true);
    entryKeys.push({ t: 0, pose: forwardGlide }, { t: tTurn - 0.12, pose: forwardGlide }, { t: tTurn + TURN_TIME * 0.5, pose: onFoot(POSES.turnReady, true), ease: easeInOut }, { t: tTurn + TURN_TIME + 0.15, pose: glide, ease: easeInOut });
  } else if (kind === "step-forward") {
    entryKeys.push({ t: 0, pose: POSES.glideBO }, { t: tTurn - 0.1, pose: POSES.glideBO }, { t: tTurn + TURN_TIME * 0.5, pose: POSES.turnReady, ease: easeInOut }, { t: tTurn + TURN_TIME + 0.15, pose: glide, ease: easeInOut });
  } else {
    entryKeys.push({ t: 0, pose: glide });
  }
  // every listed jump lands on the right foot; the Euler lands on the left
  const landsLeft = jump.landing.foot === "left";
  const landOn = (pose: Pose): Pose => (landsLeft ? mirrorPose(pose) : pose);
  const landPose = landOn(POSES.land);
  const deepPose = landOn(lerpPose(POSES.land, POSES.landDeep, Math.min(1, Math.max(0, (rotations - 1) / 4)), () => [0, -1, 0]));
  const exitPose = landOn(POSES.glideBO);
  // the tuck closes and opens on the inertia schedule, so what the viewer sees drives the spin rate
  const keys = [
    ...entryKeys,
    { t: tLoad - 0.2, pose: glide },
    { t: tLoad + LOAD * 0.55, pose: prep, ease: easeInOut },
    { t: tTakeoff, pose: launch, ease: easeOut },
    { t: tTakeoff + tuck.tuckIn, pose: POSES.tuck, ease: easeOut },
    { t: tTakeoff + tuck.openOut, pose: POSES.tuck, ease: linear },
    { t: tLand, pose: landOn(POSES.open), ease: easeOut },
    // the knee absorbs the landing: deeper for bigger jumps, then rising into the check-out
    { t: tLand + 0.1, pose: deepPose, ease: easeOut },
    { t: tLand + 0.32, pose: landPose, ease: easeInOut },
    { t: tLand + LAND, pose: landPose, ease: linear },
    { t: tExit + 0.5, pose: exitPose, ease: easeInOut },
    { t: duration, pose: exitPose, ease: linear },
  ];

  const trace: TraceSample[] = [];
  const takeOffFoot = jump.takeOff.foot === "left" ? "L" : "R";
  const takeOffEdge = jump.takeOff.edge;
  // a three turn changes the edge on the same foot; the Axel's step forward changes the foot
  const preFoot = kind === "step-forward" ? "R" : takeOffFoot;
  const preEdge = kind === "three-turn" ? (takeOffEdge === "inside" ? "outside" : "inside") : takeOffEdge;
  for (let t = 0; t < tTakeoff; t += 1 / 40) {
    const r = root(t);
    const before = entry.turnAt !== undefined && t < tTurn + TURN_TIME / 2;
    trace.push({ t, x: r.x, z: r.z, foot: before ? preFoot : takeOffFoot, edge: before ? preEdge : takeOffEdge });
  }
  if (jump.takeOff.toePick) {
    const pickFoot = jump.takeOff.toePickFoot === "left" ? "L" : "R";
    const sideSign = pickFoot === "L" ? 1 : -1;
    trace.push({ t: tTakeoff, x: -0.35, z: entrySign === 1 ? 0.12 * sideSign : -0.12 * sideSign, foot: pickFoot, edge: "toe" });
  }
  const landFoot = jump.landing.foot === "left" ? "L" : "R";
  for (let t = tLand; t <= duration; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: landFoot, edge: jump.landing.edge });
  }

  // two arrows on the ice make the counter-rotation visible: the way the entry edge curves over
  // its last second, and the way the skater rotates; they bend the same way for every jump but the Lutz
  const phi0 = (-1.0 * SPEED) / R;
  const arrows: IceArrow[] = [
    {
      x: 0,
      z: entryCentreZ,
      radius: R + 0.3,
      startAngle: entrySign === -1 ? phi0 : Math.PI - phi0,
      sweep: entrySign === -1 ? -phi0 : phi0,
      from: 0,
      to: tTakeoff + 0.25,
      color: "#475569",
      label: `edge curves ${entrySign === -1 ? "counter-clockwise" : "clockwise"}`,
    },
    { x: 0, z: 0, radius: 0.9, startAngle: facing - 0.4, sweep: 1.55 * Math.PI, from: tLoad - 0.3, to: tLand + 0.4, color: "#d97706", label: "jump rotates counter-clockwise" },
  ];
  const edgeName = `${jump.takeOff.foot} ${jump.takeOff.direction} ${jump.takeOff.edge}`;
  const preEdgeName = kind === "step-forward" ? "right backward outside" : `${jump.takeOff.foot} forward ${preEdge}`;
  const markers = [
    kind === "three-turn"
      ? { t: 0, label: "Entry", detail: `gliding forward on the ${preEdgeName} edge` }
      : kind === "step-forward"
        ? { t: 0, label: "Entry", detail: "gliding backward on the right outside edge" }
        : { t: 0, label: "Entry edge", detail: `${edgeName} edge${counterRotated ? ", a long shallow curve against the rotation" : ""}` },
    ...(kind === "three-turn"
      ? [{ t: tTurn, label: "Three turn", detail: `${preEdgeName} three turn onto the ${jump.takeOff.foot} back ${jump.takeOff.edge} edge` }]
      : kind === "step-forward"
        ? [{ t: tTurn, label: "Step forward", detail: "onto the left forward outside edge, opening toward the circle" }]
        : []),
    { t: tLoad, label: "Knee bend", detail: jump.takeOff.toePick ? `${jump.takeOff.toePickFoot} toe pick reaches back` : "deep knee on the take-off edge" },
    { t: tTakeoff, label: "Take-off", detail: jump.takeOff.toePick ? "vaulting off the toe pick" : forwardTakeoff ? "forward take-off: an extra half revolution" : "springing from the edge" },
    { t: tTakeoff + 0.12, label: "Rotation", detail: `${nominal} revolution${nominal === 1 ? "" : "s"} in about ${T.toFixed(2)} s, peaking near ${(spin.peakOmega / TWO_PI).toFixed(1)} rev/s in the tuck` },
    { t: tLand, label: "Landing", detail: call ? `${MISSING_TURNS[call] * 360}° short at touchdown (${call})` : "right back outside edge" },
    { t: tLand + 0.3, label: "Check-out", detail: "arms open, free leg extended, riding the exit edge" },
  ];

  return {
    id: `${rotations}${jump.id}${call}`,
    title: `${rotations}${jump.id}${call} · ${jump.name}`,
    duration,
    keys,
    root,
    markers,
    trace,
    arrows,
    rotation: { start: tTakeoff, end: tLand, turns, nominal, yawStart: facing },
    focus: { x: D / 2, z: 0 },
    heading: 0,
  };
}

export const EMPTY_POSE: Pose = mergePoses({ bones: {} });
