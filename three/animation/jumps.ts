import type { JumpType } from "@/data/types";
import { POSES } from "../rig/poses";
import { mergePoses, type Pose } from "../rig/pose";
import { clamp01, easeIn, easeInOut, easeOut, headingOf, linear, TWO_PI, type RootState, type Timeline, type TraceSample } from "./timeline";

export type RotationCall = "" | "q" | "<" | "<<";

export interface JumpParams {
  jump: JumpType;
  rotations: number;
  call?: RotationCall;
}

/** Time in the air by nominal rotations (seconds), roughly what elite skaters show. */
const AIR_TIME: Record<number, number> = { 1: 0.42, 2: 0.52, 3: 0.63, 4: 0.72, 5: 0.8 };
const SPEED = 4.2; // m/s along the ice at take-off
const RADIUS = 7; // entry and exit edge radius in metres
const G = 9.81;

/** Fraction of a revolution missing for each call. */
export const MISSING_TURNS: Record<RotationCall, number> = { "": 0, q: 0.25, "<": 0.4, "<<": 0.6 };

const APPROACH = 1.35;
const LOAD = 0.4;
const LAND = 0.55;
const EXIT = 1.1;

export function airTime(rotations: number, axel: boolean): number {
  return (AIR_TIME[rotations] ?? 0.7) + (axel ? 0.03 : 0);
}

/**
 * Builds the timeline of a single jump: approach on the take-off edge, knee bend, flight
 * with the named number of revolutions, landing on the right back outside edge and exit.
 * The take-off point is the origin and the skater travels toward +X.
 */
export function jumpTimeline(p: JumpParams): Timeline {
  const { jump, rotations } = p;
  const call = p.call ?? "";
  const axel = jump.id === "A";
  const forwardTakeoff = jump.takeOff.direction === "forward";
  const counterRotated = jump.id === "Lz";
  const nominal = rotations + (axel ? 0.5 : 0);
  const turns = Math.max(0, nominal - MISSING_TURNS[call]);
  const T = airTime(rotations, axel);
  const tLoad = APPROACH;
  const tTakeoff = APPROACH + LOAD;
  const tLand = tTakeoff + T;
  const tExit = tLand + LAND;
  const duration = tExit + EXIT;
  const D = SPEED * T * 0.9;
  const H = (G * T * T) / 8;

  // entry arc: centre on the -Z side for natural edges, +Z for the counter-rotated Lutz
  const entrySign = counterRotated ? 1 : -1;
  const entryCentreZ = entrySign * RADIUS;
  const arcLen = SPEED * tTakeoff;
  const entryAngle = arcLen / RADIUS;
  const exitCentreZ = -RADIUS; // landing on the right back outside edge curves naturally
  const yawBack = headingOf(-1, 0);
  const yawFwd = headingOf(1, 0);
  const preRotation = axel ? 0.35 : jump.takeOff.toePick ? 0.45 : 0.75; // radians turned on the ice before leaving it
  const missing = (nominal - turns) * TWO_PI;

  const root = (t: number): RootState => {
    if (t < tTakeoff) {
      // position along the entry circle, phi = 0 at take-off
      const phi = ((t - tTakeoff) * SPEED) / RADIUS; // negative before take-off
      const x = RADIUS * Math.sin(-phi) * -1;
      const z = entryCentreZ - entrySign * RADIUS * Math.cos(phi);
      const tangent = -entrySign * phi; // heading drifts as we go round the arc
      const travelYaw = forwardTakeoff ? yawFwd + tangent : yawBack + tangent;
      const load = clamp01((t - tLoad) / LOAD);
      return { x, y: 0, z, yaw: travelYaw + preRotation * easeIn(load) };
    }
    if (t < tLand) {
      const u = (t - tTakeoff) / T;
      const yaw0 = (forwardTakeoff ? yawFwd : yawBack) + preRotation;
      return { x: D * u, y: H * 4 * u * (1 - u), z: 0, yaw: yaw0 + turns * TWO_PI * u };
    }
    // landing and exit on the right back outside edge, curving toward -Z
    const s = (t - tLand) * SPEED * 0.92;
    const phi = s / RADIUS;
    const x = D + RADIUS * Math.sin(phi);
    const z = exitCentreZ + RADIUS * Math.cos(phi);
    const yawLanding = (forwardTakeoff ? yawFwd : yawBack) + preRotation + turns * TWO_PI;
    const finish = easeOut(clamp01((t - tLand) / 0.25));
    const checkOut = easeInOut(clamp01((t - tLand - 0.1) / 0.5));
    // complete whatever was missing on the ice, then check out of the rotation and follow the curve
    const yaw = yawLanding + missing * finish - preRotation * checkOut + phi;
    return { x, y: 0, z, yaw };
  };

  const glide = forwardTakeoff ? POSES.glideFO : POSES.glideBO;
  const load = forwardTakeoff ? POSES.loadFO : POSES.loadBO;
  const prep: Pose = jump.takeOff.toePick ? POSES.pickBack : load;
  const keys = [
    { t: 0, pose: glide },
    { t: tLoad - 0.2, pose: glide },
    { t: tLoad + LOAD * 0.55, pose: prep, ease: easeInOut },
    { t: tTakeoff, pose: POSES.launch, ease: easeOut },
    { t: tTakeoff + Math.min(0.14, T * 0.25), pose: POSES.tuck, ease: easeOut },
    { t: tLand - Math.min(0.1, T * 0.2), pose: POSES.tuck, ease: linear },
    { t: tLand, pose: POSES.open, ease: easeOut },
    { t: tLand + 0.14, pose: POSES.land, ease: easeOut },
    { t: tLand + LAND, pose: POSES.land, ease: linear },
    { t: tExit + 0.5, pose: POSES.glideBO, ease: easeInOut },
    { t: duration, pose: POSES.glideBO, ease: linear },
  ];

  const trace: TraceSample[] = [];
  const takeOffFoot = jump.takeOff.foot === "left" ? "L" : "R";
  const takeOffEdge = jump.takeOff.edge;
  for (let t = 0; t < tTakeoff; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: takeOffFoot, edge: takeOffEdge });
  }
  if (jump.takeOff.toePick) {
    const pickFoot = jump.takeOff.toePickFoot === "left" ? "L" : "R";
    const sideSign = pickFoot === "L" ? 1 : -1;
    trace.push({ t: tTakeoff, x: -0.35, z: entrySign === 1 ? 0.12 * sideSign : -0.12 * sideSign, foot: pickFoot, edge: "toe" });
  }
  for (let t = tLand; t <= duration; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: "R", edge: "outside" });
  }

  const edgeName = `${jump.takeOff.foot} ${jump.takeOff.direction} ${jump.takeOff.edge}`;
  const markers = [
    { t: 0, label: "Entry edge", detail: `${edgeName} edge${counterRotated ? ", curving against the rotation" : ""}` },
    { t: tLoad, label: "Knee bend", detail: jump.takeOff.toePick ? `${jump.takeOff.toePickFoot} toe pick reaches back` : "deep knee on the take-off edge" },
    { t: tTakeoff, label: "Take-off", detail: jump.takeOff.toePick ? "vaulting off the toe pick" : forwardTakeoff ? "forward take-off: an extra half revolution" : "springing from the edge" },
    { t: tTakeoff + 0.12, label: "Rotation", detail: `${nominal} revolution${nominal === 1 ? "" : "s"} in about ${T.toFixed(2)} s` },
    { t: tLand, label: "Landing", detail: call ? `${MISSING_TURNS[call] * 360}° short at touchdown (${call})` : "right back outside edge" },
    { t: tLand + 0.3, label: "Check-out", detail: "arms open, free leg extended, riding the exit edge" },
  ];

  return {
    id: `${rotations}${jump.id}${call}`,
    title: `${rotations}${jump.id}${call} · ${jump.name}`,
    duration,
    keys,
    root,
    markers,
    trace,
    rotation: { start: tTakeoff, end: tLand, turns, nominal },
    focus: { x: D / 2, z: 0 },
    heading: 0,
  };
}

export const EMPTY_POSE: Pose = mergePoses({ bones: {} });
