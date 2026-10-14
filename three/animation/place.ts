import { POSES } from "../rig/poses";
import type { Pose } from "../rig/pose";
import { clamp01, easeInOut, headingOf, TWO_PI, type IceArrow, type PoseKey, type RootState, type Timeline, type TraceSample } from "./timeline";
import { insideRink } from "./rinkSize";

/**
 * Placing elements on the rink. Every timeline is authored around its own origin (take-off point,
 * spin centre) travelling +X; a Placement is the rigid motion that puts it somewhere on the ice:
 * where the local origin goes and how far the element is turned about Y (yaw, the same sense as
 * RootState.yaw: a direction a becomes a + yaw).
 */
export interface Placement {
  x: number;
  z: number;
  yaw: number;
}

/** A point on the ice with a direction of travel (the unit vector is (sin heading, cos heading)). */
export interface IcePoint {
  x: number;
  z: number;
  heading: number;
}

/** Wraps an angle into [−π, π). */
export function wrapAngle(a: number): number {
  let r = (a + Math.PI) % TWO_PI;
  if (r < 0) r += TWO_PI;
  return r - Math.PI;
}

function mapper(p: Placement) {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  return (x: number, z: number): [number, number] => [p.x + x * c + z * s, p.z - x * s + z * c];
}

/** The same timeline moved by `p`: root motion, partner, trace, arrows, focus, heading and the counted-rotation start. */
export function placeTimeline(tl: Timeline, p: Placement): Timeline {
  const map = mapper(p);
  const moveRoot =
    (root: (t: number) => RootState) =>
    (t: number): RootState => {
      const r = root(t);
      const [x, z] = map(r.x, r.z);
      return { ...r, x, z, yaw: r.yaw + p.yaw };
    };
  const trace: TraceSample[] = tl.trace.map((s) => {
    const [x, z] = map(s.x, s.z);
    return { ...s, x, z };
  });
  const arrows: IceArrow[] | undefined = tl.arrows?.map((a) => {
    const [x, z] = map(a.x, a.z);
    return { ...a, x, z, startAngle: a.startAngle + p.yaw };
  });
  const [fx, fz] = map(tl.focus.x, tl.focus.z);
  return {
    ...tl,
    root: moveRoot(tl.root),
    trace,
    arrows,
    focus: { x: fx, z: fz },
    heading: tl.heading + p.yaw,
    rotation: tl.rotation && tl.rotation.yawStart !== undefined ? { ...tl.rotation, yawStart: tl.rotation.yawStart + p.yaw } : tl.rotation,
    partner: tl.partner && { ...tl.partner, root: moveRoot(tl.partner.root) },
  };
}

const DT = 0.04;

function travel(tl: Timeline, t0: number, t1: number): number {
  const a = tl.root(t0);
  const b = tl.root(t1);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.hypot(dx, dz) < 1e-4 ? tl.heading : headingOf(dx, dz);
}

/** Where a timeline begins, which way it travels, and whether the skater faces away from that travel (skating backward). */
export function startOf(tl: Timeline): IcePoint & { facingBackward: boolean } {
  const r = tl.root(0);
  const heading = travel(tl, 0, Math.min(tl.duration, DT));
  return { x: r.x, z: r.z, heading, facingBackward: Math.abs(wrapAngle(r.yaw - heading)) > Math.PI / 2 };
}

/** Where a timeline ends and which way it is travelling then. */
export function endOf(tl: Timeline): IcePoint & { facingBackward: boolean } {
  const r = tl.root(tl.duration);
  const heading = travel(tl, Math.max(0, tl.duration - DT), tl.duration);
  return { x: r.x, z: r.z, heading, facingBackward: Math.abs(wrapAngle(r.yaw - heading)) > Math.PI / 2 };
}

/** The placement that starts `tl` exactly at `from`, travelling in its direction. */
export function placementAfter(tl: Timeline, from: IcePoint): Placement {
  const s = startOf(tl);
  const yaw = wrapAngle(from.heading - s.heading);
  const c = Math.cos(yaw);
  const si = Math.sin(yaw);
  return { yaw, x: from.x - (s.x * c + s.z * si), z: from.z - (-s.x * si + s.z * c) };
}

/** Stroking speed between elements, metres per second. */
export const STROKE_SPEED = 3.5;

export interface LinkOptions {
  /** Change of heading over the link, radians (positive turns left, like yaw). */
  turn?: number;
  seconds?: number;
  /** Turn to skate backward in the last half second (for an element that starts on a back edge). */
  endBackward?: boolean;
  /** The next element's first pose, blended into over the last half second. */
  endPose?: Pose;
}

/**
 * A stroking link that starts at `from`, travels at STROKE_SPEED on a constant arc through `turn`,
 * and ends facing the way the next element needs. Used between elements on the rink and for the
 * idle loop.
 */
export function linkTimeline(from: IcePoint, { turn = 0, seconds = 2, endBackward = false, endPose }: LinkOptions = {}): Timeline {
  const T = Math.max(0.8, seconds);
  const v = STROKE_SPEED;
  const w = turn / T;
  const h0 = from.heading;
  const turnStart = T - 0.6;
  const turnEnd = T - 0.2;
  const root = (time: number): RootState => {
    const t = Math.max(0, Math.min(T, time));
    let x: number;
    let z: number;
    if (Math.abs(w) < 1e-6) {
      x = from.x + v * t * Math.sin(h0);
      z = from.z + v * t * Math.cos(h0);
    } else {
      x = from.x + (v / w) * (Math.cos(h0) - Math.cos(h0 + w * t));
      z = from.z + (v / w) * (Math.sin(h0 + w * t) - Math.sin(h0));
    }
    const heading = h0 + w * t;
    let yaw = heading;
    if (endBackward) yaw += Math.PI * easeInOut(clamp01((t - turnStart) / (turnEnd - turnStart)));
    return { x, y: 0, z, yaw };
  };
  const glideF = POSES.glideFO;
  const glideB = POSES.glideBO;
  const last = endPose ?? (endBackward ? glideB : glideF);
  const keys: PoseKey[] = endBackward
    ? [
        { t: 0, pose: glideF },
        { t: turnStart, pose: glideF },
        { t: turnEnd, pose: glideB, ease: easeInOut },
        { t: T, pose: last, ease: easeInOut },
      ]
    : [
        { t: 0, pose: glideF },
        { t: T - 0.5, pose: glideF },
        { t: T, pose: last, ease: easeInOut },
      ];
  const trace: TraceSample[] = [];
  for (let i = 0; i <= Math.round(T * 40); i++) {
    const t = i / 40;
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: Math.floor(t / 0.9) % 2 === 0 ? "L" : "R", edge: "outside" });
  }
  return {
    id: "link",
    title: "Stroking",
    duration: T,
    keys,
    root,
    markers: [{ t: 0, label: "Stroking", detail: turn ? "turning to stay on the ice" : "between elements" }],
    trace,
    focus: { x: from.x, z: from.z },
    heading: h0,
  };
}

/**
 * Turns a heading back toward centre ice when the next `ahead` metres would leave the surface
 * (`margin` metres inside the boards). `turn` is 0 when nothing needs to change.
 */
export function keepInRink(p: IcePoint, ahead: number, margin = 3): { heading: number; turn: number } {
  const px = p.x + ahead * Math.sin(p.heading);
  const pz = p.z + ahead * Math.cos(p.heading);
  if (insideRink(px, pz, margin)) return { heading: p.heading, turn: 0 };
  const turn = wrapAngle(headingOf(-p.x, -p.z) - p.heading);
  return { heading: p.heading + turn, turn };
}
