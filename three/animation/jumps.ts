import type { JumpType } from "@/data/types";
import { POSES, mirrorPose } from "../rig/poses";
import { lerpPose } from "../rig/pose";
import { mergePoses, type Pose } from "../rig/pose";
import { airTimeFor, edgeLean, flight, inertiaSchedule, landingDip, landingSkid, preRotationAngle, rollToward, rotationProfile, SKID_CAP, SKID_TAU, VAULT_TIME, verticalVelocityForAirTime, type Flight, type RotationProfile } from "../physics/jump";
import { clamp01, easeInOut, easeOut, headingOf, linear, TWO_PI, type RootState, type Timeline, type TraceSample } from "./timeline";

export type RotationCall = "" | "q" | "<" | "<<";

export interface JumpParams {
  jump: JumpType;
  rotations: number;
  call?: RotationCall;
}

const SPEED = 4.2; // m/s along the ice at take-off
const RADIUS = 7; // entry and exit edge radius in metres
/** Share of the skating speed carried into the air; the vault costs the rest. */
const AIR_SPEED = 0.9;

/** Fraction of a revolution missing for each call. */
export const MISSING_TURNS: Record<RotationCall, number> = { "": 0, q: 0.25, "<": 0.4, "<<": 0.6 };

const APPROACH = 1.35;
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
  const driftRate = (-entrySign * SPEED) / RADIUS;
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
    lean: edgeLean(SPEED, RADIUS),
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
  const tLoad = APPROACH;
  const tTakeoff = APPROACH + LOAD;
  const tLand = tTakeoff + T;
  const tExit = tLand + LAND;
  const duration = tExit + EXIT;
  const D = f.range;
  const tuck = inertiaSchedule(T);

  // entry arc: centre on the -Z side for natural edges, +Z for the counter-rotated Lutz
  const entrySign = counterRotated ? 1 : -1;
  const entryCentreZ = entrySign * RADIUS;
  const exitCentreZ = -RADIUS; // landing on the right back outside edge curves naturally
  const facing = forwardTakeoff ? headingOf(1, 0) : headingOf(-1, 0);
  const yawTakeoff = facing + preRotation;
  const yawLanding = yawTakeoff + airTurns * TWO_PI;

  const root = (t: number): RootState => {
    if (t < tTakeoff) {
      // position along the entry circle, phi = 0 at take-off
      const phi = ((t - tTakeoff) * SPEED) / RADIUS; // negative before take-off
      const x = RADIUS * Math.sin(phi);
      const z = entryCentreZ - entrySign * RADIUS * Math.cos(phi);
      // the vault: the on-ice rate ramps up smoothly into the air rate over the last vaultTime seconds
      const pre = preRotationAngle(tTakeoff - t, vaultTime, omegaIce);
      const yaw = facing - entrySign * phi + pre;
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
  const glide = forwardTakeoff ? onFoot(POSES.glideFO, true) : onFoot(POSES.glideBO, false);
  const load = forwardTakeoff ? onFoot(POSES.loadFO, true) : onFoot(POSES.loadBO, false);
  const prep: Pose = jump.takeOff.toePick ? onFoot(POSES.pickBack, false) : load;
  const launch = onFoot(POSES.launch, false);
  // every listed jump lands on the right foot; the Euler lands on the left
  const landsLeft = jump.landing.foot === "left";
  const landOn = (pose: Pose): Pose => (landsLeft ? mirrorPose(pose) : pose);
  const landPose = landOn(POSES.land);
  const deepPose = landOn(lerpPose(POSES.land, POSES.landDeep, Math.min(1, Math.max(0, (rotations - 1) / 4)), () => [0, -1, 0]));
  const exitPose = landOn(POSES.glideBO);
  // the tuck closes and opens on the inertia schedule, so what the viewer sees drives the spin rate
  const keys = [
    { t: 0, pose: glide },
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
  for (let t = 0; t < tTakeoff; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: takeOffFoot, edge: takeOffEdge });
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

  const edgeName = `${jump.takeOff.foot} ${jump.takeOff.direction} ${jump.takeOff.edge}`;
  const markers = [
    { t: 0, label: "Entry edge", detail: `${edgeName} edge${counterRotated ? ", curving against the rotation" : ""}` },
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
    rotation: { start: tTakeoff, end: tLand, turns, nominal, yawStart: facing },
    focus: { x: D / 2, z: 0 },
    heading: 0,
  };
}

export const EMPTY_POSE: Pose = mergePoses({ bones: {} });
