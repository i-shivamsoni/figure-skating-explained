import { JUMP_BY_ID } from "@/data/jumps";
import type { Pose, Vec3 } from "../rig/pose";
import { mirrorPose, POSES } from "../rig/poses";
import { edgeLean, flight, inertiaSchedule, landingDip, landingSkid, preRotationAngle, rollToward, rotationProfile, SKID_CAP, SKID_TAU, VAULT_TIME, verticalVelocityForAirTime, type RotationProfile } from "../physics/jump";
import { jumpTimeline } from "./jumps";
import { spinRateFactor } from "./spins";
import { clamp01, easeInOut, easeOut, headingOf, linear, TWO_PI, type Ease, type Marker, type PoseKey, type RootState, type Timeline, type TraceSample } from "./timeline";

/**
 * Pair Skating elements (Technical Panel Handbook Pairs 2026-27). The primary track is the
 * Woman, the partner track the Man (variant "male"). Positions are tied together through
 * "hold points": a point in each skater's space (the Man's palms, the Woman's hips or hand)
 * that the timeline keeps coincident, so the Woman's root follows wherever the Man's hands go.
 */

export type PairId = "3Li" | "4Li" | "5RLi" | "3Tw" | "3LzTh" | "FiDs" | "BoDs" | "PCoSp" | "3T+3T";

export interface PairPreset {
  id: PairId;
  title: string;
  /** Scale of Values codes whose base values add up to the element's value. */
  codes: string[];
  build: () => Timeline;
}

/* ---------- geometry helpers ---------- */

/** Rotate a skater-space offset into rink space for a skater facing `yaw` (the skater faces (sin yaw, 0, cos yaw)). */
export function rotY(yaw: number, v: Vec3): Vec3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

const lerpV = (a: Vec3, b: Vec3, u: number): Vec3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

/** A piecewise-linear rate schedule in revolutions per second. */
interface RateSeg {
  from: number;
  to: number;
  w0: number;
  w1: number;
}

/** Revolutions turned by time `t` under the schedule (zero before the first segment, constant after the last). */
function revsAt(segs: RateSeg[], t: number): number {
  let revs = 0;
  for (const sg of segs) {
    if (t <= sg.from) break;
    const end = Math.min(t, sg.to);
    const u = (end - sg.from) / (sg.to - sg.from);
    const wEnd = sg.w0 + (sg.w1 - sg.w0) * u;
    revs += ((sg.w0 + wEnd) / 2) * (end - sg.from);
  }
  return revs;
}

function sampleTrace(root: (t: number) => RootState, from: number, to: number, foot: TraceSample["foot"], edge: TraceSample["edge"], actor?: "partner", step = 1 / 40): TraceSample[] {
  const out: TraceSample[] = [];
  for (let t = from; t <= to; t += step) {
    const r = root(t);
    out.push(actor ? { t, x: r.x, z: r.z, foot, edge, actor } : { t, x: r.x, z: r.z, foot, edge });
  }
  return out;
}

const ARM_BONES = ["upper_arm_L", "forearm_L", "hand_L", "upper_arm_R", "forearm_R", "hand_R"] as const;

/** A pose with the arms of another pose. */
function withArms(base: Pose, arms: Pose): Pose {
  const bones: Pose["bones"] = { ...base.bones };
  for (const b of ARM_BONES) {
    const aim = arms.bones[b];
    if (aim) bones[b] = aim;
    else delete bones[b];
  }
  return { bones, hips: base.hips };
}

/**
 * Hold points in each skater's space (metres), measured on the exported models: the Man's palms
 * in his lifting poses, and the point of the Woman that his hands hold in each of her positions.
 * Lift positions put her hips at the root (see poses.ts), so `upright` is held at the origin.
 */
const MAN = {
  /** Both palms at full extension overhead (liftHold), midpoint. */
  hold2: [0, 1.99, 0.11] as Vec3,
  /** Right palm in the one-hand hold (liftHoldOne). */
  holdR: [-0.105, 1.99, 0.1] as Vec3,
  /** Palms in front at hip height (liftLoad), at the Woman's waist on the ice. */
  load: [0, 0.95, 0.69] as Vec3,
  /** Palms at the Woman's hips as she is placed on the ice beside him. */
  set: [0.55, 0.79, 0.35] as Vec3,
  /** Palms in front at waist height, to his right (throwAssist). */
  throwAssist: [-0.59, 0.95, 0.33] as Vec3,
  /** Left palm, arm fully extended in the pivot. */
  pivot: [0.7, 0.74, 0.08] as Vec3,
  /** Left palm, arm extended on the entry curve (pivotEntry). */
  pivotEntry: [0.74, 1.27, 0.14] as Vec3,
};

const WOMAN = {
  upright: [0, 0, 0] as Vec3,
  press: [0, -0.13, 0.19] as Vec3,
  star: [-0.46, -0.75, 0] as Vec3,
  platter: [-0.156, -0.6, 0.45] as Vec3,
  /** Waist with the root between the blades (ordinary poses). */
  waist: [0, 0.95, 0] as Vec3,
  /** Hips in the landing pose (knee bent). */
  landHips: [0, 0.79, 0] as Vec3,
  /** Left palm in the forward inside death spiral. */
  fiDs: [1.08, 0.75, 0.02] as Vec3,
  /** Right palm in the backward outside death spiral (root facing away from the pivot). */
  boDs: [-0.215, 0.9, -1.17] as Vec3,
  spiralHold: [0.79, 1.23, 0.14] as Vec3,
  spiralHoldBack: [-0.28, 1.48, -0.68] as Vec3,
};

const BACKWARD = headingOf(-1, 0); // facing -X while travelling +X

/* ---------- lifts ---------- */

interface LiftPosition {
  pose: string;
  hold: Vec3;
  man: string;
  manHold: Vec3;
  /** The Woman's yaw relative to the Man's. */
  yawOffset: number;
  /** Revolutions of the Man held in this position. */
  revs: number;
  label: string;
  detail: string;
}

interface LiftSpec {
  id: PairId;
  title: string;
  codes: string[];
  entry: string;
  takeOff: string;
  /** Her yaw relative to his at the take-off; a Lasso rotates her in relation to him on the way up. */
  takeOffYaw: number;
  positions: LiftPosition[];
}

interface Station {
  t: number;
  w: Vec3;
  m: Vec3;
  yaw: number;
  ease: Ease;
}

const LIFT_R = 6;
const LIFT_SPEED = 3.2;
/** Revolutions per second of the Man in the lift. */
const LIFT_RATE = 0.9;

function stationAt(stations: Station[], t: number): { w: Vec3; m: Vec3; yaw: number } {
  if (t <= stations[0].t) return stations[0];
  for (let i = 1; i < stations.length; i++) {
    const s = stations[i];
    if (t <= s.t) {
      const p = stations[i - 1];
      const span = s.t - p.t;
      const e = span <= 0 ? 1 : s.ease((t - p.t) / span);
      return { w: lerpV(p.w, s.w, e), m: lerpV(p.m, s.m, e), yaw: p.yaw + (s.yaw - p.yaw) * e };
    }
  }
  return stations[stations.length - 1];
}

/**
 * An overhead lift: both skate backward on a long curve, the Woman takes off, is carried at full
 * arm extension through the listed positions while the Man revolves, and is set down beside him.
 */
function liftTimeline(spec: LiftSpec): Timeline {
  const tLoad = 1.5;
  const tOff = tLoad + 0.35;
  const tTop = tOff + 0.6;
  let t = tTop;
  const sched: { pos: LiftPosition; from: number; settled: number; to: number }[] = [];
  for (let i = 0; i < spec.positions.length; i++) {
    const pos = spec.positions[i];
    const trans = i === 0 ? 0 : 0.5;
    const hold = pos.revs / LIFT_RATE;
    sched.push({ pos, from: t, settled: t + trans, to: t + trans + hold });
    t += trans + hold;
  }
  const tBend = t;
  const tDown = tBend + 0.6;
  const duration = tDown + 1.4;

  // the Man's path: take-off at the origin travelling +X, curving toward -Z; he faces backward
  const psi = (time: number) => ((time - tOff) * LIFT_SPEED) / LIFT_R;
  const manPos = (time: number): [number, number] => [LIFT_R * Math.sin(psi(time)), -LIFT_R + LIFT_R * Math.cos(psi(time))];
  const segs: RateSeg[] = [
    { from: tOff, to: tTop, w0: 0, w1: LIFT_RATE },
    { from: tTop, to: tBend, w0: LIFT_RATE, w1: LIFT_RATE },
    { from: tBend, to: tDown, w0: LIFT_RATE, w1: 0 },
  ];
  const manYaw = (time: number) => BACKWARD + psi(time) + revsAt(segs, time) * TWO_PI;

  const first = spec.positions[0];
  const stations: Station[] = [
    { t: 0, w: WOMAN.waist, m: MAN.load, yaw: spec.takeOffYaw, ease: linear },
    { t: tOff, w: WOMAN.waist, m: MAN.load, yaw: spec.takeOffYaw, ease: linear },
    { t: tTop, w: first.hold, m: first.manHold, yaw: first.yawOffset, ease: easeOut },
  ];
  for (const { pos, from, settled } of sched.slice(1)) {
    const prev = stations[stations.length - 1];
    stations.push({ ...prev, t: from, ease: linear });
    stations.push({ t: settled, w: pos.hold, m: pos.manHold, yaw: pos.yawOffset, ease: easeInOut });
  }
  const last = stations[stations.length - 1];
  stations.push({ ...last, t: tBend, ease: linear });
  stations.push({ t: tDown, w: WOMAN.landHips, m: MAN.set, yaw: 0, ease: easeInOut });

  const manRoot = (time: number): RootState => {
    const [x, z] = manPos(time);
    return { x, y: 0, z, yaw: manYaw(time) };
  };
  const root = (time: number): RootState => {
    const [mx, mz] = manPos(time);
    const ym = manYaw(time);
    const s = stationAt(stations, time);
    const yaw = ym + s.yaw;
    const hm = rotY(ym, s.m);
    const hw = rotY(yaw, s.w);
    const y = time < tOff || time > tDown ? 0 : hm[1] - hw[1];
    return { x: mx + hm[0] - hw[0], y, z: mz + hm[2] - hw[2], yaw };
  };

  const keys: PoseKey[] = [
    { t: 0, pose: POSES.glideBO },
    { t: tLoad - 0.2, pose: POSES.glideBO },
    { t: tLoad + 0.25, pose: POSES.loadBO, ease: easeInOut },
    { t: tOff, pose: POSES.launch, ease: easeOut },
    { t: tTop, pose: POSES[first.pose], ease: easeOut },
  ];
  const manApproach = withArms(POSES.glideBO, POSES.liftLoad);
  const manKeys: PoseKey[] = [
    { t: 0, pose: manApproach },
    { t: tLoad - 0.2, pose: manApproach },
    { t: tLoad + 0.25, pose: POSES.liftLoad, ease: easeInOut },
    { t: tTop, pose: POSES[first.man], ease: easeOut },
  ];
  const markers: Marker[] = [
    { t: 0, label: "Entry", detail: spec.entry },
    { t: tLoad, label: "Take-off", detail: spec.takeOff },
    { t: tOff, label: "The Woman leaves the ice", detail: "the revolutions of the Man are counted from this moment until his arm(s) begin to bend after full extension" },
    { t: tTop, label: "Full extension of the arms", detail: "the Group is decided by the hold as the Woman passes the top of the Man's head; in Groups 3–5 full extension of the lifting arm(s) is mandatory, with a minimum of one revolution of the Man" },
  ];
  let prevPose = first.pose;
  let prevMan = first.man;
  for (let i = 0; i < sched.length; i++) {
    const { pos, from, settled, to } = sched[i];
    if (i > 0) {
      keys.push({ t: from, pose: POSES[prevPose], ease: linear });
      keys.push({ t: settled, pose: POSES[pos.pose], ease: easeInOut });
      manKeys.push({ t: from, pose: POSES[prevMan], ease: linear });
      manKeys.push({ t: settled, pose: POSES[pos.man], ease: easeInOut });
      markers.push({ t: from, label: "Change of hold / position", detail: "one full revolution of the Man before and after the change makes it a Level feature; going from a two-hand hold to one hand is not a change of hold" });
    }
    keys.push({ t: to, pose: POSES[pos.pose], ease: linear });
    manKeys.push({ t: to, pose: POSES[pos.man], ease: linear });
    markers.push({ t: settled, label: pos.label, detail: `${pos.detail} · ${pos.revs} revolutions of the Man` });
    prevPose = pos.pose;
    prevMan = pos.man;
  }
  keys.push({ t: tDown, pose: POSES.land, ease: easeInOut });
  keys.push({ t: tDown + 0.5, pose: POSES.land, ease: linear });
  keys.push({ t: duration, pose: POSES.glideBO, ease: easeInOut });
  manKeys.push({ t: tBend + 0.35, pose: POSES.liftLower, ease: easeInOut });
  manKeys.push({ t: tDown, pose: POSES.liftLoad, ease: easeInOut });
  manKeys.push({ t: tDown + 0.6, pose: POSES.glideBO, ease: easeInOut });
  manKeys.push({ t: duration, pose: POSES.glideBO, ease: linear });

  const manRevs = (manYaw(tBend) - manYaw(tOff)) / TWO_PI;
  markers.push({ t: tBend, label: "Dismount", detail: `${manRevs.toFixed(1)} revolutions of the Man; when he begins to bend the arms after full extension the lift is concluded. Landing on a back outside edge; a difficult landing variety is a Level feature` });
  markers.push({ t: tDown + 0.4, label: "Exit", detail: "side by side on back outside edges" });

  const trace: TraceSample[] = [...sampleTrace(root, 0, tOff, "R", "outside"), ...sampleTrace(root, tDown, duration, "R", "outside"), ...sampleTrace(manRoot, 0, duration, "both", "flat", "partner")];
  const yawEnd = root(tBend).yaw;
  const mid = manPos((tOff + tBend) / 2);
  return {
    id: spec.id,
    title: spec.title,
    duration,
    keys,
    root,
    partner: { keys: manKeys, root: manRoot, variant: "male" },
    markers,
    trace,
    rotation: { start: tOff, end: tBend, turns: manRevs, nominal: Math.round(manRevs * 2) / 2, yawStart: yawEnd - manRevs * TWO_PI },
    focus: { x: mid[0], z: mid[1] },
    heading: 0,
  };
}

/* ---------- twist lift ---------- */

const TW_SPEED = 3.4;

/**
 * Triple twist: Lutz-type take-off by the Woman from the Man's hands at her waist, a split in
 * the air, three revolutions rotating freely, caught at the waist and set down on one foot.
 */
function twistTimeline(): Timeline {
  const tLoad = 1.3;
  const tOff = tLoad + 0.35;
  const tauA = 0.3; // seconds in the Man's hands on the way up
  const tRel = tOff + tauA;
  const T = 0.85;
  const h = MAN.hold2[1] - WOMAN.waist[1]; // root height at release and at the catch
  const vy = verticalVelocityForAirTime(T);
  const f = flight(vy, TW_SPEED);
  const tCatch = tRel + T;
  const tSet = tCatch + 0.35;
  const duration = tSet + 1.5;
  const sched = { tuckIn: 0.3, openOut: T - 0.15 };
  const tau = tauA + VAULT_TIME.toe;
  // the counted three revolutions = the wind-up in the Man's hands + the free rotation + what his hands brake at the catch
  let spin: RotationProfile = rotationProfile(3, T, sched);
  let pre = 0;
  let skid = 0;
  let airTurns = 3;
  for (let pass = 0; pass < 8; pass++) {
    pre = (spin.omegaTakeoff * tau) / 2;
    skid = Math.min(spin.omegaLanding * SKID_TAU, SKID_CAP);
    airTurns = Math.max(0.5, 3 - (pre + skid) / TWO_PI);
    spin = rotationProfile(airTurns, T, sched);
  }
  const omegaIce = (2 * pre) / tau;
  const p = Math.max(1, (vy * tauA) / h);
  const EXIT_R = 8;

  const root = (t: number): RootState => {
    const x = TW_SPEED * t;
    if (t < tOff) return { x, y: 0, z: 0, yaw: BACKWARD + preRotationAngle(tRel - t, tau, omegaIce) };
    if (t < tRel) return { x, y: h * Math.pow((t - tOff) / tauA, p), z: 0, yaw: BACKWARD + preRotationAngle(tRel - t, tau, omegaIce) };
    if (t < tCatch) {
      const ta = t - tRel;
      return { x, y: h + f.y(ta), z: 0, yaw: BACKWARD + pre + spin.angle(ta) };
    }
    const yawCaught = BACKWARD + pre + airTurns * TWO_PI;
    if (t < tSet) return { x, y: h * (1 - easeInOut((t - tCatch) / 0.35)), z: 0, yaw: yawCaught + landingSkid(t - tCatch, skid, spin.omegaLanding) };
    const phi = ((t - tSet) * TW_SPEED) / EXIT_R;
    return { x: TW_SPEED * tSet + EXIT_R * Math.sin(phi), y: 0, z: -EXIT_R + EXIT_R * Math.cos(phi), yaw: yawCaught + skid + phi };
  };
  const manRoot = (t: number): RootState => {
    if (t < tSet) return { x: TW_SPEED * t + 0.6, y: 0, z: 0, yaw: BACKWARD };
    const r = root(t);
    const heading = BACKWARD + ((t - tSet) * TW_SPEED) / EXIT_R;
    const off = rotY(heading, [0, 0, -0.6]);
    return { x: r.x + off[0], y: 0, z: r.z + off[2], yaw: heading };
  };

  const glide = mirrorPose(POSES.glideBO); // left back outside edge
  const keys: PoseKey[] = [
    { t: 0, pose: glide },
    { t: tLoad - 0.2, pose: glide },
    { t: tLoad + 0.22, pose: mirrorPose(POSES.pickBack), ease: easeInOut },
    { t: tOff, pose: mirrorPose(POSES.launch), ease: easeOut },
    { t: tRel + 0.08, pose: POSES.twistSplit, ease: easeOut },
    { t: tRel + sched.tuckIn, pose: POSES.twistAir, ease: easeOut },
    { t: tRel + sched.openOut, pose: POSES.twistAir, ease: linear },
    { t: tCatch, pose: POSES.open, ease: easeOut },
    { t: tSet, pose: POSES.land, ease: easeInOut },
    { t: tSet + 0.5, pose: POSES.land, ease: linear },
    { t: duration, pose: POSES.glideBO, ease: easeInOut },
  ];
  const manApproach = withArms(POSES.glideBO, POSES.liftLoad);
  const manKeys: PoseKey[] = [
    { t: 0, pose: manApproach },
    { t: tLoad - 0.2, pose: manApproach },
    { t: tLoad + 0.25, pose: POSES.liftLoad, ease: easeInOut },
    { t: tRel, pose: POSES.liftHold, ease: easeOut },
    { t: tRel + 0.3, pose: POSES.twistSideways, ease: easeInOut },
    { t: tCatch - 0.15, pose: POSES.twistCatch, ease: easeInOut },
    { t: tCatch + 0.05, pose: POSES.twistCatch, ease: linear },
    { t: tSet, pose: POSES.liftLoad, ease: easeInOut },
    { t: tSet + 0.6, pose: POSES.glideBO, ease: easeInOut },
    { t: duration, pose: POSES.glideBO, ease: linear },
  ];
  const markers: Marker[] = [
    { t: 0, label: "Entry", detail: "both partners skating backward, the Man behind the Woman with his hands at her waist" },
    { t: tLoad, label: "Take-off", detail: "Lutz/Flip take-off by the Woman: the right toe pick reaches back. In the Short Program the take-off is limited to a Lutz/Flip take-off; difficult steps or turns immediately before it are a Level feature" },
    { t: tRel, label: "Release", detail: "the Man's arms fully extended; the Woman rotates freely in the air" },
    { t: tRel + 0.08, label: "Split position", detail: "each leg at least 45° from the body axis, legs straight or almost straight, before rotating: a Level feature" },
    { t: tRel + sched.tuckIn, label: "Rotation", detail: `3 revolutions in about ${T.toFixed(2)} s with the arms above the head (a Level feature if held for one full revolution); the Man's arms go sideways, straight and at least at shoulder level` },
    { t: tCatch, label: "Catch", detail: "caught in the air at the sides of the waist without her hands, arms or upper body touching the Man: a Level feature" },
    { t: tSet, label: "Landing", detail: "assisted to a smooth landing on one foot, on a back outside edge; a landing with half a revolution missing is downgraded" },
  ];
  const trace: TraceSample[] = [
    ...sampleTrace(root, 0, tOff, "L", "outside"),
    { t: tOff, x: TW_SPEED * tOff + 0.3, z: -0.12, foot: "R", edge: "toe" },
    ...sampleTrace(root, tSet, duration, "R", "outside"),
    ...sampleTrace(manRoot, 0, duration, "both", "flat", "partner"),
  ];
  return {
    id: "3Tw",
    title: "Triple twist lift",
    duration,
    keys,
    root,
    partner: { keys: manKeys, root: manRoot, variant: "male" },
    markers,
    trace,
    rotation: { start: tRel, end: tCatch, turns: airTurns, nominal: 3, yawStart: BACKWARD },
    focus: { x: TW_SPEED * (tRel + T / 2), z: 0 },
    heading: 0,
  };
}

/* ---------- throw jump ---------- */

/**
 * Throw triple Lutz: the Woman on her left back outside edge with the Man beside her, his hands at
 * her waist; she is thrown into a longer flight than a solo jump and lands alone on a back outside edge.
 */
function throwTimeline(): Timeline {
  const R = 7;
  const SPEED = 4.2;
  const AIR_VX = 4.8;
  const T = 0.75;
  const nominal = 3;
  const tLoad = 1.4;
  const LOAD = 0.4;
  const tOff = tLoad + LOAD;
  const tLand = tOff + T;
  const LAND = 0.55;
  const duration = tLand + LAND + 1.2;
  const entrySign = 1; // the Lutz curves against the rotation
  const entryCentreZ = entrySign * R;
  const exitCentreZ = -R;
  const driftRate = (-entrySign * SPEED) / R;
  const vault = VAULT_TIME.toe;
  let spin: RotationProfile = rotationProfile(nominal, T);
  let pre = 0;
  let skid = 0;
  let airTurns = nominal;
  for (let pass = 0; pass < 8; pass++) {
    const omegaIce = Math.max(0.5, spin.omegaTakeoff - driftRate);
    pre = (omegaIce * vault) / 2;
    skid = Math.min(spin.omegaLanding * SKID_TAU, SKID_CAP);
    airTurns = Math.max(0.25, nominal - (pre + skid) / TWO_PI);
    spin = rotationProfile(airTurns, T);
  }
  const omegaIce = (2 * pre) / vault;
  const f = flight(verticalVelocityForAirTime(T), AIR_VX);
  const D = f.range;
  const tuck = inertiaSchedule(T);
  const lean = edgeLean(SPEED, R);
  const LEAN_RAMP = 0.3;
  const yawTakeoff = BACKWARD + pre;
  const yawLanding = yawTakeoff + airTurns * TWO_PI;

  const entry = (phi: number): [number, number] => [R * Math.sin(phi), entryCentreZ - entrySign * R * Math.cos(phi)];
  const root = (t: number): RootState => {
    if (t < tOff) {
      const phi = ((t - tOff) * SPEED) / R;
      const [x, z] = entry(phi);
      const yaw = BACKWARD - entrySign * phi + preRotationAngle(tOff - t, vault, omegaIce);
      const onEdge = easeInOut(clamp01(t / LEAN_RAMP)) * (1 - easeInOut(clamp01((t - (tOff - LEAN_RAMP)) / LEAN_RAMP)));
      return { x, y: 0, z, yaw, roll: rollToward(yaw, -x, entryCentreZ - z, lean) * onEdge };
    }
    if (t < tLand) {
      const ta = t - tOff;
      return { x: f.x(ta), y: f.y(ta), z: 0, yaw: yawTakeoff + spin.angle(ta) };
    }
    const tl = t - tLand;
    const phi = (tl * SPEED * 0.92) / R;
    const x = D + R * Math.sin(phi);
    const z = exitCentreZ + R * Math.cos(phi);
    const yaw = yawLanding + landingSkid(tl, skid, spin.omegaLanding) + phi;
    const onEdge = easeInOut(clamp01((tl - 0.1) / LEAN_RAMP)) * (1 - easeInOut(clamp01((t - (duration - LEAN_RAMP)) / LEAN_RAMP)));
    return { x, y: landingDip(tl, f.vy), z, yaw, roll: rollToward(yaw, D - x, exitCentreZ - z, lean) * onEdge };
  };
  // the Man rides the same curve just inside her with his hands at her waist, keeps curving briefly after the throw, then glides straight
  const tStraight = tOff + 0.3;
  const manOn = (t: number): RootState => {
    const phi = ((t - tOff) * SPEED) / R;
    const yaw = BACKWARD - entrySign * phi;
    const [x, z] = entry(phi);
    const hands = rotY(yaw, MAN.throwAssist);
    return { x: x - hands[0], y: 0, z: z - hands[2], yaw };
  };
  const manRoot = (t: number): RootState => {
    if (t <= tStraight) return manOn(t);
    const a = manOn(tStraight);
    const b = manOn(tStraight - 0.02);
    const vx = (a.x - b.x) / 0.02;
    const vz = (a.z - b.z) / 0.02;
    return { x: a.x + vx * (t - tStraight), y: 0, z: a.z + vz * (t - tStraight), yaw: a.yaw };
  };

  const glide = mirrorPose(POSES.glideBO);
  const keys: PoseKey[] = [
    { t: 0, pose: glide },
    { t: tLoad - 0.2, pose: glide },
    { t: tLoad + LOAD * 0.55, pose: mirrorPose(POSES.pickBack), ease: easeInOut },
    { t: tOff, pose: mirrorPose(POSES.launch), ease: easeOut },
    { t: tOff + tuck.tuckIn, pose: POSES.tuck, ease: easeOut },
    { t: tOff + tuck.openOut, pose: POSES.tuck, ease: linear },
    { t: tLand, pose: POSES.open, ease: easeOut },
    { t: tLand + 0.1, pose: POSES.landDeep, ease: easeOut },
    { t: tLand + 0.32, pose: POSES.land, ease: easeInOut },
    { t: tLand + LAND, pose: POSES.land, ease: linear },
    { t: tLand + LAND + 0.5, pose: POSES.glideBO, ease: easeInOut },
    { t: duration, pose: POSES.glideBO, ease: linear },
  ];
  const manKeys: PoseKey[] = [
    { t: 0, pose: POSES.throwAssist },
    { t: tLoad, pose: POSES.throwAssist },
    { t: tOff + 0.12, pose: POSES.throwRelease, ease: easeOut },
    { t: tOff + 0.4, pose: POSES.throwRelease, ease: linear },
    { t: tOff + 0.9, pose: POSES.glideBO, ease: easeInOut },
    { t: duration, pose: POSES.glideBO, ease: linear },
  ];
  const markers: Marker[] = [
    { t: 0, label: "Entry edge", detail: "left back outside edge curving against the rotation, the Man beside her with both hands at her waist" },
    { t: tLoad, label: "Knee bend", detail: "right toe pick reaches back; a Lutz throw from the inside edge is called with the same 'e' as a solo jump" },
    { t: tOff, label: "Throw", detail: "the Woman is thrown into the air by the Man on the take-off: a partner-assisted jump" },
    { t: tOff + 0.12, label: "Rotation", detail: `${nominal} revolutions in about ${T.toFixed(2)} s, higher and longer than the solo jump; missing more than ¼ revolution is 'q', more than ¼ and under ½ is '<', ½ or more is '<<'` },
    { t: tLand, label: "Landing", detail: "lands without assistance from her partner on a backward outside edge" },
    { t: tLand + 0.3, label: "Check-out", detail: "the Man glides alongside; the base value is that of the throw, not the solo jump" },
  ];
  const trace: TraceSample[] = [
    ...sampleTrace(root, 0, tOff, "L", "outside"),
    { t: tOff, x: -0.35, z: 0.12, foot: "R", edge: "toe" },
    ...sampleTrace(root, tLand, duration, "R", "outside"),
    ...sampleTrace(manRoot, 0, duration, "both", "flat", "partner"),
  ];
  return {
    id: "3LzTh",
    title: "Throw triple Lutz",
    duration,
    keys,
    root,
    partner: { keys: manKeys, root: manRoot, variant: "male" },
    markers,
    trace,
    rotation: { start: tOff, end: tLand, turns: nominal, nominal, yawStart: BACKWARD },
    focus: { x: D / 2, z: 0 },
    heading: 0,
  };
}

/* ---------- death spirals ---------- */

interface DeathSpiralSpec {
  id: "FiDs" | "BoDs";
  title: string;
  codes: string[];
  edge: "inside" | "outside";
  /** The Woman's pose in the low position and on the entry curve. */
  low: string;
  entryPose: string;
  hold: Vec3;
  entryHold: Vec3;
  /** Her yaw relative to the circling angle in the low position and on the entry (facing the velocity forward, or backward). */
  lowYaw: number;
  entryYaw: number;
  entry: string;
  position: string;
}

const DS_RATE = 0.7;

/**
 * The Man pivots on an anchored toe pick while the Woman circles him on the named edge with
 * her head close to the ice; both must hold their low positions for at least one revolution.
 */
function deathSpiralTimeline(spec: DeathSpiralSpec): Timeline {
  const tAnchor = 1.4;
  const tLow = tAnchor + 0.5;
  const tRise = tLow + 1.25 / DS_RATE;
  const tUp = tRise + 0.5;
  const duration = tUp + 1.2;
  const segs: RateSeg[] = [
    { from: 0, to: tAnchor, w0: 0.45, w1: 0.45 },
    { from: tAnchor, to: tLow, w0: 0.45, w1: DS_RATE },
    { from: tLow, to: tRise, w0: DS_RATE, w1: DS_RATE },
    { from: tRise, to: tUp, w0: DS_RATE, w1: 0.35 },
    { from: tUp, to: duration, w0: 0.35, w1: 0.35 },
  ];
  const phi = (t: number) => revsAt(segs, t) * TWO_PI;
  const manYaw = (t: number) => phi(t) - Math.PI / 2; // his left hand points at her
  const manRoot = (t: number): RootState => {
    if (t < tAnchor) {
      const e = 1 - easeInOut(t / tAnchor);
      return { x: -1.2 * e, y: 0, z: 0.8 * e, yaw: manYaw(t) };
    }
    if (t <= tUp) return { x: 0, y: 0, z: 0, yaw: manYaw(t) };
    const e = Math.pow((t - tUp) / (duration - tUp), 2);
    return { x: 1.0 * e, y: 0, z: -0.8 * e, yaw: manYaw(t) };
  };
  const stations: Station[] = [
    { t: 0, w: spec.entryHold, m: MAN.pivotEntry, yaw: spec.entryYaw, ease: linear },
    { t: tAnchor, w: spec.entryHold, m: MAN.pivotEntry, yaw: spec.entryYaw, ease: linear },
    { t: tLow, w: spec.hold, m: MAN.pivot, yaw: spec.lowYaw, ease: easeInOut },
    { t: tRise, w: spec.hold, m: MAN.pivot, yaw: spec.lowYaw, ease: linear },
    { t: tUp, w: spec.entryHold, m: MAN.pivotEntry, yaw: spec.entryYaw, ease: easeInOut },
  ];
  const root = (t: number): RootState => {
    const m = manRoot(t);
    const s = stationAt(stations, t);
    const yaw = phi(t) + s.yaw;
    const hm = rotY(m.yaw, s.m);
    const hw = rotY(yaw, s.w);
    return { x: m.x + hm[0] - hw[0], y: 0, z: m.z + hm[2] - hw[2], yaw };
  };

  const keys: PoseKey[] = [
    { t: 0, pose: POSES[spec.entryPose] },
    { t: tAnchor, pose: POSES[spec.entryPose] },
    { t: tLow, pose: POSES[spec.low], ease: easeInOut },
    { t: tRise, pose: POSES[spec.low], ease: linear },
    { t: tUp, pose: POSES[spec.entryPose], ease: easeInOut },
    { t: duration, pose: POSES.glideBO, ease: easeInOut },
  ];
  const manKeys: PoseKey[] = [
    { t: 0, pose: POSES.pivotEntry },
    { t: tAnchor, pose: POSES.pivotEntry },
    { t: tLow, pose: POSES.pivot, ease: easeInOut },
    { t: tRise, pose: POSES.pivot, ease: linear },
    { t: tUp, pose: POSES.pivotEntry, ease: easeInOut },
    { t: duration, pose: POSES.glideBO, ease: easeInOut },
  ];
  const lowRevs = (phi(tRise) - phi(tLow)) / TWO_PI;
  const markers: Marker[] = [
    { t: 0, label: "Entry curve", detail: `${spec.entry}; the entry begins when one partner is on one foot on the edge of the death spiral. A difficult entry position is a Level feature` },
    { t: tAnchor, label: "Toe pick anchored", detail: "the revolutions begin when the Man's toe for the pivot is stationary on the ice; both must reach the low position within the first revolution for the entry feature" },
    { t: tLow, label: "Low position", detail: `${spec.position} Man's low pivot position: buttocks not higher than the knee of his anchored foot, both knees clearly bent, holding arm fully extended. ${lowRevs.toFixed(2)} full revolutions with both partners low: each counts as a feature` },
    { t: tRise, label: "Exit", detail: "starts when the Man bends his holding arm at the elbow and ends when the Woman comes to the vertical position; a difficult exit is a Level feature" },
    { t: tUp + 0.3, label: "Exit curve", detail: "both push out on back outside edges" },
  ];
  const trace: TraceSample[] = [
    ...sampleTrace(root, 0, duration, "R", spec.edge, undefined, 1 / 30),
    { t: tAnchor, x: 0, z: 0, foot: "R", edge: "toe", actor: "partner" },
    ...sampleTrace(manRoot, 0, tAnchor, "L", "outside", "partner"),
    ...sampleTrace(manRoot, tUp, duration, "L", "outside", "partner"),
  ];
  return {
    id: spec.id,
    title: spec.title,
    duration,
    keys,
    root,
    partner: { keys: manKeys, root: manRoot, variant: "male" },
    markers,
    trace,
    rotation: { start: tAnchor, end: tRise, turns: (phi(tRise) - phi(tAnchor)) / TWO_PI, nominal: 2, yawStart: root(tAnchor).yaw },
    focus: { x: 0, z: 0 },
    heading: Math.PI / 2,
  };
}

/* ---------- pair spin combination ---------- */

interface PairSpinPhase {
  woman: string;
  man: string;
  mirrored?: boolean;
  revolutions: number;
  label: string;
  detail: string;
  transition?: number;
  foot: "L" | "R";
}

const PSP_PHASES: PairSpinPhase[] = [
  { woman: "pairCamel", man: "pairCamel", revolutions: 2.5, label: "Camel", detail: "free leg back with the knee higher than the hip; 2 revolutions make the position count for both partners", foot: "L" },
  { woman: "changeFoot", man: "changeFoot", revolutions: 0.5, label: "Change of foot", detail: "at least 3 continuous revolutions before and after the change of both partners, or the spin is marked V", transition: 0.3, foot: "L" },
  { woman: "pairSitBehind", man: "pairSit", mirrored: true, revolutions: 2.5, label: "Sit", detail: "the Woman's free leg behind and the Man's in front: her sit counts when the skating knee is bent 90° or more", transition: 0.5, foot: "R" },
  { woman: "pairUpright", man: "pairUpright", mirrored: true, revolutions: 2.5, label: "Upright", detail: "all three basic positions by both partners: full value", transition: 0.5, foot: "R" },
];

const PSP_ENTRY = 1.3;
const PSP_EXIT = 1.2;
const PSP_D = 0.42; // each partner's distance from the common axis

/** Both partners spin around a common axis in a hand hold, each tangential to it. */
function pairSpinTimeline(): Timeline {
  const rps = 1.5;
  const rate = (pose: string) => rps * spinRateFactor(pose.replace(/^pair/, "").replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/Behind$/, ""));
  const tSpinStart = PSP_ENTRY + 0.25;
  let t = tSpinStart;
  const segs: RateSeg[] = [];
  const sched: { phase: PairSpinPhase; from: number; settled: number; to: number }[] = [];
  let prevRate = rate(PSP_PHASES[0].woman) * 0.6;
  for (const ph of PSP_PHASES) {
    const w = rate(ph.woman);
    const trans = ph.transition ?? 0.45;
    const hold = ph.revolutions / w;
    segs.push({ from: t, to: t + trans, w0: prevRate, w1: w });
    segs.push({ from: t + trans, to: t + trans + hold, w0: w, w1: w });
    sched.push({ phase: ph, from: t, settled: t + trans, to: t + trans + hold });
    t += trans + hold;
    prevRate = w;
  }
  const tSpinEnd = t;
  const duration = tSpinEnd + 0.4 + PSP_EXIT;
  const endRate = segs[segs.length - 1].w1;
  const theta = (time: number): number => {
    if (time < tSpinStart) return 0.6 * easeOut(clamp01((time - PSP_ENTRY) / (tSpinStart - PSP_ENTRY)));
    if (time < tSpinEnd) return 0.6 + revsAt(segs, time) * TWO_PI;
    const slow = clamp01((time - tSpinEnd) / 0.4);
    return 0.6 + revsAt(segs, tSpinEnd) * TWO_PI + endRate * TWO_PI * 0.4 * (1 - Math.pow(1 - slow, 2));
  };
  // the half-turn of the body that goes with the mirrored positions after the change of foot
  const flip = (time: number): number => {
    const change = sched.find((s) => s.phase.mirrored);
    if (!change) return 0;
    return Math.PI * easeInOut(clamp01((time - change.from) / (change.settled - change.from)));
  };
  // each partner enters on a forward edge along ±Z, hooks in tangentially and leaves on a back outside edge
  const skaterRoot = (side: 1 | -1) => (time: number): RootState => {
    const base = side === 1 ? Math.PI : 0; // the Man (side 1) faces -Z, the Woman +Z, both with the axis on their left
    if (time < PSP_ENTRY) {
      const s = (time - PSP_ENTRY) * 3.2;
      const phi = s / 4;
      return { x: side * (PSP_D + 4 - 4 * Math.cos(phi)), y: 0, z: -side * 4 * Math.sin(phi), yaw: base + phi };
    }
    const th = theta(time);
    const fl = flip(time);
    if (time < tSpinEnd + 0.4) {
      const p = rotY(th, [side * PSP_D, 0, 0]);
      return { x: p[0], y: 0, z: p[2], yaw: base + th + fl };
    }
    const u = Math.max(0, time - tSpinEnd - 0.4) * 3.0;
    const phi = u / 4;
    const p = rotY(th, [side * PSP_D, 0, 0]);
    const out = rotY(base + th + fl, [-4 * Math.sin(phi), 0, -4 + 4 * Math.cos(phi)]);
    return { x: p[0] + out[0], y: 0, z: p[2] + out[2], yaw: base + th + fl + phi };
  };
  const root = skaterRoot(-1);
  const manRoot = skaterRoot(1);

  const poseOf = (name: string, mirrored?: boolean): Pose => (mirrored ? mirrorPose(POSES[name]) : POSES[name]);
  const trackKeys = (who: "woman" | "man"): PoseKey[] => {
    const keys: PoseKey[] = [
      { t: 0, pose: POSES.glideFO },
      { t: PSP_ENTRY - 0.35, pose: POSES.glideFO },
      { t: PSP_ENTRY, pose: POSES.spinEntry, ease: easeInOut },
    ];
    for (const { phase, settled, to } of sched) {
      keys.push({ t: settled, pose: poseOf(phase[who], phase.mirrored), ease: easeInOut });
      keys.push({ t: to, pose: poseOf(phase[who], phase.mirrored), ease: linear });
    }
    keys.push({ t: tSpinEnd + 0.35, pose: mirrorPose(POSES.windUp), ease: easeInOut });
    keys.push({ t: tSpinEnd + 0.9, pose: POSES.spinExit, ease: easeInOut });
    keys.push({ t: duration, pose: POSES.glideBO, ease: linear });
    return keys;
  };
  const markers: Marker[] = [{ t: 0, label: "Entry", detail: "both partners hook into the spin from forward edges and take a hand hold; a flying entrance by one or both is a Level feature" }];
  for (const { phase, from } of sched) markers.push({ t: from, label: phase.label, detail: `${phase.detail} · about ${rate(phase.woman).toFixed(1)} rev/s` });
  markers.push({ t: tSpinEnd, label: "Exit", detail: "both partners must spin together; a spin with fewer than three rotations is a skating movement" });
  const trace: TraceSample[] = [];
  const addTrace = (r: (t: number) => RootState, actor?: "partner") => {
    trace.push(...sampleTrace(r, 0, PSP_ENTRY, "L", "outside", actor));
    for (const { phase, from, to } of sched) trace.push(...sampleTrace(r, from, to, phase.foot, phase.foot === "L" ? "inside" : "outside", actor, 1 / 30));
    trace.push(...sampleTrace(r, tSpinEnd + 0.4, duration, "R", "outside", actor));
  };
  addTrace(root);
  addTrace(manRoot, "partner");
  const turns = revsAt(segs, tSpinEnd);
  return {
    id: "PCoSp",
    title: "Pair spin combination",
    duration,
    keys: trackKeys("woman"),
    root,
    partner: { keys: trackKeys("man"), root: manRoot, variant: "male" },
    markers,
    trace,
    rotation: { start: tSpinStart, end: tSpinEnd, turns, nominal: Math.round(turns), yawStart: root(tSpinStart).yaw },
    focus: { x: 0, z: 0 },
    heading: 0,
  };
}

/* ---------- side-by-side jumps ---------- */

/** The second jump of a combination starts on the first jump's landing edge: splice two jump timelines there. */
function comboTimeline(first: Timeline, second: Timeline, secondLoad: number): { root: (t: number) => RootState; keys: PoseKey[]; markers: Marker[]; trace: TraceSample[]; duration: number } {
  const tSplice = first.rotation!.end + 0.32;
  const t2s = secondLoad - 0.45;
  const headingAt = (tl: Timeline, t: number) => {
    const a = tl.root(t - 0.01);
    const b = tl.root(t + 0.01);
    return headingOf(b.x - a.x, b.z - a.z);
  };
  const r1 = first.root(tSplice);
  const r2 = second.root(t2s);
  const theta = headingAt(first, tSplice) - headingAt(second, t2s);
  const shift = tSplice - t2s;
  const map = (r: RootState): RootState => {
    const p = rotY(theta, [r.x - r2.x, 0, r.z - r2.z]);
    return { ...r, x: r1.x + p[0], z: r1.z + p[2], yaw: r.yaw + theta };
  };
  const root = (t: number): RootState => (t < tSplice ? first.root(t) : map(second.root(t - shift)));
  const keys = [...first.keys.filter((k) => k.t <= tSplice), ...second.keys.filter((k) => k.t > t2s).map((k) => ({ ...k, t: k.t + shift }))];
  const markers = [...first.markers.filter((m) => m.t <= tSplice), ...second.markers.filter((m) => m.t > t2s).map((m) => ({ ...m, t: m.t + shift }))];
  const trace = [...first.trace.filter((s) => s.t <= tSplice), ...second.trace.filter((s) => s.t > t2s).map((s) => ({ ...s, ...(({ x, z }) => ({ x, z }))(map({ x: s.x, y: 0, z: s.z, yaw: 0 })), t: s.t + shift }))];
  return { root, keys, markers, trace, duration: tSplice + (second.duration - t2s) };
}

/** Side-by-side triple toe loop + triple toe loop: the Woman's combination, with the Man doing the same 2 m to her side. */
function sideBySideTimeline(): Timeline {
  const one = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3 });
  const two = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3 });
  const tLoad2 = two.markers.find((m) => m.label === "Knee bend")!.t;
  const combo = comboTimeline(one, two, tLoad2);
  const OFFSET = 2;
  const manRoot = (t: number): RootState => {
    const r = combo.root(t);
    return { ...r, z: r.z + OFFSET };
  };
  const markers = combo.markers.map((m) => (m.label === "Take-off" ? { ...m, detail: `${m.detail}; side by side the partners take off together, and each jump is identified by the Woman and the Man separately` } : m));
  markers.splice(1, 0, { t: 0.4, label: "Side by side", detail: "both partners perform the same jump at the same time; the landing foot of the first jump is the take-off foot of the next" });
  return {
    id: "3T+3T",
    title: "Side-by-side triple toe loop + triple toe loop",
    duration: combo.duration,
    keys: combo.keys,
    root: combo.root,
    partner: { keys: combo.keys, root: manRoot, variant: "male" },
    markers,
    trace: [...combo.trace, ...combo.trace.map((s) => ({ ...s, z: s.z + OFFSET, actor: "partner" as const }))],
    rotation: one.rotation ? { ...one.rotation } : undefined,
    focus: { x: one.focus.x + 2, z: OFFSET / 2 },
    heading: 0,
  };
}

/* ---------- presets ---------- */

export const PAIR_PRESETS: Record<PairId, PairPreset> = {
  "3Li": {
    id: "3Li",
    title: "Group 3 hip lift",
    codes: ["3Li4"],
    build: () =>
      liftTimeline({
        id: "3Li",
        title: "Group 3 hip lift",
        codes: ["3Li4"],
        entry: "both partners skating backward, the Man behind the Woman with a hand-to-hip hold (Group 3: hand to hip or the upper part of the leg)",
        takeOff: "knee bend and take-off from the blade; the Short Program lift must be a Group 3 lift with the prescribed overhead take-off",
        takeOffYaw: 0,
        positions: [
          { pose: "liftUpright", hold: WOMAN.upright, man: "liftHold", manHold: MAN.hold2, yawOffset: 0, revs: 1.5, label: "Upright position", detail: "the Woman's upper body vertical, held at the hips at full extension of the arms" },
          { pose: "liftUpright", hold: WOMAN.upright, man: "liftHoldOne", manHold: MAN.holdR, yawOffset: 0, revs: 2, label: "One-hand hold", detail: "a difficult one-hand hold of the Man held for 2 full revolutions is a Level feature" },
        ],
      }),
  },
  "4Li": {
    id: "4Li",
    title: "Group 4 press lift",
    codes: ["4Li4"],
    build: () =>
      liftTimeline({
        id: "4Li",
        title: "Group 4 press lift",
        codes: ["4Li4"],
        entry: "face to face with a hand-to-hand hold (Group 4: the Woman does not rotate around the Man during the lifting process)",
        takeOff: "knee bend; the Woman is pressed straight up over his head",
        takeOffYaw: Math.PI,
        positions: [
          { pose: "liftPress", hold: WOMAN.press, man: "liftHold", manHold: MAN.hold2, yawOffset: Math.PI, revs: 2, label: "Upright position, hand to hand", detail: "the Woman's arms straight down into the Man's hands, legs in a straddle: a difficult variation of the Woman's position when it needs specific strength or flexibility" },
          { pose: "liftPlatter", hold: WOMAN.platter, man: "liftHoldOne", manHold: MAN.holdR, yawOffset: 0, revs: 2, label: "Platter position, one hand", detail: "flat, facing down, upper body parallel to the ice; a change of position with one revolution before and after is a Level feature" },
        ],
      }),
  },
  "5RLi": {
    id: "5RLi",
    title: "Group 5 reverse lasso lift",
    codes: ["5RLi4"],
    build: () =>
      liftTimeline({
        id: "5RLi",
        title: "Group 5 reverse lasso lift",
        codes: ["5RLi4"],
        entry: "both partners skating in the same direction, backward, with the opposite hand hold (right to left, left to right) and the Woman's hand behind her back",
        takeOff: "the Woman takes off from the blade and rotates in relation to the Man on the way up, visible by way of the shoulders and hips (Group 5: Lasso); one of his hands stays clearly above his shoulders",
        takeOffYaw: -Math.PI / 2,
        positions: [
          { pose: "liftStar", hold: WOMAN.star, man: "liftHoldOne", manHold: MAN.holdR, yawOffset: Math.PI / 2, revs: 2, label: "Star position, one-hand hold", detail: "sideways with the upper body parallel to the ice; a difficult one-hand hold of the Man for 2 full revolutions is a Level feature" },
          { pose: "liftUpright", hold: WOMAN.upright, man: "liftHoldOne", manHold: MAN.holdR, yawOffset: 0, revs: 1.5, label: "Upright, hand to hip", detail: "a change of hold (hand to hand → hand to hip) and of the Woman's position; counted only if executed in the first 4 revolutions" },
        ],
      }),
  },
  "3Tw": { id: "3Tw", title: "Triple twist lift", codes: ["3Tw3"], build: twistTimeline },
  "3LzTh": { id: "3LzTh", title: "Throw triple Lutz", codes: ["3LzTh"], build: throwTimeline },
  FiDs: {
    id: "FiDs",
    title: "Forward inside death spiral",
    codes: ["FiDs4"],
    build: () =>
      deathSpiralTimeline({
        id: "FiDs",
        title: "Forward inside death spiral",
        codes: ["FiDs4"],
        edge: "inside",
        low: "deathSpiralFi",
        entryPose: "spiralHold",
        hold: WOMAN.fiDs,
        entryHold: WOMAN.spiralHold,
        lowYaw: Math.PI / 2,
        entryYaw: Math.PI / 2,
        entry: "the Man on a backward outside edge, the Woman forward on an inside edge, hand to hand",
        position: "Woman's low position: leaning sideways to the ice on a clean forward inside edge, her head and lowest hip not higher than her skating knee, arm fully extended, without touching the ice.",
      }),
  },
  BoDs: {
    id: "BoDs",
    title: "Backward outside death spiral",
    codes: ["BoDs4"],
    build: () =>
      deathSpiralTimeline({
        id: "BoDs",
        title: "Backward outside death spiral",
        codes: ["BoDs4"],
        edge: "outside",
        low: "deathSpiralBo",
        entryPose: "spiralHoldBack",
        hold: WOMAN.boDs,
        entryHold: WOMAN.spiralHoldBack,
        lowYaw: 0,
        entryYaw: -Math.PI / 2,
        entry: "both partners on backward outside edges; the Man holds her hand with the same arm as his skating foot",
        position: "Woman's low position: leaning backward to the ice on a backward outside edge, her head not higher than her skating knee, arm fully extended, without touching the ice.",
      }),
  },
  PCoSp: { id: "PCoSp", title: "Pair spin combination", codes: ["PCoSp4"], build: pairSpinTimeline },
  "3T+3T": { id: "3T+3T", title: "Side-by-side 3T+3T", codes: ["3T", "3T"], build: sideBySideTimeline },
};

export const PAIR_IDS = Object.keys(PAIR_PRESETS) as PairId[];

export function pairTimeline(id: string): Timeline {
  const preset = PAIR_PRESETS[id as PairId];
  if (!preset) throw new Error(`No pair preset ${id}`);
  return preset.build();
}
