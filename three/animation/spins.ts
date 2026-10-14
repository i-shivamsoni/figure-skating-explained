import { POSES, mirrorPose } from "../rig/poses";
import type { Pose } from "../rig/pose";
import { clamp01, easeInOut, easeOut, headingOf, linear, TWO_PI, type PoseKey, type RootState, type Timeline, type TraceSample, type Marker } from "./timeline";

export interface SpinPhase {
  /** Pose name from POSES, optionally mirrored for the other foot. */
  pose: string;
  mirrored?: boolean;
  revolutions: number;
  label: string;
  detail?: string;
  /** Seconds to move into this position (default 0.45). */
  transition?: number;
  /** Which foot is on the ice during the phase. */
  foot?: "L" | "R";
  edge?: "outside" | "inside";
}

export interface SpinParams {
  id: string;
  title: string;
  entry: "step" | "fly";
  /** Air pose for flying entries. */
  flyPose?: string;
  phases: SpinPhase[];
  /** Revolutions per second during the spin. */
  rps?: number;
}

const ENTRY = 1.3;
const FLY = 0.5;
const EXIT = 1.2;
const R_ENTRY = 4; // entry edge radius

/**
 * Builds a spin: glide in on a forward edge, optional flying entry, the listed phases
 * (each a held position with a revolution count), then a push out onto an exit edge.
 * The spin centre is the origin; rotation is counter-clockwise.
 */
export function spinTimeline(p: SpinParams): Timeline {
  const rps = p.rps ?? 1.7;
  const tSpinStart = ENTRY + (p.entry === "fly" ? FLY : 0.25);
  // phase schedule
  let t = tSpinStart;
  const schedule: { phase: SpinPhase; from: number; to: number }[] = [];
  let totalRev = 0;
  for (const ph of p.phases) {
    const hold = ph.revolutions / rps;
    const trans = ph.transition ?? 0.45;
    schedule.push({ phase: ph, from: t, to: t + trans + hold });
    t += trans + hold;
    totalRev += ph.revolutions + trans * rps;
  }
  const tSpinEnd = t;
  const duration = tSpinEnd + 0.4 + EXIT;
  const yawTravelIn = headingOf(1, 0); // entering while travelling +X, facing forward
  const yawSpinStart = yawTravelIn + 0.6;
  const yawSpinEnd = yawSpinStart + (tSpinEnd - tSpinStart) * rps * TWO_PI;

  const root = (time: number): RootState => {
    if (time < ENTRY) {
      // arc with centre on -Z, ending at the origin heading +X
      const phi = ((time - ENTRY) * 3.2) / R_ENTRY;
      return { x: R_ENTRY * Math.sin(phi), y: 0, z: -R_ENTRY + R_ENTRY * Math.cos(phi), yaw: yawTravelIn + phi };
    }
    if (time < tSpinStart) {
      const u = clamp01((time - ENTRY) / (tSpinStart - ENTRY));
      const y = p.entry === "fly" ? 0.55 * 4 * u * (1 - u) : 0;
      return { x: 0.25 * (1 - u), y, z: 0, yaw: yawTravelIn + (yawSpinStart - yawTravelIn) * easeOut(u) };
    }
    if (time < tSpinEnd) {
      // slow drift: real spins travel a few centimetres; keep it centred with a tiny wobble
      const yaw = yawSpinStart + (time - tSpinStart) * rps * TWO_PI;
      return { x: 0.03 * Math.cos(yaw), y: 0, z: 0.03 * Math.sin(yaw), yaw };
    }
    const u = time - tSpinEnd;
    const slow = clamp01(u / 0.4);
    // exit: rotation decays, then push out on a back outside edge toward -X
    const yaw = yawSpinEnd + rps * TWO_PI * 0.4 * (1 - Math.pow(1 - slow, 2)) + (u > 0.4 ? 0 : 0);
    const s = Math.max(0, u - 0.4) * 3.0;
    const phi = s / R_ENTRY;
    return { x: -R_ENTRY * Math.sin(phi), y: 0, z: -R_ENTRY + R_ENTRY * Math.cos(phi), yaw: yaw + phi };
  };

  const poseOf = (name: string, mirrored?: boolean): Pose => (mirrored ? mirrorPose(POSES[name]) : POSES[name]);
  const keys: PoseKey[] = [
    { t: 0, pose: POSES.glideFO },
    { t: ENTRY - 0.35, pose: POSES.glideFO },
    { t: ENTRY, pose: POSES.spinEntry, ease: easeInOut },
  ];
  if (p.entry === "fly") {
    keys.push({ t: ENTRY + 0.08, pose: POSES.launch, ease: easeOut });
    keys.push({ t: ENTRY + FLY * 0.5, pose: poseOf(p.flyPose ?? "flyCamel"), ease: easeOut });
  }
  const markers: Marker[] = [{ t: 0, label: "Entry", detail: p.entry === "fly" ? "forward outside edge into a jump: no rotation on the ice before take-off" : "forward outside edge, hooking into the spin" }];
  if (p.entry === "fly") markers.push({ t: ENTRY, label: "Fly", detail: "a clear jump with a defined air position" });
  for (const { phase, from, to } of schedule) {
    const trans = phase.transition ?? 0.45;
    keys.push({ t: from + trans, pose: poseOf(phase.pose, phase.mirrored), ease: easeInOut });
    keys.push({ t: to, pose: poseOf(phase.pose, phase.mirrored), ease: linear });
    markers.push({ t: from, label: phase.label, detail: phase.detail ?? `${phase.revolutions} revolutions` });
  }
  keys.push({ t: tSpinEnd + 0.35, pose: POSES.windUp, ease: easeInOut });
  keys.push({ t: tSpinEnd + 0.9, pose: POSES.spinExit, ease: easeInOut });
  keys.push({ t: duration, pose: POSES.glideBO, ease: linear });
  markers.push({ t: tSpinEnd, label: "Exit", detail: "final wind-up, then a push onto a back outside edge" });

  const trace: TraceSample[] = [];
  for (let s = 0; s < ENTRY; s += 1 / 40) {
    const r = root(s);
    trace.push({ t: s, x: r.x, z: r.z, foot: "L", edge: "outside" });
  }
  for (const { phase, from, to } of schedule) {
    for (let s = from; s < to; s += 1 / 30) {
      const r = root(s);
      trace.push({ t: s, x: r.x, z: r.z, foot: phase.foot ?? "L", edge: phase.edge ?? "inside" });
    }
  }
  for (let s = tSpinEnd + 0.4; s <= duration; s += 1 / 40) {
    const r = root(s);
    trace.push({ t: s, x: r.x, z: r.z, foot: "R", edge: "outside" });
  }

  return {
    id: p.id,
    title: p.title,
    duration,
    keys,
    root,
    markers,
    trace,
    rotation: { start: tSpinStart, end: tSpinEnd, turns: totalRev, nominal: Math.round(totalRev) },
    focus: { x: 0, z: 0 },
    heading: 0,
  };
}

/** Ready-made spins for the site. */
export const SPIN_PRESETS: Record<string, SpinParams> = {
  CSp: { id: "CSp", title: "Camel spin", entry: "step", phases: [{ pose: "camel", revolutions: 6, label: "Camel position", detail: "free leg back, knee above hip level, body horizontal" }] },
  SSp: { id: "SSp", title: "Sit spin", entry: "step", phases: [{ pose: "sit", revolutions: 6, label: "Sit position", detail: "thigh of the skating leg at least parallel to the ice" }] },
  USp: { id: "USp", title: "Upright spin", entry: "step", rps: 2.4, phases: [{ pose: "upright", revolutions: 6, label: "Upright position", detail: "skating leg extended, free foot crossed, arms pulled in to accelerate" }] },
  LSp: { id: "LSp", title: "Layback spin", entry: "step", rps: 1.6, phases: [{ pose: "layback", revolutions: 8, label: "Layback position", detail: "head and shoulders back, back arched; 8 revolutions required in the Women's Short Program" }, { pose: "biellmann", revolutions: 3, label: "Biellmann", detail: "a difficult variation of upright taken after the required revolutions", transition: 0.7 }] },
  FCSp: { id: "FCSp", title: "Flying camel spin", entry: "fly", flyPose: "flyCamel", phases: [{ pose: "camel", revolutions: 6, label: "Camel position", detail: "landed directly into the camel" }] },
  FSSp: { id: "FSSp", title: "Flying sit spin", entry: "fly", flyPose: "flySit", phases: [{ pose: "sit", revolutions: 6, label: "Sit position" }] },
  CCSp: { id: "CCSp", title: "Camel spin with change of foot", entry: "step", phases: [{ pose: "camel", revolutions: 4, label: "Camel on the left foot" }, { pose: "changeFoot", revolutions: 0.5, label: "Change of foot", detail: "a step or a jump; at least three revolutions are needed on each side", transition: 0.3 }, { pose: "camel", mirrored: true, revolutions: 4, label: "Camel on the right foot", foot: "R", edge: "outside", transition: 0.4 }] },
  CSSp: { id: "CSSp", title: "Sit spin with change of foot", entry: "step", phases: [{ pose: "sit", revolutions: 4, label: "Sit on the left foot" }, { pose: "changeFoot", revolutions: 0.5, label: "Change of foot", transition: 0.3 }, { pose: "sit", mirrored: true, revolutions: 4, label: "Sit on the right foot", foot: "R", edge: "outside", transition: 0.5 }] },
  CCoSp: {
    id: "CCoSp",
    title: "Combination spin with change of foot",
    entry: "step",
    phases: [
      { pose: "camel", revolutions: 2.5, label: "Camel", detail: "two revolutions make the position count" },
      { pose: "sit", revolutions: 2.5, label: "Sit", detail: "change of position on the same foot", transition: 0.6 },
      { pose: "changeFoot", revolutions: 0.5, label: "Change of foot", transition: 0.3 },
      { pose: "sitSideways", mirrored: true, revolutions: 2.5, label: "Sit sideways (SS)", detail: "a difficult variation on the second foot", foot: "R", edge: "outside", transition: 0.5 },
      { pose: "upright", mirrored: true, revolutions: 3, label: "Upright", detail: "all three basic positions: full value", foot: "R", edge: "outside", transition: 0.6 },
    ],
  },
  variations: {
    id: "variations",
    title: "Difficult variations",
    entry: "step",
    rps: 1.5,
    phases: [
      { pose: "camel", revolutions: 2, label: "Camel forward (CF)", detail: "shoulder line parallel to the ice" },
      { pose: "camelSideways", revolutions: 2, label: "Camel sideways (CS)", detail: "shoulder line twisted to vertical", transition: 0.6 },
      { pose: "camelUpward", revolutions: 2, label: "Camel upward (CU)", detail: "shoulder line past vertical", transition: 0.6 },
      { pose: "sit", revolutions: 2, label: "Sit forward (SF)", detail: "free leg forward", transition: 0.8 },
      { pose: "sitSideways", revolutions: 2, label: "Sit sideways (SS)", detail: "free leg out to the side", transition: 0.6 },
      { pose: "sitBehind", revolutions: 2, label: "Sit behind (SB)", detail: "free leg behind", transition: 0.6 },
      { pose: "uprightForward", revolutions: 2, label: "Upright forward (UF)", detail: "torso leaning forward", transition: 0.8 },
      { pose: "crossfoot", revolutions: 2, label: "Upright straight (US)", detail: "crossfoot: both feet, toes together", transition: 0.6 },
      { pose: "layback", revolutions: 2, label: "Upright layback (UL)", transition: 0.7 },
      { pose: "biellmann", revolutions: 2, label: "Upright Biellmann (UB)", detail: "free leg pulled above the head", transition: 0.7 },
    ],
  },
  ChSp: {
    id: "ChSp",
    title: "Choreographic spin",
    entry: "step",
    rps: 1.4,
    phases: [
      { pose: "uprightForward", revolutions: 1.5, label: "Any position", detail: "basic or non-basic; only three consecutive revolutions on one foot are required" },
      { pose: "sitBehind", revolutions: 1.5, label: "Change at will", detail: "changes of foot and position are free and can repeat", transition: 0.6 },
      { pose: "layback", revolutions: 2, label: "Matching the music", detail: "judges score it in GOE only; no levels", transition: 0.6 },
    ],
  },
  windmills: {
    id: "windmills",
    title: "Windmills (three in a row)",
    entry: "step",
    rps: 1.4,
    phases: [
      { pose: "windmillUp", revolutions: 0.5, label: "Windmill 1", detail: "free leg sweeps close to a split (at least 135°)", transition: 0.3 },
      { pose: "windmillDown", revolutions: 0.5, label: "", transition: 0.3 },
      { pose: "windmillUp", revolutions: 0.5, label: "Windmill 2", transition: 0.3 },
      { pose: "windmillDown", revolutions: 0.5, label: "", transition: 0.3 },
      { pose: "windmillUp", revolutions: 0.5, label: "Windmill 3", detail: "three consecutive windmills are one level feature", transition: 0.3 },
      { pose: "camel", revolutions: 2, label: "Camel", transition: 0.5 },
    ],
  },
};

export function spinPreset(code: string): Timeline {
  const p = SPIN_PRESETS[code];
  if (!p) throw new Error(`No spin preset ${code}`);
  return spinTimeline(p);
}
