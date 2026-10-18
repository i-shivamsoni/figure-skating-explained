import { strokePose, type StrokeFoot, type StrokeShape } from "../rig/poses-stroking";
import type { Pose } from "../rig/pose";
import { easeInOut, type PoseKey } from "./timeline";

/**
 * Gears: how the skater strokes between elements. Each one is a speed, a cadence and a body
 * shape (see StrokeShape). Coasting is a two-foot glide; stroking, running and sprinting push
 * on alternate feet with deeper knees, a lower trunk and busier arms the faster they go.
 */
export type Gear = "coast" | "stroke" | "run" | "sprint";

export interface GearSpec extends StrokeShape {
  id: Gear;
  label: string;
  /** What the HUD calls it while it happens. */
  verb: string;
  hint: string;
  /** Metres per second. */
  speed: number;
  /** One stroke (push and glide) on each foot, seconds. */
  period: number;
}

export const GEARS: GearSpec[] = [
  { id: "coast", label: "Coast", verb: "Coasting", hint: "Glide on two feet", speed: 1.3, period: 1.2, knee: 12, torso: 4, reach: 0, push: 0, arms: "out" },
  { id: "stroke", label: "Stroke", verb: "Stroking", hint: "Easy stroking", speed: 3.5, period: 0.9, knee: 36, torso: 10, reach: 40, push: 22, arms: "out" },
  { id: "run", label: "Run", verb: "Running", hint: "Progressive runs: quicker, deeper strokes", speed: 5.2, period: 0.7, knee: 50, torso: 18, reach: 46, push: 25, arms: "low" },
  { id: "sprint", label: "Sprint", verb: "Sprinting", hint: "Flat out: deep knees, arms pumping", speed: 7, period: 0.55, knee: 64, torso: 30, reach: 52, push: 28, arms: "swing" },
];

export const GEAR_BY_ID = Object.fromEntries(GEARS.map((g) => [g.id, g])) as Record<Gear, GearSpec>;

/** Below this speed the skater coasts on two feet instead of stroking. */
export const STROKE_MIN_SPEED = 2.1;

/** The gear whose speed is nearest to `speed`. */
export function gearFor(speed: number): GearSpec {
  let best = GEARS[0];
  for (const g of GEARS) if (Math.abs(g.speed - speed) < Math.abs(best.speed - speed)) best = g;
  return best;
}

/** The next gear up (+1) or down (−1), staying within the range. */
export function shiftGear(gear: Gear, step: 1 | -1): Gear {
  const i = GEARS.findIndex((g) => g.id === gear);
  return GEARS[Math.max(0, Math.min(GEARS.length - 1, i + step))].id;
}

export interface StrokeKeysOptions {
  /** Length of the link, seconds. */
  T: number;
  /** Target speed, which picks the gear and the shape. */
  speed: number;
  /** Stroking backward. */
  backward: boolean;
  /** How the skater faces at t = 0 and at t = T. */
  startBackward: boolean;
  endBackward: boolean;
  /** Strokes into the two-stroke cycle at t = 0 (0 ≤ phase < 2: a left stroke, then a right), so stroking carries on across consecutive links. */
  phase: number;
  /** The half turn that changes the facing at the start / at the end, if any. */
  turnIn: [number, number] | null;
  turnOut: [number, number] | null;
  /** The next element's first pose, blended into over the last half second. */
  endPose?: Pose;
  /** Which shoulder to look over when skating backward. */
  look?: "L" | "R";
  /** Crossovers: the side (in the skater's frame) the circle's centre is on. */
  cross?: "L" | "R";
}

/** Turn rate (radians per second) from which the strokes on a curve become crossovers. */
export const CROSSOVER_RATE = 0.45;

export interface StrokeCycle {
  keys: PoseKey[];
  period: number;
  /** Link time at which the cycle is `phaseSeconds` into its two-stroke cycle. */
  cycleStart: number;
  phaseSeconds: number;
  /** The skating foot at link time t ("both" while coasting or turning). */
  footAt: (t: number) => StrokeFoot;
}

const COAST = GEAR_BY_ID.coast;

/** The pose keys of a stroking link; see linkTimeline. */
export function strokeKeys({ T, speed, backward, startBackward, endBackward, phase, turnIn, turnOut, endPose, look, cross }: StrokeKeysOptions): StrokeCycle {
  const gear = speed >= STROKE_MIN_SPEED ? gearFor(speed) : COAST;
  const strokes = gear.id !== "coast";
  const P = gear.period;
  const coastPose = (back: boolean) => strokePose({ ...COAST, foot: "both", backward: back, look });
  const recover = strokePose({ ...gear, foot: "both", backward, look, cross });
  const glides = [strokePose({ ...gear, foot: "L", backward, look, cross }), strokePose({ ...gear, foot: "R", backward, look, cross })];
  const pushes = [strokePose({ ...gear, foot: "L", backward, look, cross, stage: "push" }), strokePose({ ...gear, foot: "R", backward, look, cross, stage: "push" })];
  const cycleStart = turnIn ? turnIn[1] : 0;
  const phase0 = turnIn ? 0 : (((phase % 2) + 2) % 2) * P;
  const cycleTime = (t: number) => t - cycleStart + phase0;
  const footAt = (t: number): StrokeFoot => {
    const c = cycleTime(t);
    if (!strokes || c < 0) return "both";
    return Math.floor(c / P) % 2 === 0 ? "L" : "R";
  };
  // where the stroking stops: the start of the half turn out, or half a second before an element
  const settle = turnOut ? turnOut[0] : endPose ? Math.max(cycleStart + 0.05, T - 0.5) : Infinity;
  const keys: PoseKey[] = [];
  if (turnIn) {
    keys.push({ t: 0, pose: coastPose(startBackward) });
    keys.push({ t: cycleStart, pose: strokes ? recover : coastPose(backward), ease: easeInOut });
  }
  if (strokes) {
    // push along the ice, lift into the glide, hold, recover: the cycle continues past both ends so that consecutive links share a pose at the seam
    const kFirst = Math.floor(-phase0 / P) - 1;
    for (let k = kFirst; ; k++) {
      const base = cycleStart - phase0 + k * P;
      if (base > Math.min(T, settle) + P) break;
      const i = ((k % 2) + 2) % 2;
      const stroke: PoseKey[] = [
        { t: base, pose: recover, ease: easeInOut },
        { t: base + 0.3 * P, pose: pushes[i], ease: easeInOut },
        { t: base + 0.45 * P, pose: glides[i], ease: easeInOut },
        { t: base + 0.7 * P, pose: glides[i], ease: easeInOut },
      ];
      for (const key of stroke) {
        if (turnIn && key.t <= cycleStart) continue;
        if (key.t > settle - 0.05) continue;
        keys.push(key);
      }
    }
  } else if (!turnIn) keys.push({ t: 0, pose: coastPose(backward) });
  if (turnOut) {
    keys.push({ t: turnOut[0], pose: coastPose(backward), ease: easeInOut });
    keys.push({ t: turnOut[1], pose: coastPose(endBackward), ease: easeInOut });
  } else if (endPose && strokes) keys.push({ t: settle, pose: recover, ease: easeInOut });
  if (endPose) keys.push({ t: T, pose: endPose, ease: easeInOut });
  keys.sort((a, b) => a.t - b.t);
  return { keys, period: P, cycleStart, phaseSeconds: phase0, footAt };
}
