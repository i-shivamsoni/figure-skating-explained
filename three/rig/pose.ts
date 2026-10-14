import { Quaternion, Vector3 } from "three";
import type { BoneName } from "./bones";
import { ORDER, PARENT, boneRotation, poseFrames, residualTwist, rotateVec, twistAfterSwing } from "./limits";

/**
 * A pose aims bones in "skater space": +X is the skater's left, +Y up, +Z the way the
 * skater faces. Directions are where the bone points (head to tail). `twist` rolls the
 * bone about its own axis in radians. Bones left out stay at their rest rotation
 * relative to their parent, so posing the thigh alone swings the whole leg.
 */
export interface BoneAim {
  dir: [number, number, number];
  twist?: number;
}

export interface Pose {
  bones: Partial<Record<BoneName, BoneAim>>;
  /** Offset of the hips from their rest position, in metres (skater space). */
  hips?: [number, number, number];
}

export type Vec3 = [number, number, number];

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export const V = {
  up: [0, 1, 0] as Vec3,
  down: [0, -1, 0] as Vec3,
  fwd: [0, 0, 1] as Vec3,
  back: [0, 0, -1] as Vec3,
  left: [1, 0, 0] as Vec3,
  right: [-1, 0, 0] as Vec3,
};

/**
 * Limb direction from two angles in degrees: `fwdDeg` swings the limb from straight down
 * toward the front (90 = horizontal forward, 180 = straight up, negative = behind);
 * `sideDeg` then swings it out to the skater's left (negative = right).
 */
export function limb(fwdDeg: number, sideDeg = 0): Vec3 {
  const f = (fwdDeg * Math.PI) / 180;
  const sd = (sideDeg * Math.PI) / 180;
  // start pointing down, rotate about X toward +Z, then about Z toward +X
  const y1 = -Math.cos(f);
  const z1 = Math.sin(f);
  return norm([-y1 * Math.sin(sd), y1 * Math.cos(sd), z1]);
}

const _qp = new Quaternion();
const _vp = new Vector3();
const _vz = new Vector3();

/**
 * A pointed foot: the foot direction `deg` degrees from the shin line, bent in the shin's own
 * sagittal plane (plantarflexion). The ankle folds to about 12° from the shin line at most.
 */
export function pointed(shin: Vec3, deg = 50): Vec3 {
  const s = _vp.set(shin[0], shin[1], shin[2]).normalize();
  // where the shin's "forward" went: the rest shin hangs down, so swing +Z along with it
  _qp.setFromUnitVectors(_vz.set(0, -1, 0), s);
  const f = _vz.set(0, 0, 1).applyQuaternion(_qp);
  f.addScaledVector(s, -f.dot(s)).normalize();
  const a = (deg * Math.PI) / 180;
  const out = s.clone().multiplyScalar(Math.cos(a)).addScaledVector(f, Math.sin(a));
  return [out.x, out.y, out.z];
}

/** Mirror a direction to the other side of the body (left ↔ right). */
export function mirrorDir(d: Vec3): Vec3 {
  return [-d[0], d[1], d[2]];
}

export function vec(x: number, y: number, z: number): Vec3 {
  return norm([x, y, z]);
}

export function aim(dirv: Vec3, twist = 0): BoneAim {
  return { dir: dirv, twist };
}

const tmpA = new Vector3();
const tmpB = new Vector3();

/** Spherical interpolation between two unit directions. */
export function slerpDir(a: Vec3, b: Vec3, t: number): Vec3 {
  tmpA.set(a[0], a[1], a[2]);
  tmpB.set(b[0], b[1], b[2]);
  const d = Math.min(1, Math.max(-1, tmpA.dot(tmpB)));
  const theta = Math.acos(d);
  if (theta < 1e-5) return [b[0], b[1], b[2]];
  if (Math.PI - theta < 1e-4) {
    // opposite: rotate through an orthogonal axis
    const ortho = Math.abs(tmpA.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    ortho.cross(tmpA).normalize();
    const ang = Math.PI * t;
    const out = tmpA.clone().multiplyScalar(Math.cos(ang)).add(ortho.multiplyScalar(Math.sin(ang)));
    return [out.x, out.y, out.z];
  }
  const s = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / s;
  const wb = Math.sin(t * theta) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}

const lerpAngle = (a: number, b: number, t: number) => {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
};

/**
 * Blend two poses the way a skeleton moves: each bone's direction is interpolated along the
 * great circle in its parent's blended frame and its twist beyond the parent's rotation
 * linearly, using the resolved frames of both poses (derived twists, pelvic tilt, hinge
 * projection; see limits.ts). A knee therefore stays a knee mid-blend, a leg swinging from
 * behind to in front passes beside the body, and a hand unposed on one side keeps following its
 * forearm. The result aims every bone either side posed, with its blended twist; the pelvis is
 * written only where an endpoint aimed it, so the rig re-derives the tilt from the blend.
 */
export function lerpPose(a: Pose, b: Pose, t: number, rest: (bone: BoneName) => Vec3): Pose {
  const fa = poseFrames(a, rest);
  const fb = poseFrames(b, rest);
  const world = new Map<BoneName, Quaternion>([["root", new Quaternion()]]);
  const bones: Pose["bones"] = {};
  for (const n of ORDER) {
    const parent = PARENT[n] ?? "root";
    const restDir = rest(n);
    const side = (f: Map<BoneName, { q: Quaternion; dir: Vec3 }>) => {
      const pq = f.get(parent)!.q;
      const me = f.get(n)!;
      return { local: rotateVec(pq.clone().invert(), me.dir), twist: residualTwist(me.q, pq, rotateVec(pq, restDir), me.dir) };
    };
    const sa = side(fa);
    const sb = side(fb);
    const pq = world.get(parent)!;
    const dir = rotateVec(pq, slerpDir(sa.local, sb.local, t));
    const q = boneRotation(pq, rotateVec(pq, restDir), dir, lerpAngle(sa.twist, sb.twist, t));
    world.set(n, q);
    const aimA = a.bones[n];
    const aimB = b.bones[n];
    if (!aimA && !aimB) continue;
    // the blended twist is written for every aimed bone, so the player renders a held position
    // with exactly the roll the resolver, the pose lab and the stills give it
    bones[n] = { dir, twist: twistAfterSwing(q, restDir, dir) };
  }
  const ha = a.hips ?? [0, 0, 0];
  const hb = b.hips ?? [0, 0, 0];
  return { bones, hips: [ha[0] + (hb[0] - ha[0]) * t, ha[1] + (hb[1] - ha[1]) * t, ha[2] + (hb[2] - ha[2]) * t] };
}

export function mergePoses(...poses: Pose[]): Pose {
  const out: Pose = { bones: {}, hips: [0, 0, 0] };
  for (const p of poses) {
    Object.assign(out.bones, p.bones);
    if (p.hips) out.hips = p.hips;
  }
  return out;
}
