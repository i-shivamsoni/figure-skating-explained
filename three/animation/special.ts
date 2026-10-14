import { POSES } from "../rig/poses";
import { clamp01, easeIn, easeInOut, easeOut, headingOf, linear, TWO_PI, type RootState, type Timeline, type TraceSample } from "./timeline";

export type SpecialId = "split-jump" | "walley" | "inside-axel" | "backflip";

interface SpecialSpec {
  label: string;
  detail: string;
  /** Revolutions about the vertical axis in the air. */
  turns: number;
  /** Somersault revolutions (backflip). */
  flips: number;
  forwardTakeoff: boolean;
  /** +1 curves the entry against the rotation (Walley), -1 with it. */
  entrySign: 1 | -1;
  takeOffFoot: "L" | "R";
  takeOffEdge: "outside" | "inside";
  toePick: boolean;
  airPose: string;
  airTime: number;
  /** Lands forward (half-revolution jumps). */
  landsForward: boolean;
}

export const SPECIALS: Record<SpecialId, SpecialSpec> = {
  "split-jump": { label: "Split jump", detail: "a toe-assisted half-revolution jump with a full split in the air; not a listed jump, so it has no value and can decorate a step sequence", turns: 0.5, flips: 0, forwardTakeoff: false, entrySign: -1, takeOffFoot: "L", takeOffEdge: "inside", toePick: true, airPose: "splitAir", airTime: 0.5, landsForward: true },
  walley: { label: "Walley", detail: "an edge jump from the right back inside edge, rotating against the curve like a Lutz; not listed, so it is not called (a toe Walley is called as a toe loop)", turns: 1, flips: 0, forwardTakeoff: false, entrySign: 1, takeOffFoot: "R", takeOffEdge: "inside", toePick: false, airPose: "tuck", airTime: 0.42, landsForward: false },
  "inside-axel": { label: "Inside Axel", detail: "an Axel-type jump from the forward inside edge; the handbook lists it among non-listed jumps whatever its rotations, so it never counts as a jump element", turns: 1.5, flips: 0, forwardTakeoff: true, entrySign: -1, takeOffFoot: "R", takeOffEdge: "inside", toePick: false, airPose: "tuck", airTime: 0.45, landsForward: false },
  backflip: { label: "Backflip", detail: "a backward somersault from two feet; illegal only in Novice since 2024, with a 2.0 deduction there. Senior and Junior judges reflect it in Composition, it is not an element", turns: 0, flips: 1, forwardTakeoff: false, entrySign: -1, takeOffFoot: "L", takeOffEdge: "flat" as never, toePick: false, airPose: "flipTuck", airTime: 0.85, landsForward: false },
};

const SPEED = 4.0;
const RADIUS = 7;
const G = 9.81;
const APPROACH = 1.3;
const LOAD = 0.4;
const LAND = 0.55;
const EXIT = 1.1;

/** Non-listed jumps and the backflip, built like a listed jump but without a Scale of Values code. */
export function specialTimeline(id: SpecialId): Timeline {
  const spec = SPECIALS[id];
  const T = spec.airTime;
  const tLoad = APPROACH;
  const tTakeoff = APPROACH + LOAD;
  const tLand = tTakeoff + T;
  const tExit = tLand + LAND;
  const duration = tExit + EXIT;
  const D = SPEED * T * 0.9;
  const H = spec.flips ? (G * T * T) / 8 + 0.15 : (G * T * T) / 8;
  const entryCentreZ = spec.entrySign * RADIUS;
  const yawBack = headingOf(-1, 0);
  const yawFwd = headingOf(1, 0);
  const pre = spec.flips ? 0 : 0.4;
  const facingOut = spec.forwardTakeoff ? yawFwd : yawBack;

  const root = (t: number): RootState => {
    if (t < tTakeoff) {
      const phi = ((t - tTakeoff) * SPEED) / RADIUS;
      const x = RADIUS * Math.sin(phi);
      const z = entryCentreZ - spec.entrySign * RADIUS * Math.cos(phi);
      const tangent = -spec.entrySign * phi;
      const load = clamp01((t - tLoad) / LOAD);
      return { x, y: 0, z, yaw: facingOut + tangent + pre * easeIn(load) };
    }
    if (t < tLand) {
      const u = (t - tTakeoff) / T;
      const pitch = spec.flips ? -spec.flips * TWO_PI * easeInOut(u) : 0;
      return { x: D * u, y: H * 4 * u * (1 - u) + (spec.flips ? 0.25 * Math.sin(Math.PI * u) : 0), z: 0, yaw: facingOut + pre + spec.turns * TWO_PI * u, pitch };
    }
    const s = (t - tLand) * SPEED * 0.9;
    const phi = s / RADIUS;
    const exitSign = spec.landsForward ? 1 : -1;
    const x = D + RADIUS * Math.sin(phi);
    const checkOut = easeInOut(clamp01((t - tLand - 0.1) / 0.5));
    const yaw = facingOut + pre + spec.turns * TWO_PI - pre * checkOut + (spec.landsForward ? -phi : phi);
    return { x, y: 0, z: exitSign === 1 ? RADIUS - RADIUS * Math.cos(phi) : -RADIUS + RADIUS * Math.cos(phi), yaw };
  };

  const glide = spec.forwardTakeoff ? POSES.glideFO : POSES.glideBO;
  const prep = spec.toePick ? POSES.pickBack : spec.forwardTakeoff ? POSES.loadFO : POSES.loadBO;
  const landPose = spec.landsForward ? POSES.glideFO : POSES.land;
  const keys = [
    { t: 0, pose: glide },
    { t: tLoad - 0.2, pose: glide },
    { t: tLoad + LOAD * 0.55, pose: prep, ease: easeInOut },
    { t: tTakeoff, pose: POSES.launch, ease: easeOut },
    { t: tTakeoff + T * 0.3, pose: POSES[spec.airPose], ease: easeOut },
    { t: tLand - T * 0.2, pose: POSES[spec.airPose], ease: linear },
    { t: tLand, pose: POSES.open, ease: easeOut },
    { t: tLand + 0.14, pose: landPose, ease: easeOut },
    { t: tExit + 0.5, pose: spec.landsForward ? POSES.glideFO : POSES.glideBO, ease: easeInOut },
    { t: duration, pose: spec.landsForward ? POSES.glideFO : POSES.glideBO, ease: linear },
  ];
  const trace: TraceSample[] = [];
  for (let t = 0; t < tTakeoff; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: spec.flips ? "both" : spec.takeOffFoot, edge: spec.flips ? "flat" : spec.takeOffEdge });
  }
  if (spec.toePick) trace.push({ t: tTakeoff, x: -0.35, z: -0.12, foot: "R", edge: "toe" });
  for (let t = tLand; t <= duration; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: spec.flips ? "both" : "R", edge: spec.flips ? "flat" : "outside" });
  }
  const markers = [
    { t: 0, label: "Entry", detail: spec.flips ? "backward on two feet" : `${spec.takeOffFoot === "L" ? "left" : "right"} ${spec.forwardTakeoff ? "forward" : "backward"} ${spec.takeOffEdge} edge` },
    { t: tLoad, label: "Preparation", detail: spec.toePick ? "toe pick reaches back" : "knee bend" },
    { t: tTakeoff, label: spec.label, detail: spec.detail },
    { t: tLand, label: "Landing", detail: spec.landsForward ? "forward, on the other foot" : spec.flips ? "two feet, backward" : "right back outside edge" },
  ];
  return {
    id,
    title: spec.label,
    duration,
    keys,
    root,
    markers,
    trace,
    rotation: spec.turns ? { start: tTakeoff, end: tLand, turns: spec.turns, nominal: spec.turns } : undefined,
    focus: { x: D / 2, z: 0 },
    heading: 0,
  };
}
