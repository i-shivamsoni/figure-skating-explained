import type { Pose } from "../rig/pose";
import { rollToward } from "../physics/jump";
import { clamp01, easeInOut, headingOf, TWO_PI, type IceArrow, type RootState, type Timeline, type TraceSample } from "./timeline";
import { insideRink } from "./rinkSize";
import { CROSSOVER_RATE, gearFor, STROKE_MIN_SPEED, strokeKeys } from "./stroking";

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

/** Where a skater is and how she is moving: the state one segment hands to the next. */
export interface IceState extends IcePoint {
  /** Metres per second along the heading. */
  speed?: number;
  /** Edge lean, as RootState.roll. */
  roll?: number;
  /** Facing away from the direction of travel. */
  facingBackward?: boolean;
  /** The exact facing (RootState.yaw); a link eases any difference from its own ideal facing out over its first moments. */
  yaw?: number;
  /** Strokes into the two-stroke cycle (0–2), so stroking carries on across links. */
  phase?: number;
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

function chord(tl: Timeline, t0: number, t1: number): number {
  const a = tl.root(t0);
  const b = tl.root(t1);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.hypot(dx, dz) < 1e-4 ? tl.heading : headingOf(dx, dz);
}

/**
 * The direction of travel at `t`: the chord over the DT window around it, extrapolated to `t`
 * from a second chord when the window cannot be centred (at either end), which is exact on an
 * arc of constant curvature and leaves no snap between the tangent and the next segment.
 */
function travel(tl: Timeline, t: number): number {
  const T = tl.duration;
  if (T < 2 * DT + 1e-9) return chord(tl, 0, T);
  if (t <= DT) {
    const c1 = chord(tl, 0, DT);
    const c2 = chord(tl, DT, 2 * DT);
    return c1 - 0.5 * wrapAngle(c2 - c1);
  }
  if (t >= T - DT) {
    const c1 = chord(tl, T - DT, T);
    const c2 = chord(tl, T - 2 * DT, T - DT);
    return c1 + 0.5 * wrapAngle(c1 - c2);
  }
  return chord(tl, t - DT / 2, t + DT / 2);
}

function speedBetween(tl: Timeline, t0: number, t1: number): number {
  if (t1 <= t0) return 0;
  const a = tl.root(t0);
  const b = tl.root(t1);
  return Math.hypot(b.x - a.x, b.z - a.z) / (t1 - t0);
}

export type IceEnd = IceState & { speed: number; roll: number; facingBackward: boolean; yaw: number };

/** Where a timeline begins, which way it travels and how fast, and whether the skater faces away from that travel (skating backward). */
export function startOf(tl: Timeline): IceEnd {
  const r = tl.root(0);
  const t1 = Math.min(tl.duration, DT);
  const heading = travel(tl, 0);
  return { x: r.x, z: r.z, heading, speed: speedBetween(tl, 0, t1), roll: r.roll ?? 0, yaw: r.yaw, facingBackward: Math.abs(wrapAngle(r.yaw - heading)) > Math.PI / 2 };
}

/** Where a timeline ends, which way it is travelling then and how fast. */
export function endOf(tl: Timeline): IceEnd {
  const r = tl.root(tl.duration);
  const t0 = Math.max(0, tl.duration - DT);
  const heading = travel(tl, tl.duration);
  return { x: r.x, z: r.z, heading, speed: speedBetween(tl, t0, tl.duration), roll: r.roll ?? 0, yaw: r.yaw, facingBackward: Math.abs(wrapAngle(r.yaw - heading)) > Math.PI / 2 };
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
/** One stroke (push and glide) on each foot at stroking speed, seconds. */
export const STROKE_PERIOD = 0.9;
/** How hard the skater pushes to speed up and how hard she can brake, metres per second squared. */
export const ACCEL = 2.5;
export const BRAKE = 6;
const G = 9.81;
/** The steepest edge lean steering may ask for (a turn at speed leans the body by atan(v·ω/g)). */
export const LEAN_MAX = (35 * Math.PI) / 180;

/** The briskest turn a skater makes however slowly she is moving, radians per second: a step turn at the boards, not a pirouette. */
export const TURN_RATE_MAX = 1.6;

/** The fastest turn (radians per second) at `speed`: the lean stays within LEAN_MAX and the rate within TURN_RATE_MAX. */
export function maxTurnRate(speed: number): number {
  return Math.min(TURN_RATE_MAX, (G * Math.tan(LEAN_MAX)) / Math.max(speed, 1));
}

/** The turn rate `rate` limited so the lean at `speed` stays within LEAN_MAX. */
export function clampRate(rate: number, speed: number): number {
  return Math.sign(rate) * Math.min(Math.abs(rate), maxTurnRate(speed));
}

/** Metres needed to brake to a standstill from `speed`. */
export function brakingDistance(speed: number): number {
  return (speed * speed) / (2 * BRAKE);
}

/** The tightest arc a skater can hold at `speed`: v / maxTurnRate, so v²/(g·tan θ) when the lean limits her (about 7 m sprinting) and v/TURN_RATE_MAX when the step-turn rate does (about 2 m stroking). */
export function minRadius(speed: number): number {
  return Math.max(0.05, speed / maxTurnRate(speed));
}

/**
 * True when the skater at `p`, moving at `speed`, can carry on turning at full lean to at least
 * one side without leaving the ice: the circle of the tightest arc, tangent to her heading, lies
 * inside the boards. A steered segment is only accepted when it ends in such a state, so she is
 * never boxed in and never asked for a tighter arc than the lean allows.
 */
export function canTurnAway(p: IcePoint, speed: number, margin = EDGE_MARGIN): boolean {
  const R = minRadius(speed);
  const lx = Math.cos(p.heading);
  const lz = -Math.sin(p.heading);
  // a few millimetres of slack: the circle a later segment follows is integrated, not analytic
  return insideRink(p.x + R * lx, p.z + R * lz, margin + R + 0.005) || insideRink(p.x - R * lx, p.z - R * lz, margin + R + 0.005);
}

export interface LinkOptions {
  /** Change of heading over the link, radians (positive turns left, like yaw). */
  turn?: number;
  seconds?: number;
  /** Stroke backward (facing away from the travel) through the link. */
  backward?: boolean;
  /** The facing the next element needs at the end; a half turn in the last half second gets there. Defaults to `backward`. */
  endBackward?: boolean;
  /** The next element's first pose, blended into over the last half second. */
  endPose?: Pose;
  /** Metres per second to settle at; STROKE_SPEED by default. */
  speed?: number;
  /** Ramp the speed from `from.speed` (default); false jumps straight to `speed`. */
  ramp?: boolean;
  /** Which shoulder to look over when skating backward. */
  look?: "L" | "R";
}

/** A stroking link carries its stroke cycle so the next link can continue it. */
export interface LinkTimeline extends Timeline {
  period: number;
  cycleStart: number;
  phaseSeconds: number;
}

/** Strokes into the two-stroke cycle (0–2) at time t of a link (0 for anything else). */
export function linkPhaseAt(tl: Timeline, t: number): number {
  const link = tl as Partial<LinkTimeline>;
  if (link.period === undefined || link.cycleStart === undefined || link.phaseSeconds === undefined) return 0;
  const c = (t - link.cycleStart + link.phaseSeconds) / link.period;
  return ((c % 2) + 2) % 2;
}

/**
 * A stroking link that starts at `from` (with its speed, lean and facing), travels on a
 * constant-rate arc through `turn` while the speed ramps to `speed`, leans into the arc, strokes
 * on alternate feet (or coasts when slow), and ends facing the way the next element needs. Used
 * between elements on the rink and for the idle loop.
 */
export function linkTimeline(from: IceState, { turn = 0, seconds = 2, backward = false, endBackward = backward, endPose, speed = STROKE_SPEED, ramp = true, look }: LinkOptions = {}): LinkTimeline {
  const T = Math.max(0.25, seconds);
  const v1 = speed;
  const v0 = ramp ? (from.speed ?? v1) : v1;
  const dv = v1 - v0;
  const acc = dv >= 0 ? ACCEL : -BRAKE;
  const tRamp = Math.abs(dv) / Math.abs(acc);
  const speedAt = (t: number) => (t < tRamp ? v0 + acc * t : v1);
  const w = turn / T;
  const h0 = from.heading;
  const headingAt = (t: number) => h0 + w * t;
  const startBackward = from.facingBackward ?? false;
  const turnIn: [number, number] | null = startBackward !== backward ? [0, Math.min(0.5, T * 0.6)] : null;
  const turnStart = Math.max(T * 0.4, T - 0.6);
  const turnOut: [number, number] | null = endBackward !== backward ? [turnStart, Math.max(turnStart + 0.1, T - 0.2)] : null;
  const f0 = startBackward ? Math.PI : 0;
  const fm = backward ? Math.PI : 0;
  const fe = endBackward ? Math.PI : 0;
  // whatever facing she arrived with (a landing's check-out, say) is eased out rather than snapped
  const residual = from.yaw === undefined ? 0 : wrapAngle(from.yaw - (h0 + f0));
  const yawAt = (t: number) => {
    let yaw = headingAt(t) + f0 + residual * (1 - easeInOut(clamp01(t / 0.4)));
    if (turnIn) yaw += (fm - f0) * easeInOut(clamp01((t - turnIn[0]) / (turnIn[1] - turnIn[0])));
    if (turnOut) yaw += (fe - fm) * easeInOut(clamp01((t - turnOut[0]) / (turnOut[1] - turnOut[0])));
    return yaw;
  };
  // the lean into the arc, eased in from whatever lean the skater arrived with
  const r0 = from.roll ?? 0;
  const rollAt = (t: number) => {
    const h = headingAt(t);
    const s = Math.sign(w);
    const target = rollToward(yawAt(t), s * Math.cos(h), -s * Math.sin(h), Math.atan((speedAt(t) * Math.abs(w)) / G));
    return r0 + (target - r0) * easeInOut(clamp01(t / 0.35));
  };
  // the path: integrate the ramping speed along the turning heading
  const N = Math.max(8, Math.ceil(T * 120));
  const dt = T / N;
  const xs = new Float64Array(N + 1);
  const zs = new Float64Array(N + 1);
  let x = from.x;
  let z = from.z;
  for (let i = 0; i <= N; i++) {
    xs[i] = x;
    zs[i] = z;
    const tm = (i + 0.5) * dt;
    const vm = speedAt(tm);
    const hm = headingAt(tm);
    x += vm * dt * Math.sin(hm);
    z += vm * dt * Math.cos(hm);
  }
  const root = (time: number): RootState => {
    const t = Math.max(0, Math.min(T, time));
    const u = t / dt;
    const i = Math.min(N - 1, Math.floor(u));
    const f = u - i;
    return { x: xs[i] + (xs[i + 1] - xs[i]) * f, y: 0, z: zs[i] + (zs[i + 1] - zs[i]) * f, yaw: yawAt(t), roll: rollAt(t) };
  };
  const strokes = v1 >= STROKE_MIN_SPEED;
  // a sustained curve is skated with crossovers toward its centre (on the skater's left when turning left and facing forward)
  const cross = strokes && Math.abs(w) >= CROSSOVER_RATE ? (w > 0 !== backward ? "L" : "R") : undefined;
  const cycle = strokeKeys({ T, speed: v1, backward, startBackward, endBackward, phase: from.phase ?? 0, turnIn, turnOut, endPose, look, cross });
  const keys = cycle.keys;
  const trace: TraceSample[] = [];
  for (let i = 0; i <= Math.round(T * 40); i++) {
    const t = i / 40;
    const r = root(t);
    const foot = cycle.footAt(t);
    const facingBack = Math.abs(wrapAngle(r.yaw - headingAt(t))) > Math.PI / 2;
    // on an arc the skating foot rides the edge nearer the centre: outside on the inner foot, inside on the outer
    const centreOnLeft = w > 0 !== facingBack;
    const edge = foot === "both" ? "flat" : Math.abs(w) < 1e-6 ? "outside" : (foot === "L") === centreOnLeft ? "outside" : "inside";
    trace.push({ t, x: r.x, z: r.z, foot, edge });
  }
  const gear = strokes ? gearFor(v1) : gearFor(0);
  return {
    id: "link",
    title: `${gear.verb}${backward ? " backward" : ""}`,
    duration: T,
    keys,
    root,
    markers: [{ t: 0, label: `${gear.verb}${backward ? " backward" : ""}`, detail: "← → turn · ↑ ↓ change gear · B skates backward" }],
    trace,
    focus: { x: from.x, z: from.z },
    heading: h0,
    period: cycle.period,
    cycleStart: cycle.cycleStart,
    phaseSeconds: cycle.phaseSeconds,
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

/** Where the skater is at time t, which way she is travelling, how fast, her lean, her facing and her stroke phase. */
export function pointAt(tl: Timeline, t: number): IceEnd & { phase: number } {
  const r = tl.root(t);
  const t0 = Math.max(0, Math.min(tl.duration - DT, t));
  const t1 = Math.min(tl.duration, t0 + DT);
  const heading = travel(tl, t);
  return { x: r.x, z: r.z, heading, speed: speedBetween(tl, t0, t1), roll: r.roll ?? 0, yaw: r.yaw, facingBackward: Math.abs(wrapAngle(r.yaw - heading)) > Math.PI / 2, phase: linkPhaseAt(tl, t) };
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
