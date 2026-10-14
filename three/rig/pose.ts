import { Vector3 } from "three";
import type { BoneName } from "./bones";

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

/** Blend two poses. Bones present in only one side blend toward `rest` for that bone. */
export function lerpPose(a: Pose, b: Pose, t: number, rest: (bone: BoneName) => Vec3): Pose {
  const names = new Set<BoneName>([...(Object.keys(a.bones) as BoneName[]), ...(Object.keys(b.bones) as BoneName[])]);
  const bones: Pose["bones"] = {};
  for (const n of names) {
    const ba = a.bones[n] ?? { dir: rest(n), twist: 0 };
    const bb = b.bones[n] ?? { dir: rest(n), twist: 0 };
    bones[n] = { dir: slerpDir(ba.dir, bb.dir, t), twist: (ba.twist ?? 0) * (1 - t) + (bb.twist ?? 0) * t };
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
