import type { JumpType } from "@/data/types";
import { POSES, mirrorPose } from "../rig/poses";
import { JUMP_POSES } from "../rig/poses-jumps";
import { lerpPose, mergePoses, type Pose } from "../rig/pose";
import { airTimeFor, edgeLean, flight, inertiaSchedule, landingDip, landingSkid, preRotationAngle, rollToward, rotationProfile, SKID_CAP, SKID_TAU, VAULT_TIME, verticalVelocityForAirTime, type Flight, type RotationProfile } from "../physics/jump";
import { clamp01, easeInOut, easeOut, headingOf, linear, TWO_PI, type EdgeKind, type IceArrow, type Marker, type RootState, type Timeline, type TraceSample } from "./timeline";

export type RotationCall = "" | "q" | "<" | "<<";
/** Edge calls on Flip and Lutz: "e" = wrong edge (a lip or a flutz), "!" = unclear edge. */
export type EdgeCallParam = "" | "!" | "e";

export interface JumpParams {
  jump: JumpType;
  rotations: number;
  call?: RotationCall;
  /** Flip/Lutz take-off edge call: "e" rolls the edge the wrong way before the pick (the other lobe and lean), "!" rides a flat. */
  edgeCall?: EdgeCallParam;
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
/** Seconds before the pick over which a wrong-edge Flip or Lutz rides the rolled edge (the "e" call). */
export const EDGE_ROLL_TIME = 0.7;
/** Seconds before the pick over which an unclear-edge Flip or Lutz rides a flat (the "!" call). */
export const FLAT_TIME = 0.4;
/** Seconds the body lean takes to swap sides at a change of edge, or to straighten before a flat. */
const EDGE_BLEND = 0.3;

/** Fraction of a revolution missing for each call. */
export const MISSING_TURNS: Record<RotationCall, number> = { "": 0, q: 0.25, "<": 0.4, "<<": 0.6 };

const LOAD = 0.4;
const LAND = 0.55;
const EXIT = 1.1;
/** Seconds the edge lean takes to settle in or straighten out. */
const LEAN_RAMP = 0.3;

export const airTime = airTimeFor;

/* ---------- the entry path ---------- */

/** One piece of the entry path, listed from the take-off backward in time. */
export interface EntrySegment {
  /** Seconds this piece lasts; the last piece runs back to the start of the timeline. */
  duration: number;
  /** Signed curvature in 1/m: positive curves counter-clockwise (with the rotation), negative clockwise (against it), 0 is a flat. */
  curvature: number;
  edge: EdgeKind;
}

/** Which edge call a jump can carry: only the Flip and the Lutz are called for their take-off edge. */
const callsEdge = (jump: JumpType): boolean => jump.id === "F" || jump.id === "Lz";
const otherEdge = (edge: "outside" | "inside"): "outside" | "inside" => (edge === "inside" ? "outside" : "inside");

/**
 * The entry path of a jump, from the take-off backward: the jump's own lobe, and for a wrong
 * edge call the last EDGE_ROLL_TIME seconds on the other edge, curving the other way with that
 * edge's radius (a lip rides a 7 m inside lobe like a Flip's, a flutz a 13 m outside lobe like
 * a Lutz's); for an unclear edge the last FLAT_TIME seconds on a flat.
 */
export function entrySegments(p: JumpParams): EntrySegment[] {
  const { jump } = p;
  const counterRotated = jump.id === "Lz";
  const baseCurvature = (counterRotated ? -1 : 1) / entryRadius(jump);
  const base: EntrySegment = { duration: Infinity, curvature: baseCurvature, edge: jump.takeOff.edge };
  const call = callsEdge(jump) ? p.edgeCall ?? "" : "";
  if (call === "e") {
    // the lobe of the other edge: an inside edge curves with the rotation on 7 m, an outside edge against it on 13 m
    const rolled = otherEdge(jump.takeOff.edge);
    const curvature = rolled === "inside" ? 1 / ENTRIES["three-turn"].radius : -1 / ENTRIES["long-edge"].radius;
    return [{ duration: EDGE_ROLL_TIME, curvature, edge: rolled }, base];
  }
  if (call === "!") return [{ duration: FLAT_TIME, curvature: 0, edge: "flat" }, base];
  return [base];
}

interface PathState {
  x: number;
  z: number;
  /** Heading of the travel: the blade moves along (sin heading, 0, cos heading). */
  heading: number;
}

/** The direction to the skater's left of a heading, as (x, z). */
const leftOf = (heading: number): [number, number] => [Math.cos(heading), -Math.sin(heading)];

/** The state `dt` seconds earlier along a piece of path with the given curvature, at SPEED. */
function stepBack(s: PathState, curvature: number, dt: number): PathState {
  if (curvature === 0) return { x: s.x - SPEED * dt * Math.sin(s.heading), z: s.z - SPEED * dt * Math.cos(s.heading), heading: s.heading };
  const r = 1 / curvature;
  const [lx, lz] = leftOf(s.heading);
  const cx = s.x + r * lx;
  const cz = s.z + r * lz;
  const heading = s.heading - curvature * SPEED * dt;
  const [plx, plz] = leftOf(heading);
  return { x: cx - r * plx, z: cz - r * plz, heading };
}

interface EntryPath {
  segments: EntrySegment[];
  /** The state at the take-off end of each segment. */
  ends: PathState[];
  /** Seconds before take-off at which each segment ends (its take-off side). */
  endTimes: number[];
  /** Position, heading and curvature `tBefore` seconds before the take-off. */
  at: (tBefore: number) => PathState & { curvature: number; segment: number };
  /** The curvature smoothed across the segment boundaries: what the body leans to. */
  smoothedCurvature: (tBefore: number) => number;
  /** Curvature of the piece the blade leaves the ice from (0 on a flat). */
  takeOffCurvature: number;
}

function buildEntryPath(p: JumpParams): EntryPath {
  const segments = entrySegments(p);
  const ends: PathState[] = [];
  const endTimes: number[] = [];
  let state: PathState = { x: 0, z: 0, heading: headingOf(1, 0) };
  let tEnd = 0;
  for (const seg of segments) {
    ends.push(state);
    endTimes.push(tEnd);
    if (Number.isFinite(seg.duration)) {
      state = stepBack(state, seg.curvature, seg.duration);
      tEnd += seg.duration;
    }
  }
  const indexAt = (tBefore: number) => {
    let i = 0;
    while (i < segments.length - 1 && tBefore > endTimes[i] + segments[i].duration) i++;
    return i;
  };
  const at = (tBefore: number) => {
    const i = indexAt(Math.max(0, tBefore));
    const s = stepBack(ends[i], segments[i].curvature, Math.max(0, tBefore) - endTimes[i]);
    return { ...s, curvature: segments[i].curvature, segment: i };
  };
  const smoothedCurvature = (tBefore: number) => {
    let k = segments[0].curvature;
    for (let i = 1; i < segments.length; i++) {
      const boundary = endTimes[i];
      // into a flat the lean is already gone when the flat starts; at a change of edge it crosses zero on the boundary
      const offset = segments[i - 1].curvature === 0 ? 0 : -EDGE_BLEND / 2;
      const u = easeInOut(clamp01((tBefore - boundary - offset) / EDGE_BLEND));
      k += (segments[i].curvature - segments[i - 1].curvature) * u;
    }
    return k;
  };
  return { segments, ends, endTimes, at, smoothedCurvature, takeOffCurvature: segments[0].curvature };
}

/* ---------- the model ---------- */

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
  /** Body lean on the jump's own entry lobe (radians). */
  lean: number;
}

export function jumpModel(p: JumpParams): JumpModel {
  const axel = p.jump.id === "A";
  const nominal = p.rotations + (axel ? 0.5 : 0);
  const turns = Math.max(0, nominal - MISSING_TURNS[p.call ?? ""]);
  const T = airTimeFor(p.rotations, axel);
  const vaultTime = axel ? VAULT_TIME.axel : p.jump.takeOff.toePick ? VAULT_TIME.toe : VAULT_TIME.edge;
  // the heading drifts with the lobe the blade leaves from: with the rotation on a natural edge, against it on
  // the Lutz's counter edge (or a flutz's), not at all on a flat
  const driftRate = entrySegments(p)[0].curvature * SPEED;
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

/* ---------- the poses of each entry ---------- */

interface EntryPoses {
  /** What the skater does before the turn or step (empty for a plain edge or the Lutz's long edge). */
  before: { t: number; pose: Pose; ease?: (u: number) => number }[];
  /** On the take-off edge, settled, before the knee bend. */
  glide: Pose;
  /** The knee bend, or the reach of the toe pick. */
  prep: Pose;
  /** The instant of leaving the ice. */
  launch: Pose;
  /** Seconds before the knee bend at which the glide is still held, and after it at which the prep is reached. */
  glideUntil: number;
  prepAt: number;
}

/**
 * Each jump's own entry: the Loop's crossed free foot on the right back outside edge, the
 * Salchow's free-leg swing through its three turn into a wide take-off, the Flip's quick pick after
 * its three, the toe loop's right-foot three with the left toe reaching, the Axel's step forward
 * with the arms drawn back then swung, the Lutz's long edge with the counter upper body, the look
 * over the shoulder and the reach back of the right toe. Poses are authored for a counter-clockwise
 * skater on each jump's own foot (three/rig/poses-jumps.ts); the generic glides are mirrored onto it.
 */
function entryPosesFor(jump: JumpType, tTurn: number, edgeCall: EdgeCallParam): EntryPoses {
  const JP = JUMP_POSES;
  const leftFoot = jump.takeOff.foot === "left";
  // back-edge glides and the launch are authored on the right foot, the forward-edge glides on the left
  const onFoot = (pose: Pose, authoredLeft: boolean): Pose => (leftFoot === authoredLeft ? pose : mirrorPose(pose));
  const backGlide = onFoot(POSES.glideBO, false);
  const launch = onFoot(POSES.launch, false);
  const threeTurn = (forward: Pose, ready: Pose, after: Pose) => [
    { t: 0, pose: forward },
    { t: tTurn - 0.12, pose: forward },
    { t: tTurn + TURN_TIME * 0.5, pose: ready, ease: easeInOut },
    { t: tTurn + TURN_TIME + 0.15, pose: after, ease: easeInOut },
  ];
  switch (jump.id) {
    case "Lo":
    case "Eu":
      return { before: [], glide: JP.loopGlide, prep: JP.loopLoad, launch: JP.loopLaunch, glideUntil: 0.2, prepAt: LOAD * 0.55 };
    case "S":
      return { before: threeTurn(POSES.glideFO, POSES.turnReady, backGlide), glide: backGlide, prep: JP.salchowLoad, launch: JP.salchowSwing, glideUntil: 0.2, prepAt: LOAD * 0.55 };
    case "F":
      // the pick is quick: the edge is held square until the knee bend, then the toe goes straight back
      return { before: threeTurn(POSES.glideFO, POSES.turnReady, backGlide), glide: backGlide, prep: JP.flipPick, launch, glideUntil: 0.05, prepAt: LOAD * 0.6 };
    case "T":
      return { before: threeTurn(mirrorPose(POSES.glideFO), mirrorPose(POSES.turnReady), backGlide), glide: backGlide, prep: JP.toeLoopPick, launch, glideUntil: 0.1, prepAt: LOAD * 0.6 };
    case "A":
      return {
        before: [
          { t: 0, pose: POSES.glideBO },
          { t: tTurn - 0.1, pose: POSES.glideBO },
          { t: tTurn + TURN_TIME * 0.5, pose: POSES.turnReady, ease: easeInOut },
          { t: tTurn + TURN_TIME + 0.15, pose: JP.axelGlide, ease: easeInOut },
        ],
        glide: JP.axelGlide,
        prep: JP.axelLoad,
        launch: JP.axelLaunch,
        glideUntil: 0.2,
        prepAt: LOAD * 0.55,
      };
    case "Lz":
      // a lip: the shoulders turn early with the rotation and the edge follows them inside, so the reach is a Flip's
      return { before: [], glide: JP.lutzGlide, prep: edgeCall === "e" ? JP.flipPick : JP.lutzPick, launch, glideUntil: edgeCall === "e" ? EDGE_ROLL_TIME - LOAD + 0.05 : 0.3, prepAt: LOAD * 0.5 };
    default:
      return { before: [], glide: backGlide, prep: onFoot(POSES.loadBO, false), launch, glideUntil: 0.2, prepAt: LOAD * 0.55 };
  }
}

/* ---------- the timeline ---------- */

/**
 * Builds the timeline of a single jump: approach on the take-off edge, knee bend, flight
 * with the named number of revolutions, landing on the right back outside edge and exit.
 * The take-off point is the origin and the skater travels toward +X.
 */
export function jumpTimeline(p: JumpParams): Timeline {
  const { jump, rotations } = p;
  const call = p.call ?? "";
  const edgeCall: EdgeCallParam = callsEdge(jump) ? p.edgeCall ?? "" : "";
  const forwardTakeoff = jump.takeOff.direction === "forward";
  const counterRotated = jump.id === "Lz";
  const { nominal, turns, T, flight: f, spin, preRotation, airTurns, skid, vaultTime, omegaIce } = jumpModel(p);
  const kind = entryKindOf(jump);
  const entry = ENTRIES[kind];
  const tLoad = entry.approach;
  const tTakeoff = tLoad + LOAD;
  // a flutz needs its inside edge to show between the three turn and the roll, so the turn comes a little earlier
  const tTurn = entry.turnAt === undefined ? -1 : tLoad - entry.turnAt - (edgeCall === "e" ? 0.3 : 0);
  const turnSign = entry.turnSign ?? 1;
  // 0 before the turn or step, 1 after it: the facing swings half a revolution in between
  const turnFrac = (t: number) => (entry.turnAt === undefined ? 1 : easeInOut(clamp01((t - tTurn) / TURN_TIME)));
  const tLand = tTakeoff + T;
  const tExit = tLand + LAND;
  const duration = tExit + EXIT;
  const D = f.range;
  const tuck = inertiaSchedule(T);
  const path = buildEntryPath(p);
  const takeOffHeading = headingOf(1, 0);
  const exitCentreZ = -RADIUS; // landing on the right back outside edge curves naturally
  const facing = forwardTakeoff ? headingOf(1, 0) : headingOf(-1, 0);
  const yawTakeoff = facing + preRotation;
  const yawLanding = yawTakeoff + airTurns * TWO_PI;

  const root = (t: number): RootState => {
    if (t < tTakeoff) {
      const tBefore = tTakeoff - t;
      const s = path.at(tBefore);
      let { x, z } = s;
      // a three turn draws a cusp into the circle; the step forward only changes feet
      if (kind === "three-turn" && s.curvature !== 0) {
        const c = CUSP * Math.sin(Math.PI * clamp01((t - tTurn) / TURN_TIME)) * Math.sign(s.curvature);
        const [lx, lz] = leftOf(s.heading);
        x += c * lx;
        z += c * lz;
      }
      // the vault: the on-ice rate ramps up smoothly into the air rate over the last vaultTime seconds
      const pre = preRotationAngle(tBefore, vaultTime, omegaIce);
      const yaw = facing + (s.heading - takeOffHeading) - turnSign * Math.PI * (1 - turnFrac(t)) + pre;
      // lean into the current lobe (the lean swaps sides at a change of edge and vanishes on a flat):
      // settle onto the edge, then stand up for the vault
      const k = path.smoothedCurvature(tBefore);
      const lean = k === 0 ? 0 : Math.sign(k) * edgeLean(SPEED, 1 / Math.abs(k));
      const onEdge = easeInOut(clamp01(t / LEAN_RAMP)) * (1 - easeInOut(clamp01((t - (tTakeoff - LEAN_RAMP)) / LEAN_RAMP)));
      const [lx, lz] = leftOf(s.heading);
      return { x, y: 0, z, yaw, roll: rollToward(yaw, lx, lz, lean) * onEdge };
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
    return { x, y: landingDip(tl, f.vy), z, yaw, roll: rollToward(yaw, D - x, exitCentreZ - z, edgeLean(SPEED, RADIUS)) * onEdge };
  };

  const poses = entryPosesFor(jump, tTurn, edgeCall);
  // every listed jump lands on the right foot; the Euler lands on the left
  const landsLeft = jump.landing.foot === "left";
  const landOn = (pose: Pose): Pose => (landsLeft ? mirrorPose(pose) : pose);
  const landPose = landOn(POSES.land);
  const deepPose = landOn(lerpPose(POSES.land, POSES.landDeep, Math.min(1, Math.max(0, (rotations - 1) / 4)), () => [0, -1, 0]));
  const exitPose = landOn(POSES.glideBO);
  // the tuck closes and opens on the inertia schedule, so what the viewer sees drives the spin rate
  const keys = [
    ...(poses.before.length ? poses.before : [{ t: 0, pose: poses.glide }]),
    { t: tLoad - poses.glideUntil, pose: poses.glide },
    { t: tLoad + poses.prepAt, pose: poses.prep, ease: easeInOut },
    { t: tTakeoff, pose: poses.launch, ease: easeOut },
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
  const preEdge = kind === "three-turn" ? otherEdge(takeOffEdge) : takeOffEdge;
  for (let t = 0; t < tTakeoff; t += 1 / 40) {
    const r = root(t);
    const before = entry.turnAt !== undefined && t < tTurn + TURN_TIME / 2;
    trace.push({ t, x: r.x, z: r.z, foot: before ? preFoot : takeOffFoot, edge: before ? preEdge : path.segments[path.at(tTakeoff - t).segment].edge });
  }
  if (jump.takeOff.toePick) {
    // the toe is planted behind the skater along the line of travel, on the picking foot's own side
    // (the skater faces -X at the pick, so the left foot is at +Z)
    const pickFoot = jump.takeOff.toePickFoot === "left" ? "L" : "R";
    trace.push({ t: tTakeoff, x: -0.35, z: pickFoot === "L" ? 0.12 : -0.12, foot: pickFoot, edge: "toe" });
  }
  const landFoot = jump.landing.foot === "left" ? "L" : "R";
  for (let t = tLand; t <= duration; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: landFoot, edge: jump.landing.edge });
  }

  // two arrows on the ice make the counter-rotation visible: the way the edge curves over its last second
  // (the last curved piece of the path, so a rolled edge shows its own lobe and a flat the edge before it), and
  // the way the skater rotates; they bend the same way for every jump but the Lutz
  const arcIndex = path.segments.findIndex((s) => s.curvature !== 0);
  const arc = path.segments[arcIndex];
  const arcEnd = path.ends[arcIndex];
  const arcSpan = Math.min(1.0, arc.duration);
  const arcStart = stepBack(arcEnd, arc.curvature, arcSpan);
  const arcR = 1 / arc.curvature;
  const [elx, elz] = leftOf(arcEnd.heading);
  const arcCentre = { x: arcEnd.x + arcR * elx, z: arcEnd.z + arcR * elz };
  const curveWord = arc.curvature > 0 ? "counter-clockwise" : "clockwise";
  const rolledWord = edgeCall === "e" ? (counterRotated ? ", rolled to the inside edge: a lip" : ", rolled to the outside edge: a flutz") : edgeCall === "!" ? ", then rides a flat" : "";
  const arrows: IceArrow[] = [
    {
      x: arcCentre.x,
      z: arcCentre.z,
      radius: Math.abs(arcR) + 0.3,
      startAngle: Math.atan2(arcStart.x - arcCentre.x, arcStart.z - arcCentre.z),
      sweep: arc.curvature * SPEED * arcSpan,
      from: 0,
      to: tTakeoff + 0.25,
      color: "#475569",
      label: `edge curves ${curveWord}${rolledWord}`,
    },
    { x: 0, z: 0, radius: 0.9, startAngle: facing - 0.4, sweep: 1.55 * Math.PI, from: tLoad - 0.3, to: tLand + 0.4, color: "#d97706", label: "jump rotates counter-clockwise" },
  ];

  const edgeName = `${jump.takeOff.foot} ${jump.takeOff.direction} ${jump.takeOff.edge}`;
  const preEdgeName = kind === "step-forward" ? "right backward outside" : `${jump.takeOff.foot} forward ${preEdge}`;
  const code = `${rotations}${jump.id}${edgeCall}${call}`;
  const wrongName = counterRotated ? "lip" : "flutz";
  const edgeMarkers: Marker[] = [];
  if (edgeCall === "e") {
    const rolled = otherEdge(takeOffEdge);
    edgeMarkers.push({
      t: tTakeoff - EDGE_ROLL_TIME,
      label: `Edge rolls ${rolled}`,
      detail: `the left blade rolls from the ${takeOffEdge} to the ${rolled} edge before the pick: the lobe now curves ${rolled === "inside" ? "with the rotation, like a Flip's" : "against the rotation, like a Lutz's"}`,
    });
  } else if (edgeCall === "!") {
    edgeMarkers.push({ t: tTakeoff - FLAT_TIME, label: "Flat blade", detail: `the edge is unclear: the blade rides a flat for the last ${FLAT_TIME} s before the pick, with no lean either way` });
  }
  const takeOffDetail = jump.takeOff.toePick
    ? edgeCall === "e"
      ? `vaulting off the toe pick from the ${otherEdge(takeOffEdge)} edge: a ${wrongName}, called ${code} (wrong edge) and scored from the lower "e" row of the Scale of Values, GOE reduced -2 to -4`
      : edgeCall === "!"
        ? `vaulting off the toe pick from a flat: called ${code} (unclear edge), base value kept, GOE reduced -1 to -3`
        : "vaulting off the toe pick"
    : forwardTakeoff
      ? "forward take-off: an extra half revolution"
      : "springing from the edge";
  const kneeDetail = jump.takeOff.toePick
    ? jump.id === "Lz" && edgeCall !== "e"
      ? "right toe reaches far back along the line, shoulders still held against the rotation"
      : jump.id === "F"
        ? "a quick pick: the right toe goes straight back after the three"
        : `${jump.takeOff.toePickFoot} toe pick reaches back`
    : jump.id === "S"
      ? "deep left knee, the free leg trailing behind, ready to swing through"
      : jump.id === "A"
        ? "deep knee on the forward edge, arms drawn back for the swing"
        : jump.id === "Lo" || jump.id === "Eu"
          ? "sitting back over the right heel, the free foot still crossed in front"
          : "deep knee on the take-off edge";
  const markers: Marker[] = [
    kind === "three-turn"
      ? { t: 0, label: "Entry", detail: `gliding forward on the ${preEdgeName} edge${jump.id === "T" ? ", the left toe ready to reach" : ""}` }
      : kind === "step-forward"
        ? { t: 0, label: "Entry", detail: "gliding backward on the right outside edge" }
        : { t: 0, label: "Entry edge", detail: `${edgeName} edge${counterRotated ? ", a long shallow curve against the rotation, the head turned to look over the right shoulder" : jump.id === "Lo" || jump.id === "Eu" ? ", the left foot crossed in front" : ""}` },
    ...(kind === "three-turn"
      ? [{ t: tTurn, label: "Three turn", detail: `${preEdgeName} three turn onto the ${jump.takeOff.foot} back ${jump.takeOff.edge} edge${jump.id === "S" ? ", the free leg swinging through" : ""}` }]
      : kind === "step-forward"
        ? [{ t: tTurn, label: "Step forward", detail: "onto the left forward outside edge, opening toward the circle, the arms drawn back" }]
        : []),
    ...edgeMarkers,
    { t: tLoad, label: "Knee bend", detail: kneeDetail },
    { t: tTakeoff, label: "Take-off", detail: takeOffDetail },
    { t: tTakeoff + 0.12, label: "Rotation", detail: `${nominal} revolution${nominal === 1 ? "" : "s"} in about ${T.toFixed(2)} s, peaking near ${(spin.peakOmega / TWO_PI).toFixed(1)} rev/s in the tuck` },
    { t: tLand, label: "Landing", detail: call ? `${MISSING_TURNS[call] * 360}° short at touchdown (${call})` : "right back outside edge" },
    { t: tLand + 0.3, label: "Check-out", detail: "arms open, free leg extended, riding the exit edge" },
  ].sort((a, b) => a.t - b.t);

  const titleNote = edgeCall === "e" ? ` (wrong edge: a ${wrongName})` : edgeCall === "!" ? " (unclear edge)" : "";
  return {
    id: code,
    title: `${code} · ${jump.name}${titleNote}`,
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
