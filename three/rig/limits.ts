import type { BoneName } from "./bones";
import type { Pose, Vec3 } from "./pose";

/**
 * Range-of-motion contract for the skater rig (CONTRACT, Wave 0).
 *
 * A pose aims bones by direction in skater space (+X left, +Y up, +Z forward; see pose.ts).
 * `validatePose` measures each posable bone against the joint it hangs from and returns every
 * violation of the table below. The table describes an elite figure skater, not an average
 * adult: hips and spine allow the extension that camels, spirals, laybacks and the Biellmann
 * need, but the remaining extremes (Biellmann, Charlotte, cantilever) are expected to be
 * achieved through pelvic tilt and spine extension distributed over the segments, not by
 * raising a single joint's limit. Owner after Wave 0: the rig agent (section A), which may
 * refine how angles are measured (hinge projection, twist derivation, pelvic tilt) and adjust
 * values with a kinesiology justification in the comment next to the value.
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
  /** Human-readable joint name for messages. */
  joint: string;
}

/** Degrees. Left and right share a row (mirrored automatically). */
export const LIMITS: Partial<Record<BoneName, JointLimit>> = {
  // the pelvis may pitch and roll with the trunk; camels and spirals tilt it far forward
  hips: { ref: "up", cone: 100, joint: "pelvis" },
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
  // shoulder: elevation to 180, extension behind the back 60, adduction across the body 50
  upper_arm_L: { ref: "parentDown", parent: "chest", cone: 180, backward: 60, inward: 50, joint: "left shoulder" },
  upper_arm_R: { ref: "parentDown", parent: "chest", cone: 180, backward: 60, inward: 50, joint: "right shoulder" },
  // elbow: a hinge that flexes forward of the upper arm (palms toward the thighs at rest), to 150;
  // hyperextension 8, carrying angle / sideways 25. The hinge plane follows the upper arm's
  // swing and twist; deriving a natural twist from the hand's aim is the rig agent's job
  forearm_L: { ref: "parent", cone: 150, forward: 150, backward: 8, lateral: 25, joint: "left elbow" },
  forearm_R: { ref: "parent", cone: 150, forward: 150, backward: 8, lateral: 25, joint: "right elbow" },
  // wrist: flexion/extension 70, deviation 30
  hand_L: { ref: "parent", cone: 70, joint: "left wrist" },
  hand_R: { ref: "parent", cone: 70, joint: "right wrist" },
  // hip: flexion 130, extension 40 from the pelvis (the pelvis tilts for more), abduction 55, adduction 30
  thigh_L: { ref: "parentDown", parent: "hips", cone: 130, forward: 130, backward: 40, outward: 55, inward: 30, joint: "left hip" },
  thigh_R: { ref: "parentDown", parent: "hips", cone: 130, forward: 130, backward: 40, outward: 55, inward: 30, joint: "right hip" },
  // knee: a hinge. Flexion to 145 (shin bends backward), hyperextension 6, no sideways bend beyond 10
  shin_L: { ref: "parent", cone: 145, forward: 6, backward: 145, lateral: 10, joint: "left knee" },
  shin_R: { ref: "parent", cone: 145, forward: 6, backward: 145, lateral: 10, joint: "right knee" },
  // ankle: measured from the shin line; the rest foot sits ~70° from it. A fully pointed foot
  // (plantarflexion) comes within ~12° of the shin line; dorsiflexion opens the angle to ~95°;
  // inversion/eversion 25
  foot_L: { ref: "parent", cone: 95, minAngle: 12, lateral: 25, joint: "left ankle" },
  foot_R: { ref: "parent", cone: 95, minAngle: 12, lateral: 25, joint: "right ankle" },
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

/** Rest directions of the exported skeleton in skater space (A-pose, feet pointing forward-down). */
export const DEFAULT_REST: Record<BoneName, Vec3> = {
  root: [0, 1, 0],
  hips: [0, 1, 0],
  spine: [0, 1, 0],
  chest: [0, 1, 0],
  neck: [0, 1, 0],
  head: [0, 1, 0],
  head_tip: [0, 1, 0],
  shoulder_L: [1, 0, 0],
  upper_arm_L: [0.43, -0.9, 0],
  forearm_L: [0.43, -0.9, 0],
  hand_L: [0.43, -0.9, 0],
  hand_L_tip: [0.43, -0.9, 0],
  shoulder_R: [-1, 0, 0],
  upper_arm_R: [-0.43, -0.9, 0],
  forearm_R: [-0.43, -0.9, 0],
  hand_R: [-0.43, -0.9, 0],
  hand_R_tip: [-0.43, -0.9, 0],
  thigh_L: [0, -1, 0],
  shin_L: [0, -1, 0],
  foot_L: [0, -0.35, 0.94],
  foot_L_tip: [0, -0.35, 0.94],
  thigh_R: [0, -1, 0],
  shin_R: [0, -1, 0],
  foot_R: [0, -0.35, 0.94],
  foot_R_tip: [0, -0.35, 0.94],
};

export const defaultRest = (b: BoneName): Vec3 => DEFAULT_REST[b];

const PARENT: Partial<Record<BoneName, BoneName>> = {
  hips: "root", spine: "hips", chest: "spine", neck: "chest", head: "neck",
  shoulder_L: "chest", upper_arm_L: "shoulder_L", forearm_L: "upper_arm_L", hand_L: "forearm_L",
  shoulder_R: "chest", upper_arm_R: "shoulder_R", forearm_R: "upper_arm_R", hand_R: "forearm_R",
  thigh_L: "hips", shin_L: "thigh_L", foot_L: "shin_L",
  thigh_R: "hips", shin_R: "thigh_R", foot_R: "shin_R",
};

/** Parents before children, so frames can be propagated in one pass. */
const ORDER: BoneName[] = [
  "hips", "spine", "chest", "neck", "head",
  "shoulder_L", "upper_arm_L", "forearm_L", "hand_L",
  "shoulder_R", "upper_arm_R", "forearm_R", "hand_R",
  "thigh_L", "shin_L", "foot_L",
  "thigh_R", "shin_R", "foot_R",
];

const DEG = 180 / Math.PI;
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

/** Rotate v about the unit axis by angle (Rodrigues). */
function rotateAbout(axis: Vec3, angle: number, v: Vec3): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = axis;
  const kv = cross(k, v);
  const kd = dot(k, v);
  return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)];
}

/** The shortest rotation taking unit a onto unit b, applied to v (what the rig's setFromUnitVectors does). */
function swing(a: Vec3, b: Vec3, v: Vec3): Vec3 {
  const d = clamp1(dot(a, b));
  const ax = cross(a, b);
  const l = len(ax);
  if (l < 1e-9) {
    if (d > 0) return v;
    // opposite: a half turn about any axis orthogonal to a
    const ortho = unit(cross(a, Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    return rotateAbout(ortho, Math.PI, v);
  }
  return rotateAbout(scale(ax, 1 / l), Math.acos(d), v);
}

/** A bone's rotation relative to its rest, as a function on vectors. */
type Rot = (v: Vec3) => Vec3;

interface Frame {
  dir: Vec3;
  /** Where the skater's forward (+Z at rest) points after this bone's rotation. */
  forward: Vec3;
  rot: Rot;
}

/**
 * Frames for every posable bone, built as the rig applies them: a posed bone is the twist about
 * its new direction after the shortest swing from its rest direction; an unposed bone keeps its
 * rest relation to its parent, so it inherits the parent's rotation (hands follow forearms, feet
 * follow shins). Exported for the rig agent's tests.
 */
export function poseFrames(pose: Pose, rest: (b: BoneName) => Vec3 = defaultRest): Map<BoneName, Frame> {
  const frames = new Map<BoneName, Frame>();
  const identity: Rot = (v) => v;
  frames.set("root", { dir: [0, 1, 0], forward: [0, 0, 1], rot: identity });
  for (const b of ORDER) {
    const parent = frames.get(PARENT[b] ?? "root") ?? frames.get("root")!;
    const aim = pose.bones[b];
    const restDir = unit(rest(b));
    let rot: Rot;
    let dir: Vec3;
    if (aim) {
      dir = unit(aim.dir);
      const tw = aim.twist ?? 0;
      rot = (v) => rotateAbout(dir, tw, swing(restDir, dir, v));
    } else {
      rot = parent.rot;
      dir = unit(rot(restDir));
    }
    frames.set(b, { dir, forward: unit(rot([0, 0, 1])), rot });
  }
  return frames;
}

/** Direction of a bone in the pose, following its parent when the pose leaves it alone. */
export function poseDir(pose: Pose, bone: BoneName, rest: (b: BoneName) => Vec3 = defaultRest): Vec3 {
  return poseFrames(pose, rest).get(bone)?.dir ?? unit(rest(bone));
}

/**
 * Checks every posable bone in `pose` against LIMITS. Angles are measured in the frame of the
 * joint's parent segment: the hip's flexion axis is the pelvis's forward, the knee's is the
 * thigh's forward after the hip's swing (so a camel's knee still flexes "behind" the thigh),
 * the elbow's follows the upper arm. Pelvic tilt therefore counts as soon as a pose (or the
 * rig agent's derivation) aims the hips bone.
 */
export function validatePose(pose: Pose, rest: (b: BoneName) => Vec3 = defaultRest): PoseViolation[] {
  const out: PoseViolation[] = [];
  const UP: Vec3 = [0, 1, 0];
  const frames = poseFrames(pose, rest);
  for (const [boneKey, lim] of Object.entries(LIMITS) as [BoneName, JointLimit][]) {
    const me = frames.get(boneKey)!;
    const d = me.dir;
    const frameBone = lim.parent ?? PARENT[boneKey] ?? "root";
    const parent = frames.get(frameBone) ?? frames.get("root")!;
    let ref: Vec3;
    if (lim.ref === "up") ref = UP;
    else if (lim.ref === "rest") ref = unit(parent.rot(unit(rest(boneKey))));
    else ref = lim.ref === "parentDown" ? scale(parent.dir, -1) : parent.dir;
    const cos = clamp1(dot(ref, d));
    const angle = Math.acos(cos) * DEG;
    const push = (rule: string, value: number, limit: number) => out.push({ bone: boneKey, joint: lim.joint, rule, value: Math.round(value * 10) / 10, limit });
    if (angle > lim.cone + 1e-6) push("cone", angle, lim.cone);
    if (lim.minAngle !== undefined && angle < lim.minAngle - 1e-6) push("minAngle", angle, lim.minAngle);
    if (lim.forward === undefined && lim.backward === undefined && lim.lateral === undefined && lim.outward === undefined && lim.inward === undefined) continue;
    // split the deviation into forward/backward and sideways parts in the parent segment's frame
    const dev = sub(d, scale(ref, cos));
    let fwdAxis = sub(parent.forward, scale(ref, dot(parent.forward, ref)));
    if (len(fwdAxis) < 1e-3) fwdAxis = sub(UP, scale(ref, dot(UP, ref)));
    fwdAxis = unit(fwdAxis);
    const sideAxis = unit(cross(ref, fwdAxis));
    const fwd = Math.asin(clamp1(dot(dev, fwdAxis))) * DEG;
    const side = Math.asin(clamp1(dot(dev, sideAxis))) * DEG;
    if (lim.forward !== undefined && fwd > lim.forward + 1e-6) push("forward", fwd, lim.forward);
    if (lim.backward !== undefined && -fwd > lim.backward + 1e-6) push("backward", -fwd, lim.backward);
    if (lim.lateral !== undefined && Math.abs(side) > lim.lateral + 1e-6) push("lateral", Math.abs(side), lim.lateral);
    if (lim.outward !== undefined || lim.inward !== undefined) {
      // outward = away from the midline: +X for left-side bones, -X for right-side ones, in the parent's frame
      const left = unit(cross(UP, parent.forward));
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
