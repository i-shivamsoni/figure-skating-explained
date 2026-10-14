import { mirrorPose, POSES } from "../rig/poses";
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
/** One stroke (push and glide) on each foot, seconds. */
export const STROKE_PERIOD = 0.9;

export interface LinkOptions {
  /** Change of heading over the link, radians (positive turns left, like yaw). */
  turn?: number;
  seconds?: number;
  /** Turn to skate backward in the last half second (for an element that starts on a back edge). */
  endBackward?: boolean;
  /** The next element's first pose, blended into over the last half second. */
  endPose?: Pose;
  /** Metres per second; STROKE_SPEED by default. */
  speed?: number;
}

/**
 * A stroking link that starts at `from`, travels at STROKE_SPEED on a constant arc through `turn`,
 * and ends facing the way the next element needs. Used between elements on the rink and for the
 * idle loop.
 */
export function linkTimeline(from: IcePoint, { turn = 0, seconds = 2, endBackward = false, endPose, speed = STROKE_SPEED }: LinkOptions = {}): Timeline {
  const T = Math.max(0.25, seconds);
  const v = speed;
  const w = turn / T;
  const h0 = from.heading;
  const turnStart = Math.max(0.1, T - 0.6);
  const turnEnd = Math.max(turnStart + 0.1, T - 0.2);
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
  // stroking: feet together on the push, a glide on the left, together, a glide on the right…
  // (the trace alternates feet on the same period); coasting slowly is a two-foot glide
  const together = POSES.stand;
  const glides = [glideF, mirrorPose(glideF)];
  const strokes = v >= STROKE_SPEED * 0.6;
  const settle = endBackward ? turnStart : Math.max(0.05, T - 0.5);
  const keys: PoseKey[] = [{ t: 0, pose: strokes ? together : glideF }];
  for (let i = 0, t0 = 0; strokes && t0 + STROKE_PERIOD * 0.5 < settle; i++, t0 += STROKE_PERIOD) {
    keys.push({ t: t0 + STROKE_PERIOD * 0.5, pose: glides[i % 2], ease: easeInOut });
    if (t0 + STROKE_PERIOD < settle) keys.push({ t: t0 + STROKE_PERIOD, pose: together, ease: easeInOut });
  }
  if (endBackward) {
    keys.push({ t: turnStart, pose: glideF, ease: easeInOut });
    keys.push({ t: turnEnd, pose: glideB, ease: easeInOut });
  } else keys.push({ t: settle, pose: glideF, ease: easeInOut });
  keys.push({ t: T, pose: last, ease: easeInOut });
  const trace: TraceSample[] = [];
  for (let i = 0; i <= Math.round(T * 40); i++) {
    const t = i / 40;
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: strokes ? (Math.floor(t / STROKE_PERIOD) % 2 === 0 ? "L" : "R") : "both", edge: strokes ? "outside" : "flat" });
  }
  return {
    id: "link",
    title: "Stroking",
    duration: T,
    keys,
    root,
    markers: [{ t: 0, label: "Stroking", detail: "arrow keys steer: left and right turn, up strokes harder, down coasts" }],
    trace,
    focus: { x: from.x, z: from.z },
    heading: h0,
  };
}

/** How close to the boards the skater may get: a blade's width of clearance, not a safety band. */
export const EDGE_MARGIN = 0.6;

/** Metres of ice ahead of a point along `heading` before the surface ends (`margin` inside the boards). */
export function roomAhead(p: { x: number; z: number }, heading: number, margin = EDGE_MARGIN, max = 70): number {
  const sx = Math.sin(heading);
  const cz = Math.cos(heading);
  for (let d = 0; d <= max; d += 0.5) if (!insideRink(p.x + d * sx, p.z + d * cz, margin)) return d;
  return max;
}

/**
 * Keeps the skater on the ice: when fewer than `ahead` metres are free along the heading, turns
 * to the heading with the most ice ahead (toward centre ice or along the long axis), nearer
 * headings winning ties. `turn` is 0 when nothing needs to change.
 */
export function keepInRink(p: IcePoint, ahead: number, margin = EDGE_MARGIN): { heading: number; turn: number } {
  if (!insideRink(p.x, p.z, margin)) {
    // already in the band by the boards: head straight back toward centre ice
    const turn = wrapAngle(headingOf(-p.x, -p.z) - p.heading);
    return { heading: p.heading + turn, turn };
  }
  if (roomAhead(p, p.heading, margin) >= ahead) return { heading: p.heading, turn: 0 };
  let best = { heading: p.heading, turn: 0, room: -1 };
  const candidates = [headingOf(-p.x, -p.z), ...Array.from({ length: 24 }, (_, i) => (i * TWO_PI) / 24)];
  for (const h of candidates) {
    const room = roomAhead(p, h, margin);
    const turn = wrapAngle(h - p.heading);
    if (room > best.room + 1e-9 || (Math.abs(room - best.room) < 1e-9 && Math.abs(turn) < Math.abs(best.turn))) best = { heading: p.heading + turn, turn, room };
  }
  if (Math.abs(best.turn) > Math.PI - 0.02) {
    // a U-turn: swing toward the side with more ice (positive turns go to the skater's left)
    const left = roomAhead(p, p.heading + Math.PI / 2, 0);
    const right = roomAhead(p, p.heading - Math.PI / 2, 0);
    best.turn = (left >= right ? 1 : -1) * Math.abs(best.turn);
    best.heading = p.heading + best.turn;
  }
  return { heading: best.heading, turn: best.turn };
}

/** Where the skater is at time t and which way she is travelling. */
export function pointAt(tl: Timeline, t: number): IcePoint {
  const r = tl.root(t);
  const t0 = Math.max(0, Math.min(tl.duration - DT, t));
  return { x: r.x, z: r.z, heading: travel(tl, t0, Math.min(tl.duration, t0 + DT)) };
}

/** How far the element reaches from its start, in metres (the longest leg of its root path). */
export function extentOf(tl: Timeline): number {
  const a = tl.root(0);
  let max = 0;
  for (let i = 1; i <= 40; i++) {
    const r = tl.root((tl.duration * i) / 40);
    max = Math.max(max, Math.hypot(r.x - a.x, r.z - a.z));
  }
  return max;
}
