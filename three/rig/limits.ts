import { Quaternion, Vector3 } from "three";
import type { BoneName } from "./bones";
import type { BoneAim, Pose, Vec3 } from "./pose";

/**
 * Joint model of the skater rig: the range-of-motion contract (Wave 0) and the resolver that
 * turns an authored pose into what the rig renders (Wave 1, section A).
 *
 * A pose aims bones by direction in skater space (+X left, +Y up, +Z forward; see pose.ts).
 * `resolvePose` fills in what poses leave out — the pelvic tilt, the axial twist of the upper
 * arms, thighs, forearms and shins, the roll of hands and feet — and projects knees and elbows
 * into their hinge planes. `validatePose` measures that resolved pose, so what is validated is
 * exactly what `SkaterRig.applyPose` renders. The table describes an elite figure skater, not an
 * average adult: hips and spine allow the extension that camels, spirals, laybacks and the
 * Biellmann need, but the remaining extremes are reached through pelvic tilt and spine
 * extension shared over the segments, not by raising a single joint's limit.
 *
 * Sources for the numbers: AAOS/AMA normal ROM tables, plus the usual allowances reported for
 * elite figure skaters (hip extension and spine extension well beyond the general population).
 */

/** Which direction a joint's angle is measured from. */
export type JointReference =
  /** the parent bone's direction (chain continues straight at 0°) */
  | "parent"
  /** the parent segment pointing down (hanging limb at 0°): thighs from the pelvis, upper arms from the chest */
  | "parentDown"
  /** the rest direction of this bone in skater space */
  | "rest"
  /** world up (the pelvis itself) */
  | "up";

export interface JointLimit {
  ref: JointReference;
  /** Parent bone used for "parent" / "parentDown" (defaults to the skeleton parent). */
  parent?: BoneName;
  /** Maximum total angle from the reference, degrees. */
  cone: number;
  /** Minimum total angle from the reference, degrees (the ankle never folds flat onto the shin). */
  minAngle?: number;
  /** Bending toward the skater's front, degrees (hip/shoulder flexion, spine flexion, knee hyperextension). */
  forward?: number;
  /** Bending toward the back (hip/shoulder extension, spine extension, knee flexion). */
  backward?: number;
  /** Bending away from the midline (abduction) and toward/across it (adduction). */
  outward?: number;
  inward?: number;
  /** Symmetric side limit for hinge joints and the trunk. */
  lateral?: number;
  /** Axial rotation about the bone, degrees each way; the resolver derives twists within it. */
  twist?: number;
  /** Human-readable joint name for messages. */
  joint: string;
}

/** Degrees. Left and right share a row (mirrored automatically). */
export const LIMITS: Partial<Record<BoneName, JointLimit>> = {
  // the pelvis may pitch and roll with the trunk; camels and spirals tilt it far forward, and in a
  // standing split (Charlotte, butterfly kick) it tips past horizontal as the standing hip reaches full flexion
  hips: { ref: "up", cone: 130, joint: "pelvis" },
  // lumbar: flexion 60, extension 35 (elite: 45), lateral 30
  spine: { ref: "parent", cone: 60, forward: 60, backward: 45, lateral: 30, joint: "lumbar spine" },
  // thoracic: flexion 40, extension 35, lateral 25
  chest: { ref: "parent", cone: 40, forward: 40, backward: 35, lateral: 25, joint: "thoracic spine" },
  // cervical: flexion 50, extension 65, lateral 45
  neck: { ref: "parent", cone: 65, forward: 50, backward: 65, lateral: 45, joint: "neck" },
  head: { ref: "parent", cone: 35, joint: "head" },
  // the clavicle barely moves: shrug/retraction only
  shoulder_L: { ref: "rest", cone: 30, joint: "left shoulder girdle" },
  shoulder_R: { ref: "rest", cone: 30, joint: "right shoulder girdle" },
  // shoulder: elevation to 180, extension behind the back 60 (measured as the elevation behind the chest's
  // frontal plane, so an overhead arm may sit up to 60° behind it), adduction across the body 50.
  // Axial rotation is left free (180): the shortest swing from the hanging rest gives an overhead arm an
  // arbitrary roll (Codman's paradox), so the twist that puts the elbow's plane on the forearm is not clamped
  upper_arm_L: { ref: "parentDown", parent: "chest", cone: 180, backward: 60, inward: 50, twist: 180, joint: "left shoulder" },
  upper_arm_R: { ref: "parentDown", parent: "chest", cone: 180, backward: 60, inward: 50, twist: 180, joint: "right shoulder" },
  // elbow: a hinge that flexes forward of the upper arm (palms toward the thighs at rest), to 150;
  // hyperextension 8, carrying angle / sideways 25. The hinge plane follows the upper arm's
  // swing and derived twist; pronation/supination 90 each way twists the forearm toward the hand
  forearm_L: { ref: "parent", cone: 150, forward: 150, backward: 8, lateral: 25, twist: 90, joint: "left elbow" },
  forearm_R: { ref: "parent", cone: 150, forward: 150, backward: 8, lateral: 25, twist: 90, joint: "right elbow" },
  // wrist: flexion/extension 70, deviation 30
  hand_L: { ref: "parent", cone: 70, joint: "left wrist" },
  hand_R: { ref: "parent", cone: 70, joint: "right wrist" },
  // hip: flexion 130, extension 40 from the pelvis (the pelvis tilts for more), abduction 70 (45 in the
  // general population; a skater's turnout lets the straddle/side split reach 65-90 each side), adduction 30;
  // axial rotation 60 each way (external rotation / turnout of a skater, internal 45 at a flexed hip)
  thigh_L: { ref: "parentDown", parent: "hips", cone: 130, forward: 130, backward: 40, outward: 70, inward: 30, twist: 60, joint: "left hip" },
  thigh_R: { ref: "parentDown", parent: "hips", cone: 130, forward: 130, backward: 40, outward: 70, inward: 30, twist: 60, joint: "right hip" },
  // knee: a hinge. Flexion to 145 (shin bends backward), hyperextension 6, no sideways bend beyond 10;
  // tibial rotation 20 each way at a flexed knee (near 0 when locked straight)
  shin_L: { ref: "parent", cone: 145, forward: 6, backward: 145, lateral: 10, twist: 20, joint: "left knee" },
  shin_R: { ref: "parent", cone: 145, forward: 6, backward: 145, lateral: 10, twist: 20, joint: "right knee" },
  // ankle: measured from the shin line; the rest foot sits ~74° from it. A fully pointed foot
  // (plantarflexion) comes within ~12° of the shin line; dorsiflexion opens the angle to ~95°;
  // inversion/eversion 25
  // in a figure skating boot the shaft is stiff: plantarflexion stops about 30° past the rest angle
  // (74° → ~45° from the shin line), where a bare foot would point to ~12°; the leg must stay in the boot
  // dorsiflexion: a loaded knee bend with the heel down carries the shin 35-45° forward of vertical
  // (weight-bearing lunge norms) and the boot's raised heel adds to it, so the blade stays flat up to
  // ~35° past the 74° booted rest; the boot only restricts plantarflexion
  foot_L: { ref: "parent", cone: 110, minAngle: 45, lateral: 25, joint: "left ankle (booted)" },
  foot_R: { ref: "parent", cone: 110, minAngle: 45, lateral: 25, joint: "right ankle (booted)" },
};

export interface PoseViolation {
  bone: BoneName;
  joint: string;
  /** Which rule failed: "cone" | "minAngle" | "forward" | "backward" | "outward" | "inward" | "lateral". */
  rule: string;
  /** Measured angle in degrees. */
  value: number;
  limit: number;
}

/** Rest directions of the exported skeleton in skater space (A-pose, feet pointing forward-down), measured on the GLB. */
export const DEFAULT_REST: Record<BoneName, Vec3> = {
  root: [0, 1, 0],
  hips: [0, 1, 0],
  spine: [0, 0.999, 0.05],
  chest: [0, 0.999, -0.043],
  neck: [0, 0.984, 0.179],
  head: [0, 1, 0],
  head_tip: [0, 1, 0],
  shoulder_L: [0.998, -0.062, 0],
  upper_arm_L: [0.397, -0.918, -0.025],
  forearm_L: [0.397, -0.918, -0.025],
  hand_L: [0.397, -0.918, -0.025],
  hand_L_tip: [0.397, -0.918, -0.025],
  shoulder_R: [-0.998, -0.062, 0],
  upper_arm_R: [-0.397, -0.918, -0.025],
  forearm_R: [-0.397, -0.918, -0.025],
  hand_R: [-0.397, -0.918, -0.025],
  hand_R_tip: [-0.397, -0.918, -0.025],
  thigh_L: [0.017, -0.998, 0.052],
  shin_L: [0.018, -0.994, -0.106],
  foot_L: [0, -0.381, 0.924],
  foot_L_tip: [0, -0.381, 0.924],
  thigh_R: [-0.017, -0.998, 0.052],
  shin_R: [-0.018, -0.994, -0.106],
  foot_R: [0, -0.381, 0.924],
  foot_R_tip: [0, -0.381, 0.924],
};

export const defaultRest = (b: BoneName): Vec3 => DEFAULT_REST[b];

export type RestFn = (b: BoneName) => Vec3;

export const PARENT: Partial<Record<BoneName, BoneName>> = {
  hips: "root", spine: "hips", chest: "spine", neck: "chest", head: "neck",
  shoulder_L: "chest", upper_arm_L: "shoulder_L", forearm_L: "upper_arm_L", hand_L: "forearm_L",
  shoulder_R: "chest", upper_arm_R: "shoulder_R", forearm_R: "upper_arm_R", hand_R: "forearm_R",
  thigh_L: "hips", shin_L: "thigh_L", foot_L: "shin_L",
  thigh_R: "hips", shin_R: "thigh_R", foot_R: "shin_R",
};

/** Parents before children, so frames can be propagated in one pass. */
export const ORDER = [
  "hips", "spine", "chest", "neck", "head",
  "shoulder_L", "upper_arm_L", "forearm_L", "hand_L",
  "shoulder_R", "upper_arm_R", "forearm_R", "hand_R",
  "thigh_L", "shin_L", "foot_L",
  "thigh_R", "shin_R", "foot_R",
] as const;

export type PosableBone = (typeof ORDER)[number];

/** A pose with every posable bone aimed and twisted, and the pelvis aimed: what the rig renders. */
export interface ResolvedPose extends Pose {
  bones: Record<PosableBone, Required<BoneAim>>;
  hips: Vec3;
}

/* ---------- vector helpers ---------- */

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const clamp1 = (x: number) => Math.max(-1, Math.min(1, x));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const angleBetween = (a: Vec3, b: Vec3) => Math.acos(clamp1(dot(a, b))) * DEG;
/** The part of v orthogonal to the unit axis. */
const perp = (v: Vec3, axis: Vec3): Vec3 => sub(v, scale(axis, dot(v, axis)));
/** Signed angle from a to b about the unit axis, degrees in (-180, 180]. */
const signedAngle = (a: Vec3, b: Vec3, axis: Vec3) => Math.atan2(dot(cross(a, b), axis), dot(a, b)) * DEG;
const smoothstep = (x: number, e0: number, e1: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrap180 = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

const _va = new Vector3();
const _vb = new Vector3();

/** The shortest rotation taking unit `from` onto unit `to` (what the rig's setFromUnitVectors does). */
function qSwing(from: Vec3, to: Vec3): Quaternion {
  return new Quaternion().setFromUnitVectors(_va.set(from[0], from[1], from[2]).normalize(), _vb.set(to[0], to[1], to[2]).normalize());
}
function qAxis(axis: Vec3, angleRad: number): Quaternion {
  return new Quaternion().setFromAxisAngle(_va.set(axis[0], axis[1], axis[2]).normalize(), angleRad);
}
function rotate(q: Quaternion, v: Vec3): Vec3 {
  const o = _va.set(v[0], v[1], v[2]).applyQuaternion(q);
  return [o.x, o.y, o.z];
}
/** The twist (radians) that, applied after `swing`, gives `q`; both must take the rest direction onto `dir`. */
function twistOf(q: Quaternion, swing: Quaternion, dir: Vec3): number {
  const r = q.clone().multiply(swing.clone().invert());
  const s = r.x * dir[0] + r.y * dir[1] + r.z * dir[2];
  const a = 2 * Math.atan2(s, r.w);
  return a > Math.PI ? a - 2 * Math.PI : a < -Math.PI ? a + 2 * Math.PI : a;
}

/** Applies a bone rotation to a skater-space vector (for blending in pose.ts). */
export function rotateVec(q: Quaternion, v: Vec3): Vec3 {
  return rotate(q, v);
}

/** The twist the rig must apply after its shortest swing from `restDir` to `dir` to reproduce `q` (radians). */
export function twistAfterSwing(q: Quaternion, restDir: Vec3, dir: Vec3): number {
  return twistOf(q, qSwing(unit(restDir), dir), dir);
}

/** A bone's rotation as its parent's rotation, the shortest swing from the parent-following direction `d0` to `dir`, then `twist` about `dir`. */
export function boneRotation(parentQ: Quaternion, d0: Vec3, dir: Vec3, twist: number): Quaternion {
  const q = qSwing(d0, dir).multiply(parentQ);
  return twist ? qAxis(dir, twist).multiply(q) : q;
}

/** The twist about `dir` that `q` carries beyond the parent's rotation and the shortest swing from `d0` (radians). */
export function residualTwist(q: Quaternion, parentQ: Quaternion, d0: Vec3, dir: Vec3): number {
  return twistOf(q, qSwing(d0, dir).multiply(parentQ), dir);
}

/* ---------- the joint model ---------- */

/** The hinge's flexion direction in the rest frame (skater space) for each hinge child. */
const HINGE: Partial<Record<BoneName, { flex: Vec3; parent: BoneName }>> = {
  forearm_L: { flex: [0, 0, 1], parent: "upper_arm_L" },
  forearm_R: { flex: [0, 0, 1], parent: "upper_arm_R" },
  shin_L: { flex: [0, 0, -1], parent: "thigh_L" },
  shin_R: { flex: [0, 0, -1], parent: "thigh_R" },
};

const CHILD: Partial<Record<BoneName, BoneName>> = {
  upper_arm_L: "forearm_L", upper_arm_R: "forearm_R", forearm_L: "hand_L", forearm_R: "hand_R",
  thigh_L: "shin_L", thigh_R: "shin_R", shin_L: "foot_L", shin_R: "foot_R",
};

/** A bend this small says nothing about the hinge plane; this large says everything. */
const BEND_SURE: [number, number] = [2, 12];
/** A knee bent less than this takes its turnout from the foot, more than this from the shin's plane. */
const KNEE_SURE: [number, number] = [3, 20];
/** A foot this close to the leg axis says nothing about the turnout. */
const FOOT_SURE: [number, number] = [5, 20];
/** Wrist bend that defines the forearm's pronation. */
const WRIST_SURE: [number, number] = [3, 15];
/** Tibial rotation available at a locked knee, growing to the table's value by this flexion. */
const TIBIAL_LOCKED = 5;
const TIBIAL_FULL_AT = 60;

/** Pelvic tilt preferences, degrees: hip extension beyond EXT_FREE and flexion beyond FLEX_FREE pull the pelvis along. */
const EXT_FREE = 15;
const FLEX_FREE = 90;
const W_EXT = 2;
const W_FLEX = 0.5;
const ABD_FREE = 30;
const ADD_FREE = 15;
const W_ABD = 1;
const W_ADD = 1;
/** With no trunk aimed, a weak pull toward upright. */
const W_UPRIGHT = 0.2;
/** Margin kept inside the hard limits so the planar solve lands within the 3-D measurement. */
const MARGIN = 1;

/** Minimum of a convex function on [lo, hi] by ternary search; the midpoint when the interval is empty. */
function minimizeConvex(f: (x: number) => number, lo: number, hi: number): number {
  if (lo > hi) return (lo + hi) / 2;
  let a = lo;
  let b = hi;
  for (let i = 0; i < 48; i++) {
    const m1 = a + (b - a) / 3;
    const m2 = b - (b - a) / 3;
    if (f(m1) <= f(m2)) b = m2;
    else a = m1;
  }
  return (a + b) / 2;
}

/** The trunk's and the thighs' sagittal and frontal angles, the inputs of the pelvis derivation. */
function trunkAndThighs(pose: Pose) {
  const trunk = pose.bones.spine?.dir ?? pose.bones.chest?.dir;
  const t = trunk ? unit(trunk) : undefined;
  const thighs: { left: boolean; s: number; l: number }[] = [];
  for (const b of ["thigh_L", "thigh_R"] as const) {
    const a = pose.bones[b];
    if (!a) continue;
    const d = unit(a.dir);
    thighs.push({ left: b === "thigh_L", s: Math.atan2(d[2], -d[1]) * DEG, l: Math.asin(clamp1(d[0])) * DEG });
  }
  return { pitch: t ? Math.atan2(t[2], t[1]) * DEG : undefined, roll: t ? Math.asin(clamp1(t[0])) * DEG : undefined, thighs };
}

/**
 * Pelvis pitch and roll for a pose that does not aim `hips`, from the trunk and the legs. The
 * pelvis follows the trunk (lumbopelvic rhythm: the lumbar prefers neutral) and is pulled by the
 * hips (extension beyond 15° and flexion beyond 90° tilt it along), inside the hard limits of the
 * hip, the lumbar and the pelvis itself. A camel or spiral therefore tips the pelvis forward
 * until the free hip's extension is within range, a layback tucks it back, a sit lets it lag the
 * trunk. Returned in degrees: pitch > 0 tips the pelvis forward, roll > 0 toward the skater's left.
 */
export function derivePelvisTilt(pose: Pose): { pitch: number; roll: number } {
  const hip = LIMITS.thigh_L!;
  const lumbar = LIMITS.spine!;
  const pelvis = LIMITS.hips!;
  const { pitch: tPitch, roll: tRoll, thighs } = trunkAndThighs(pose);
  // pitch
  let lo = -pelvis.cone + MARGIN;
  let hi = pelvis.cone - MARGIN;
  if (tPitch !== undefined) {
    lo = Math.max(lo, tPitch - lumbar.forward! + MARGIN);
    hi = Math.min(hi, tPitch + lumbar.backward! - MARGIN);
  }
  for (const th of thighs) {
    lo = Math.max(lo, -th.s - hip.backward! + MARGIN);
    hi = Math.min(hi, hip.forward! - th.s - MARGIN);
  }
  const E = (p: number) => {
    let e = tPitch !== undefined ? (tPitch - p) ** 2 : W_UPRIGHT * p * p;
    for (const th of thighs) {
      const flex = th.s + p;
      e += W_EXT * Math.max(0, -flex - EXT_FREE) ** 2 + W_FLEX * Math.max(0, flex - FLEX_FREE) ** 2;
    }
    return e;
  };
  const pitch = minimizeConvex(E, lo, hi);
  // roll: abduction of a thigh changes by the roll scaled by how much of the thigh lies in the frontal plane
  const rollRoom = Math.sqrt(Math.max(0, pelvis.cone ** 2 - pitch ** 2));
  let rlo = -rollRoom + MARGIN;
  let rhi = rollRoom - MARGIN;
  if (tRoll !== undefined) {
    rlo = Math.max(rlo, tRoll - lumbar.lateral! + MARGIN);
    rhi = Math.min(rhi, tRoll + lumbar.lateral! - MARGIN);
  }
  const outward = (th: { left: boolean; s: number; l: number }, r: number) => (th.left ? 1 : -1) * (th.l + r * Math.cos(th.s * RAD));
  for (const th of thighs) {
    const a = (th.left ? 1 : -1) * Math.cos(th.s * RAD);
    if (Math.abs(a) < 0.15) continue;
    const b0 = (th.left ? 1 : -1) * th.l;
    const r1 = (hip.outward! - MARGIN - b0) / a;
    const r2 = (-hip.inward! + MARGIN - b0) / a;
    rlo = Math.max(rlo, Math.min(r1, r2));
    rhi = Math.min(rhi, Math.max(r1, r2));
  }
  const F = (r: number) => {
    let e = tRoll !== undefined ? (tRoll - r) ** 2 : W_UPRIGHT * r * r;
    for (const th of thighs) {
      const o = outward(th, r);
      e += W_ABD * Math.max(0, o - ABD_FREE) ** 2 + W_ADD * Math.max(0, -o - ADD_FREE) ** 2;
    }
    return e;
  };
  const roll = minimizeConvex(F, rlo, rhi);
  return { pitch, roll };
}

/** The pelvis direction for a pitch (forward) and roll (to the left), degrees. */
export function pelvisDir(pitch: number, roll: number): Vec3 {
  const p = pitch * RAD;
  const r = roll * RAD;
  return unit([Math.sin(r) * Math.cos(p), Math.cos(r) * Math.cos(p), Math.sin(p)]);
}

export interface Frame {
  /** The bone's rotation relative to its rest, in skater space. */
  q: Quaternion;
  dir: Vec3;
  /** Where the skater's forward (+Z at rest) points after this bone's rotation. */
  forward: Vec3;
  /** Twist about `dir` after the shortest swing from rest (radians): what the rig applies. */
  twist: number;
  /** Whether the pose aimed this bone (false: it follows its parent). */
  posed: boolean;
}

/** How far (degrees) a hinge child was aimed out of its hinge plane before projection. */
export interface HingeResidual {
  bone: BoneName;
  lateral: number;
}

interface Resolution {
  frames: Map<BoneName, Frame>;
  pose: ResolvedPose;
  residuals: HingeResidual[];
}

/** Twist of a hinge parent (upper arm, thigh) so its flexion plane contains the posed child. */
function hingeParentTwist(parentDir: Vec3, swing: Quaternion, flexRest: Vec3, child: BoneAim | undefined, taperBehind: boolean): { twist: number; weight: number } {
  if (!child) return { twist: 0, weight: 0 };
  const d = unit(child.dir);
  const f0 = unit(perp(rotate(swing, flexRest), parentDir));
  const dp = perp(d, parentDir);
  const bend = angleBetween(parentDir, d);
  if (len(dp) < 1e-6) return { twist: 0, weight: 0 };
  const theta = signedAngle(f0, unit(dp), parentDir);
  // a shin bent past 90° out of the thigh's plane sits on the knee's hyperextension side: trust it less and less
  // (not for the shoulder, whose swing frame carries no anatomical roll for a raised arm)
  const taper = !taperBehind || Math.abs(theta) <= 90 ? 1 : (180 - Math.abs(theta)) / 90;
  const weight = smoothstep(bend, BEND_SURE[0], BEND_SURE[1]) * taper;
  return { twist: theta * weight, weight: smoothstep(bend, KNEE_SURE[0], KNEE_SURE[1]) };
}

/** Yaw of a posed grandchild (foot, hand) about the axis, relative to where it would point with no twist. */
function yawAbout(axis: Vec3, swing: Quaternion, restChildDir: Vec3, child: BoneAim | undefined, sure: [number, number], twoSided: boolean): number {
  if (!child) return 0;
  const d = unit(child.dir);
  const ref = perp(rotate(swing, restChildDir), axis);
  const dp = perp(d, axis);
  if (len(ref) < 1e-6 || len(dp) < 1e-6) return 0;
  let theta = signedAngle(unit(ref), unit(dp), axis);
  if (twoSided) theta = wrap180(theta * 2) / 2;
  const w = smoothstep(angleBetween(axis, d), sure[0], sure[1]);
  return theta * w;
}

/**
 * Resolves a pose into frames for every posable bone, the way the rig applies them. A posed bone
 * is the twist about its new direction after the shortest swing from its rest direction; an
 * unposed bone keeps its rest relation to its parent. Where the pose leaves a twist out, it is
 * derived: upper arms and thighs so the elbow/knee plane contains the forearm/shin (the thigh also
 * takes the foot's turnout when the knee is straight), forearms from the hand (pronation), shins
 * from the foot (tibial rotation at a bent knee). Posed shins and forearms are projected into the
 * hinge plane and, like posed hands and feet, inherit their parent's roll. Where the pose leaves the
 * pelvis out, it is tilted by `derivePelvisTilt`.
 */
function resolve(pose: Pose, rest: RestFn = defaultRest): Resolution {
  const frames = new Map<BoneName, Frame>();
  const residuals: HingeResidual[] = [];
  const bones = {} as ResolvedPose["bones"];
  frames.set("root", { q: new Quaternion(), dir: [0, 1, 0], forward: [0, 0, 1], twist: 0, posed: false });
  let hipsAim = pose.bones.hips;
  if (!hipsAim) {
    const { pitch, roll } = derivePelvisTilt(pose);
    hipsAim = { dir: pelvisDir(pitch, roll), twist: 0 };
  }
  for (const b of ORDER) {
    const parent = frames.get(PARENT[b] ?? "root")!;
    const restDir = unit(rest(b));
    const aim = b === "hips" ? hipsAim : pose.bones[b];
    let q: Quaternion;
    let dir: Vec3;
    let twist: number;
    if (!aim) {
      q = parent.q.clone();
      dir = unit(rotate(q, restDir));
      twist = twistOf(q, qSwing(restDir, dir), dir);
    } else {
      dir = unit(aim.dir);
      const hinge = HINGE[b];
      const lim = LIMITS[b];
      if ((b === "foot_L" || b === "foot_R") && lim?.minAngle !== undefined && lim.lateral !== undefined) {
        // the boot's stiff shaft limits the ankle: a foot aimed past the booted range (pointed closer to
        // the shin line than minAngle, or rolled sideways past `lateral`) is brought back to the limit in
        // the same sagittal/side frame the validator measures, so the leg stays in the boot and what is
        // rendered is what is validated
        const u = parent.dir;
        let fwdAxis = perp(parent.forward, u);
        if (len(fwdAxis) < 1e-3) fwdAxis = perp([0, 1, 0], u);
        fwdAxis = unit(fwdAxis);
        const sideAxis = unit(cross(u, fwdAxis));
        let c = dot(dir, u);
        let f = dot(dir, fwdAxis);
        let sd = dot(dir, sideAxis);
        let changed = false;
        const sideMax = Math.sin((lim.lateral - 0.5) * RAD);
        if (Math.abs(sd) > sideMax) {
          sd = Math.sign(sd) * sideMax;
          changed = true;
        }
        const r = Math.hypot(c, f);
        const floor = (lim.minAngle + 1) * RAD;
        const ceil = (lim.cone - 1) * RAD;
        let theta = Math.atan2(f, c);
        if (theta < floor) {
          theta = floor;
          changed = true;
        } else if (theta > ceil) {
          theta = ceil;
          changed = true;
        }
        if (changed) {
          const rr = Math.sqrt(Math.max(0, 1 - sd * sd)) || r;
          c = rr * Math.cos(theta);
          f = rr * Math.sin(theta);
          dir = unit([u[0] * c + fwdAxis[0] * f + sideAxis[0] * sd, u[1] * c + fwdAxis[1] * f + sideAxis[1] * sd, u[2] * c + fwdAxis[2] * f + sideAxis[2] * sd]);
        }
      }
      if (hinge) {
        // project into the parent's hinge plane; the plane follows the parent's swing and twist
        const u = parent.dir;
        const f1 = unit(perp(rotate(parent.q, hinge.flex), u));
        const n = unit(cross(u, f1));
        const out = Math.asin(clamp1(dot(dir, n))) * DEG;
        residuals.push({ bone: b, lateral: Math.abs(out) });
        const proj = perp(dir, n);
        dir = len(proj) < 1e-3 ? u : unit(proj);
      }
      const swing = qSwing(restDir, dir);
      if (aim.twist !== undefined) {
        twist = aim.twist;
        q = qAxis(dir, twist).multiply(swing);
      } else if (b === "upper_arm_L" || b === "upper_arm_R" || b === "thigh_L" || b === "thigh_R") {
        // the joint's neutral rotation follows the parent segment (the pelvis, the chest): measure the twist
        // from the swing out of the parent-following direction, so a pelvis lying on its side still counts
        // its hips' rotation from the pelvis, not from the world
        const d0 = unit(rotate(parent.q, restDir));
        const q0 = qSwing(d0, dir).multiply(parent.q);
        const child = CHILD[b]!;
        const flex = HINGE[child]!.flex;
        const isThigh = b === "thigh_L" || b === "thigh_R";
        const fromChild = hingeParentTwist(dir, q0, flex, pose.bones[child], isThigh);
        let theta = fromChild.twist;
        if (isThigh) {
          // a straight knee lets the foot's turnout rotate the whole leg at the hip
          const foot = CHILD[child]!;
          const fromFoot = yawAbout(dir, q0, unit(rest(foot)), pose.bones[foot], FOOT_SURE, false);
          theta = fromChild.weight * theta + (1 - fromChild.weight) * fromFoot;
        }
        const range = lim?.twist ?? 0;
        q = qAxis(dir, clamp(theta, -range, range) * RAD).multiply(q0);
        twist = twistOf(q, swing, dir);
      } else if (hinge || b === "hand_L" || b === "hand_R" || b === "foot_L" || b === "foot_R") {
        // inherit the parent's roll: swing from where the bone points when following its parent
        const d0 = unit(rotate(parent.q, restDir));
        q = qSwing(d0, dir).multiply(parent.q);
        if (hinge) {
          const child = CHILD[b]!;
          const bend = angleBetween(parent.dir, dir);
          const range = lim?.twist ?? 0;
          let axial: number;
          if (b === "forearm_L" || b === "forearm_R") {
            // pronation/supination follows the hand's flexion plane
            axial = clamp(yawAbout(dir, q, unit(rest(child)), pose.bones[child], WRIST_SURE, true), -range, range);
          } else {
            // tibial rotation: little at a locked knee, the table's value by 60° of flexion
            const allowed = TIBIAL_LOCKED + (range - TIBIAL_LOCKED) * Math.min(1, bend / TIBIAL_FULL_AT);
            axial = clamp(yawAbout(dir, q, unit(rest(child)), pose.bones[child], FOOT_SURE, false), -allowed, allowed);
          }
          if (axial) q = qAxis(dir, axial * RAD).multiply(q);
        }
        twist = twistOf(q, swing, dir);
      } else {
        twist = 0;
        q = swing;
      }
    }
    frames.set(b, { q, dir, forward: unit(rotate(q, [0, 0, 1])), twist, posed: !!aim });
    bones[b] = { dir, twist };
  }
  return { frames, residuals, pose: { bones, hips: pose.hips ? [pose.hips[0], pose.hips[1], pose.hips[2]] : [0, 0, 0] } };
}

/**
 * The fully specified pose the rig renders: every posable bone aimed and twisted (derived twists
 * for the limbs, parent-following directions for unposed bones), knees and elbows in their hinge
 * planes, the pelvis tilted. Resolving a resolved pose changes nothing.
 */
export function resolvePose(pose: Pose, rest: RestFn = defaultRest): ResolvedPose {
  return resolve(pose, rest).pose;
}

/** Frames for every posable bone as the rig applies them (see `resolvePose`). */
export function poseFrames(pose: Pose, rest: RestFn = defaultRest): Map<BoneName, Frame> {
  return resolve(pose, rest).frames;
}

/** Direction of a bone in the pose, following its parent when the pose leaves it alone. */
export function poseDir(pose: Pose, bone: BoneName, rest: RestFn = defaultRest): Vec3 {
  return poseFrames(pose, rest).get(bone)?.dir ?? unit(rest(bone));
}

/**
 * Checks every posable bone of the resolved pose against LIMITS. Angles are measured in the frame
 * of the joint's parent segment: the hip's flexion axis is the pelvis's forward (after the derived
 * tilt), the knee's is the thigh's forward after the hip's swing and twist (so a camel's knee still
 * flexes "behind" the thigh), the elbow's follows the upper arm. Flexion/extension is the signed
 * angle of the bone's projection into the sagittal plane of that frame; the side angle is its
 * elevation out of that plane. A shin or forearm aimed out of its hinge plane further than the
 * carrying angle allows is reported as `lateral` even though the render projects it into the plane.
 */
export function validatePose(pose: Pose, rest: RestFn = defaultRest): PoseViolation[] {
  const out: PoseViolation[] = [];
  const UP: Vec3 = [0, 1, 0];
  const { frames, residuals } = resolve(pose, rest);
  for (const [boneKey, lim] of Object.entries(LIMITS) as [BoneName, JointLimit][]) {
    const me = frames.get(boneKey)!;
    const d = me.dir;
    const frameBone = lim.parent ?? PARENT[boneKey] ?? "root";
    const parent = frames.get(frameBone) ?? frames.get("root")!;
    let ref: Vec3;
    if (lim.ref === "up") ref = UP;
    else if (lim.ref === "rest") ref = unit(rotate(parent.q, unit(rest(boneKey))));
    else ref = lim.ref === "parentDown" ? scale(parent.dir, -1) : parent.dir;
    const cos = clamp1(dot(ref, d));
    const angle = Math.acos(cos) * DEG;
    const push = (rule: string, value: number, limit: number) => out.push({ bone: boneKey, joint: lim.joint, rule, value: Math.round(value * 10) / 10, limit });
    if (angle > lim.cone + 1e-6) push("cone", angle, lim.cone);
    if (lim.forward === undefined && lim.backward === undefined && lim.lateral === undefined && lim.outward === undefined && lim.inward === undefined && lim.minAngle === undefined) continue;
    // split the deviation into forward/backward and sideways parts in the parent segment's frame
    let fwdAxis = perp(parent.forward, ref);
    if (len(fwdAxis) < 1e-3) fwdAxis = perp(UP, ref);
    fwdAxis = unit(fwdAxis);
    const sideAxis = unit(cross(ref, fwdAxis));
    const fwdC = dot(d, fwdAxis);
    const side = Math.asin(clamp1(dot(d, sideAxis))) * DEG;
    // Flexion is the sagittal angle when the bone lies near the sagittal plane (a hinge, a leg raised in front),
    // otherwise its elevation in front of the frontal plane; extension is the elevation behind the frontal
    // plane (what an abducted ball joint feels; a leg swept far up behind is caught by the cone as well).
    const sagittal = Math.atan2(fwdC, cos) * DEG;
    const elevation = Math.asin(clamp1(fwdC)) * DEG;
    const fwd = Math.abs(side) < 60 && fwdC > 0 ? sagittal : elevation;
    // the ankle never folds onto the dorsal side of the shin line: its minimum is on the signed sagittal angle
    if (lim.minAngle !== undefined && sagittal < lim.minAngle - 1e-6) push("minAngle", sagittal, lim.minAngle);
    if (lim.forward !== undefined && fwd > lim.forward + 1e-6) push("forward", fwd, lim.forward);
    if (lim.backward !== undefined && -elevation > lim.backward + 1e-6) push("backward", -elevation, lim.backward);
    if (lim.lateral !== undefined) {
      const residual = residuals.find((r) => r.bone === boneKey)?.lateral ?? 0;
      const lateral = Math.max(Math.abs(side), residual);
      if (lateral > lim.lateral + 1e-6) push("lateral", lateral, lim.lateral);
    }
    if (lim.outward !== undefined || lim.inward !== undefined) {
      // outward = away from the midline: the parent segment's own left (+X at rest) for left-side bones, its right for right-side ones
      const left = unit(rotate(parent.q, [1, 0, 0]));
      const outwardAxis = boneKey.endsWith("_L") ? left : scale(left, -1);
      const sideAxisOutward = dot(sideAxis, outwardAxis) >= 0 ? 1 : -1;
      const outwardDeg = side * sideAxisOutward;
      if (lim.outward !== undefined && outwardDeg > lim.outward + 1e-6) push("outward", outwardDeg, lim.outward);
      if (lim.inward !== undefined && -outwardDeg > lim.inward + 1e-6) push("inward", -outwardDeg, lim.inward);
    }
  }
  return out;
}

/** One line per violation, for test output and the pose lab. */
export function describeViolations(v: PoseViolation[]): string {
  return v.map((x) => `${x.joint} (${x.bone}) ${x.rule} ${x.value}° > ${x.limit}°`).join("; ");
}
