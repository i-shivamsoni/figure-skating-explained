import { createStore } from "zustand";
import { buildTimeline, captionFor, toElementSpecs, type ViewerSpec } from "./catalog";
import { brakingDistance, clampRate, EDGE_MARGIN, endOf, extentOf, keepInRink, linkPhaseAt, linkTimeline, placeTimeline, placementAfter, roomAhead, startOf, STROKE_SPEED, wrapAngle, type IcePoint, type IceState, type LinkOptions, type LinkTimeline } from "./place";
import { GEAR_BY_ID, gearFor, shiftGear, type Gear } from "./stroking";
import { headingOf } from "./timeline";
import { insideRink } from "./rinkSize";
import type { Timeline } from "./timeline";
import { validateProgram, type Warning } from "@/lib/scoring/validate";
import { round2 } from "@/lib/scoring/sov";
import type { SkaterVariant } from "../skaterStore";

/**
 * The freeplay rink's program: elements the visitor asks for are queued, each one is joined to
 * the previous by a stroking link that turns to stay on the ice, and between elements the skater
 * wanders. The player drives the clock and calls `advance` when a segment ends.
 */
export type PlayKind = "idle" | "link" | "element";

export interface Playing {
  kind: PlayKind;
  timeline: Timeline;
  spec?: ViewerSpec;
  caption?: string;
  value?: number;
}

export interface Performed {
  id: number;
  spec: ViewerSpec;
  timeline: Timeline;
  caption: string;
  value?: number;
}

/** Left of centre ice, skating along the long axis. */
export const CENTRE_ICE: IcePoint = { x: -8, z: 0, heading: Math.PI / 2 };
/** How many finished segments keep their traces on the ice. */
export const MAX_MARKS = 40;

/** Steering while the skater is stroking between elements (arrow keys or the pad on the rink). */
export interface Steer {
  /** Turn rate in radians per second; positive turns to the travel's left. */
  rate: number;
  /** Stroking speed in metres per second (the gears in ./stroking give the named speeds). */
  speed: number;
  /** Skate backward. */
  backward: boolean;
}

export const STEER_RATE = 1.1;
/** Length of one steered stroking segment. */
const STEER_SECONDS = 0.8;

export interface ProgramState {
  /** Where the skater will be, and how she will be moving, when the current segment ends. */
  position: IceState;
  steer: Steer;
  /** Bumps whenever the steering changes, so the player can cut the current wander short. */
  steerVersion: number;
  playing: Playing;
  /** The element the current link leads to. */
  pending: ViewerSpec | null;
  queue: ViewerSpec[];
  history: Performed[];
  /** Finished segments whose traces stay on the ice until it is resurfaced. */
  marks: Timeline[];
  /** The palette's rotation choice, shared with the hotkeys. */
  rotations: number;
  wander: 1 | -1;
  nextId: number;
  perform: (spec: ViewerSpec) => void;
  removeQueued: (index: number) => void;
  /** The current segment ended (or is cut short at `now`): start the next one. */
  advance: (now?: IceState) => void;
  setRotations: (n: number) => void;
  setSteer: (rate: number, speed: number, backward?: boolean) => void;
  /** Pick a gear by name, or step up (+1) / down (−1) from the current one. */
  setGear: (gear: Gear | 1 | -1) => void;
  setBackward: (backward: boolean) => void;
  resurface: () => void;
  reset: (at?: IcePoint) => void;
}

/**
 * How long a stroking turn takes: comfortable when there is room, tighter near the boards so the
 * arc (which reaches STROKE_SPEED·T/|turn| metres along the old heading) stays on the ice.
 */
const BOARD_CLEARANCE = EDGE_MARGIN + 0.3;

function turnSeconds(p: IcePoint, turn: number, comfortable: number, speed = STROKE_SPEED): number {
  const a = Math.abs(turn);
  if (a < 1e-6) return comfortable;
  // the arc reaches R·sin(φ) along the old heading and R·(1 − cos φ) to the side it turns to
  const ahead = Math.max(0.3, roomAhead(p, p.heading, 0) - BOARD_CLEARANCE);
  const side = Math.max(0.3, roomAhead(p, p.heading + Math.sign(turn) * (Math.PI / 2), 0) - BOARD_CLEARANCE);
  const radiusMax = Math.min(ahead / Math.sin(Math.min(a, Math.PI / 2)), side / (1 - Math.cos(Math.min(a, Math.PI))));
  return Math.max(0.6, Math.min(comfortable, (radiusMax * a) / speed));
}

/** Past this lean a tighter arc is not an option: the link slows down instead. */
const LEAN_HARD = (50 * Math.PI) / 180;

/** A stroking link that stays on the ice right up to the boards: the arc is tightened until every trace sample is inside (corners defeat the straight-line guards), slowing down before the lean gets absurd. */
function safeLink(at: IceState, opts: LinkOptions & { turn: number; seconds: number }): LinkTimeline {
  const onIce = (tl: Timeline) => tl.trace.every((t) => insideRink(t.x, t.z, EDGE_MARGIN));
  // tighten the arc; when even the tightest arc at this speed would cross the boards (nose to the
  // glass), slow right down and turn almost on the spot
  const first = opts.speed ?? STROKE_SPEED;
  for (const speed of [first, ...[2.0, 1.2, 0.7, 0.4].filter((v) => v < first)]) {
    let link = linkTimeline(at, { ...opts, speed });
    if (onIce(link)) return link;
    for (let seconds = opts.seconds * 0.8; seconds >= 0.25; seconds *= 0.8) {
      if (Math.atan((speed * Math.abs(opts.turn)) / seconds / 9.81) > LEAN_HARD) break;
      link = linkTimeline(at, { ...opts, speed, seconds });
      if (onIce(link)) return link;
    }
  }
  return linkTimeline(at, { ...opts, speed: 0.4, seconds: 0.25, ramp: false });
}

const NO_STEER: Steer = { rate: 0, speed: STROKE_SPEED, backward: false };

/** Skating backward she looks over the shoulder on the inside of the turn (the right one on a straight). */
const lookFor = (turn: number): "L" | "R" => (turn < -1e-6 ? "L" : "R");

/** Beyond this distance from centre ice the unsteered wander drifts back toward the middle; steering overrides it, right up to the boards. */
const HOME_RADIUS = 13;

/** True when the whole root path and trace of a placed timeline (both skaters) stay on the ice. */
export function staysOnIce(tl: Timeline, margin = EDGE_MARGIN): boolean {
  for (const sample of tl.trace) if (!insideRink(sample.x, sample.z, margin)) return false;
  for (let i = 0; i <= 60; i++) {
    const r = tl.root((tl.duration * i) / 60);
    if (!insideRink(r.x, r.z, margin)) return false;
    if (tl.partner) {
      const q = tl.partner.root((tl.duration * i) / 60);
      if (!insideRink(q.x, q.z, margin)) return false;
    }
  }
  return true;
}

/**
 * The stroking link into an element: the smallest turn (trying the current heading, then toward
 * centre ice, then every 15°) after which the element's real path, placed at the link's end, stays
 * on the ice; the heading with the most room is the fallback.
 */
function linkInto(position: IceState, tl: Timeline, steer: Steer): LinkTimeline {
  const start = startOf(tl);
  // arrive at the speed the element was authored for (a sprint slows down for a jump entry, a crawl picks up)
  const speed = Math.min(6, Math.max(1.5, start.speed));
  const comfortable = (turn: number) => 1.6 + Math.abs(turn) * 0.8;
  const make = (turn: number) =>
    safeLink(position, { turn, seconds: turnSeconds(position, turn, comfortable(turn), speed), speed, backward: steer.backward, endBackward: start.facingBackward, endPose: tl.keys[0]?.pose, look: lookFor(turn) });
  const candidates = [0, wrapAngle(headingOf(-position.x, -position.z) - position.heading), ...Array.from({ length: 24 }, (_, i) => wrapAngle((i * Math.PI) / 12))].sort((a, b) => Math.abs(a) - Math.abs(b));
  const tried = new Set<number>();
  for (const turn of candidates) {
    const key = Math.round(turn * 100);
    if (tried.has(key)) continue;
    tried.add(key);
    const link = make(turn);
    if (!staysOnIce(link)) continue;
    const placed = placeTimeline(tl, placementAfter(tl, endOf(link)));
    if (staysOnIce(placed)) return link;
  }
  return make(keepInRink(position, 8 + extentOf(tl)).turn);
}

function idle(at: IceState, wander: 1 | -1, steer: Steer = NO_STEER): Playing {
  const speed = steer.speed;
  const steered = steer.rate !== 0 || speed !== STROKE_SPEED;
  // steering may take her to the boards: the next segment's length, the distance to brake and one tight turn are reserved
  const ahead = steered ? speed * STEER_SECONDS + brakingDistance(speed) + 0.8 : 10;
  const k = keepInRink(at, ahead);
  const seconds = steered ? STEER_SECONDS : 3;
  let free = wander * 0.5;
  if (!steered && Math.hypot(at.x, at.z) > HOME_RADIUS) {
    const home = wrapAngle(headingOf(-at.x, -at.z) - at.heading);
    free = Math.sign(home || 1) * Math.min(0.6, Math.abs(home));
  }
  const turn = k.turn || (steered ? clampRate(steer.rate, speed) * seconds : free);
  return { kind: "idle", timeline: safeLink(at, { turn, seconds: turnSeconds(at, turn, seconds, speed), speed, backward: steer.backward, look: lookFor(turn) }) };
}

export function createProgramStore(start: IcePoint = CENTRE_ICE) {
  return createStore<ProgramState>((set, get) => ({
    position: start,
    steer: NO_STEER,
    steerVersion: 0,
    playing: idle(start, 1),
    pending: null,
    queue: [],
    history: [],
    marks: [],
    rotations: 3,
    wander: -1,
    nextId: 1,
    perform: (spec) => set((s) => ({ queue: [...s.queue, spec] })),
    removeQueued: (index) => set((s) => ({ queue: s.queue.filter((_, i) => i !== index) })),
    setRotations: (rotations) => set({ rotations }),
    setSteer: (rate, speed, backward) =>
      set((s) => {
        const back = backward ?? s.steer.backward;
        return s.steer.rate === rate && s.steer.speed === speed && s.steer.backward === back ? {} : { steer: { rate, speed, backward: back }, steerVersion: s.steerVersion + 1 };
      }),
    setGear: (gear) => {
      const s = get();
      const id = typeof gear === "number" ? shiftGear(gearFor(s.steer.speed).id, gear) : gear;
      s.setSteer(s.steer.rate, GEAR_BY_ID[id].speed);
    },
    setBackward: (backward) => {
      const s = get();
      s.setSteer(s.steer.rate, s.steer.speed, backward);
    },
    advance: (now) => {
      const s = get();
      const done = s.playing;
      const position: IceState = now ?? { ...endOf(done.timeline), phase: done.kind === "element" ? 0 : linkPhaseAt(done.timeline, done.timeline.duration) };
      const marks = [...s.marks, done.timeline].slice(-MAX_MARKS);
      const performed = done.kind === "element" && done.spec;
      const history = performed ? [...s.history, { id: s.nextId, spec: done.spec!, timeline: done.timeline, caption: done.caption ?? "", value: done.value }] : s.history;
      const nextId = performed ? s.nextId + 1 : s.nextId;
      if (s.pending) {
        const tl = buildTimeline(s.pending);
        const placed = placeTimeline(tl, placementAfter(tl, position));
        const { caption, value } = captionFor(s.pending);
        set({ position, marks, history, nextId, pending: null, playing: { kind: "element", timeline: placed, spec: s.pending, caption, value } });
        return;
      }
      if (s.queue.length > 0) {
        const [next, ...queue] = s.queue;
        const tl = buildTimeline(next);
        const link = linkInto(position, tl, s.steer);
        set({ position, marks, history, nextId, queue, pending: next, playing: { kind: "link", timeline: link, caption: `Next: ${captionFor(next).caption}` } });
        return;
      }
      set({ position, marks, history, nextId, wander: s.wander === 1 ? -1 : 1, playing: idle(position, s.wander, s.steer) });
    },
    resurface: () => set({ marks: [] }),
    reset: (at = start) => set({ position: at, steer: NO_STEER, playing: idle(at, 1), pending: null, queue: [], history: [], marks: [], wander: -1, nextId: 1 }),
  }));
}

export type ProgramStore = ReturnType<typeof createProgramStore>;

/** Technical score of what was performed, every element at GOE 0. */
export function programTotal(history: Performed[]): number {
  return round2(history.reduce((sum, h) => sum + (h.value ?? 0), 0));
}

/**
 * Rule checks over what was performed, as a Free Skating of the chosen body (pairs rules once a
 * pair element is in). Only the errors are kept, minus the whole-program requirement of an
 * Axel-type jump, which does not apply to freeplay.
 */
export function programWarnings(history: Performed[], variant: SkaterVariant): Warning[] {
  const elements = history.flatMap((h) => toElementSpecs(h.spec));
  if (elements.length === 0) return [];
  const pairs = elements.some((e) => e.kind === "code");
  return validateProgram({ segment: "freeSkating", category: pairs ? "seniorPairs" : variant === "male" ? "seniorMen" : "seniorWomen", elements }).filter((w) => w.severity === "error" && !/^No Axel-type/.test(w.message));
}
