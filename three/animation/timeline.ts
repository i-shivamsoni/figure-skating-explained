import { lerpPose, type Pose, type Vec3 } from "../rig/pose";
import type { BoneName } from "../rig/bones";

export type Ease = (x: number) => number;
export const linear: Ease = (x) => x;
export const easeInOut: Ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const easeOut: Ease = (x) => 1 - Math.pow(1 - x, 2);
export const easeIn: Ease = (x) => x * x;

export interface PoseKey {
  t: number;
  pose: Pose;
  /** Easing of the transition that ends at this key. */
  ease?: Ease;
}

/** Position of the skater's origin (between the blades) in rink space and its heading. */
export interface RootState {
  x: number;
  y: number;
  z: number;
  /** Rotation about Y; the skater faces (sin yaw, 0, cos yaw). */
  yaw: number;
  /** Somersault rotation about the skater's own lateral axis (backflip); 0 when absent. */
  pitch?: number;
  /** Edge lean: rotation about the skater's forward axis, positive toward the skater's right; 0 when absent. */
  roll?: number;
}

export interface Marker {
  t: number;
  label: string;
  detail?: string;
}

export type EdgeKind = "outside" | "inside" | "flat" | "toe";

export interface TraceSample {
  t: number;
  x: number;
  z: number;
  foot: "L" | "R" | "both";
  edge: EdgeKind;
  /** Set on the pair partner's samples; absent for the primary skater. */
  actor?: "partner";
}

export interface RotationInfo {
  start: number;
  end: number;
  /** Revolutions completed in the air. */
  turns: number;
  /** Revolutions the jump is named for (Axel: n + 0.5). */
  nominal: number;
  /** Yaw the counted rotation starts from (the facing before the on-ice pre-rotation); defaults to the yaw at `start`. */
  yawStart?: number;
}

/** A second skater sharing the clock: pose keys and root motion of the pair partner. */
export interface PartnerTrack {
  keys: PoseKey[];
  root: (t: number) => RootState;
  /** Which model the partner uses; the primary skater uses the site-wide choice. */
  variant: "female" | "male";
}

/**
 * A curved arrow drawn on the ice: a jump's rotation direction, or the way an edge curves.
 * Points on the arc are centre + radius·(sin a, cos a), the same convention as yaw.
 */
export interface IceArrow {
  x: number;
  z: number;
  radius: number;
  /** Start angle in radians and the signed sweep (positive = counter-clockwise seen from above). */
  startAngle: number;
  sweep: number;
  /** Visible between these times. */
  from: number;
  to: number;
  color: string;
  label: string;
}

export interface Timeline {
  id: string;
  title: string;
  duration: number;
  keys: PoseKey[];
  root: (t: number) => RootState;
  /** Present for pair elements. */
  partner?: PartnerTrack;
  markers: Marker[];
  trace: TraceSample[];
  rotation?: RotationInfo;
  /** Curved arrows on the ice showing the sense of a curve or a rotation. */
  arrows?: IceArrow[];
  /** Point of interest for fixed cameras (take-off point, spin centre). */
  focus: { x: number; z: number };
  /** Direction of travel at the focus, for side cameras. */
  heading: number;
}

export function poseAt(tl: Timeline, t: number, rest: (b: BoneName) => Vec3): Pose {
  const keys = tl.keys;
  if (keys.length === 0) return { bones: {} };
  if (t <= keys[0].t) return keys[0].pose;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k.t) {
      const prev = keys[i - 1];
      const span = k.t - prev.t;
      const u = span <= 0 ? 1 : (t - prev.t) / span;
      return lerpPose(prev.pose, k.pose, (k.ease ?? easeInOut)(u), rest);
    }
  }
  return keys[keys.length - 1].pose;
}

export function markerAt(tl: Timeline, t: number): Marker | undefined {
  let m: Marker | undefined;
  for (const x of tl.markers) if (x.t <= t) m = x;
  return m;
}

/** Heading (radians) of a direction in the rink plane, matching RootState.yaw convention. */
export function headingOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const TWO_PI = Math.PI * 2;
