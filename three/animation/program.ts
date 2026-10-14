import { createStore } from "zustand";
import { buildTimeline, captionFor, toElementSpecs, type ViewerSpec } from "./catalog";
import { endOf, extentOf, keepInRink, linkTimeline, placeTimeline, placementAfter, roomAhead, startOf, STROKE_SPEED, wrapAngle, type IcePoint, type LinkOptions } from "./place";
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

/** Arrow-key steering while the skater is stroking between elements. */
export interface Steer {
  /** Turn rate in radians per second; positive turns to the skater's left. */
  rate: number;
  /** Stroking speed in metres per second. */
  speed: number;
}

export const STEER_RATE = 1.1;
export const SPEED_FAST = STROKE_SPEED * 1.4;
export const SPEED_SLOW = 1.3;
/** Length of one steered stroking segment. */
const STEER_SECONDS = 0.8;

export interface ProgramState {
  /** Where the skater will be when the current segment ends. */
  position: IcePoint;
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
  advance: (now?: IcePoint) => void;
  setRotations: (n: number) => void;
  setSteer: (rate: number, speed: number) => void;
  resurface: () => void;
  reset: (at?: IcePoint) => void;
}

/**
 * How long a stroking turn takes: comfortable when there is room, tighter near the boards so the
 * arc (which reaches STROKE_SPEED·T/|turn| metres along the old heading) stays on the ice.
 */
const BOARD_CLEARANCE = 1.5;

function turnSeconds(p: IcePoint, turn: number, comfortable: number): number {
  const a = Math.abs(turn);
  if (a < 1e-6) return comfortable;
  // the arc reaches R·sin(φ) along the old heading and R·(1 − cos φ) to the side it turns to
  const ahead = Math.max(0.3, roomAhead(p, p.heading, 0) - BOARD_CLEARANCE);
  const side = Math.max(0.3, roomAhead(p, p.heading + Math.sign(turn) * (Math.PI / 2), 0) - BOARD_CLEARANCE);
  const radiusMax = Math.min(ahead / Math.sin(Math.min(a, Math.PI / 2)), side / (1 - Math.cos(Math.min(a, Math.PI))));
  return Math.max(0.6, Math.min(comfortable, (radiusMax * a) / STROKE_SPEED));
}

/** A stroking link that stays at least a metre inside the boards: the arc is tightened until every trace sample is on the ice (corners defeat the straight-line guards). */
function safeLink(at: IcePoint, opts: LinkOptions & { turn: number; seconds: number }): Timeline {
  let link = linkTimeline(at, opts);
  for (let seconds = opts.seconds * 0.8; seconds >= 0.6 && !link.trace.every((t) => insideRink(t.x, t.z, 1)); seconds *= 0.8) link = linkTimeline(at, { ...opts, seconds });
  return link;
}

const NO_STEER: Steer = { rate: 0, speed: STROKE_SPEED };

/** Beyond this distance from centre ice the unsteered wander turns back toward the middle. */
const HOME_RADIUS = 9;

function idle(at: IcePoint, wander: 1 | -1, steer: Steer = NO_STEER): Playing {
  const steered = steer.rate !== 0 || steer.speed !== STROKE_SPEED;
  const ahead = steered ? 6 : 12;
  const k = keepInRink(at, ahead);
  const seconds = steered ? STEER_SECONDS : 3;
  let free = wander * 0.5;
  if (!steered && Math.hypot(at.x, at.z) > HOME_RADIUS) {
    const home = wrapAngle(headingOf(-at.x, -at.z) - at.heading);
    free = Math.sign(home || 1) * Math.min(0.6, Math.abs(home));
  }
  const turn = k.turn || (steered ? steer.rate * seconds : free);
  return { kind: "idle", timeline: safeLink(at, { turn, seconds: turnSeconds(at, turn, seconds), speed: steer.speed }) };
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
    setSteer: (rate, speed) =>
      set((s) => (s.steer.rate === rate && s.steer.speed === speed ? {} : { steer: { rate, speed }, steerVersion: s.steerVersion + 1 })),
    advance: (now) => {
      const s = get();
      const done = s.playing;
      const position = now ?? endOf(done.timeline);
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
        const k = keepInRink(position, 8 + extentOf(tl));
        const link = safeLink(position, { turn: k.turn, seconds: turnSeconds(position, k.turn, 1.6 + Math.abs(k.turn) * 0.8), endBackward: startOf(tl).facingBackward, endPose: tl.keys[0]?.pose });
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
