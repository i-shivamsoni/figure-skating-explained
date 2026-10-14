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
  entry: "step" | "fly" | "threes";
  /** Air pose for flying entries. */
  flyPose?: string;
  phases: SpinPhase[];
  /** Revolutions per second during the spin. */
  rps?: number;
}

/**
 * Relative moment of inertia of each position about the spin axis (camel = 1). A spin keeps its
 * angular momentum, so pulling the arms and free leg to the axis makes it faster: the scratch spin
 * is the quickest, the camel the slowest. Rates are clamped so the animation stays readable.
 */
const INERTIA: Record<string, number> = {
  camel: 1.0, camelSideways: 1.0, camelUpward: 0.95, doughnut: 0.85, windmillUp: 1.0, windmillDown: 0.8,
  sit: 0.55, sitSideways: 0.6, sitBehind: 0.5, pancake: 0.5, layback: 0.5, catchFoot: 0.5, biellmann: 0.4,
  upright: 0.32, uprightForward: 0.45, crossfoot: 0.35, headless: 0.35, changeFoot: 0.65,
};

/** Angular velocity multiplier for a pose relative to the preset's base rate. */
export function spinRateFactor(pose: string): number {
  const inertia = INERTIA[pose] ?? 0.7;
  return Math.min(2.4, Math.max(0.6, 0.75 / inertia));
}

const ENTRY = 1.3;
const FLY = 0.5;
const EXIT = 1.2;
const R_ENTRY = 4; // entry edge radius
const EXIT_DECEL = 0.4; // seconds the blade takes to brake the spin on the exit
const FLY_TURN = 0.5 * TWO_PI; // a flying entry turns about half a revolution in the air

/**
 * Builds a spin: glide in on a forward edge, optional flying entry, the listed phases
 * (each a held position with a revolution count), then a push out onto an exit edge.
 * The spin centre is the origin; rotation is counter-clockwise.
 */
export function spinTimeline(p: SpinParams): Timeline {
  const rps = p.rps ?? 1.7;
  const tSpinStart = ENTRY + (p.entry === "fly" ? FLY : 0.25);
  // phase schedule: each position spins at its own rate; transitions blend the rate linearly
  let t = tSpinStart;
  const schedule: { phase: SpinPhase; from: number; to: number; rate: number }[] = [];
  const segments: { from: number; to: number; w0: number; w1: number }[] = []; // ω in rev/s
  let prevRate = rps * spinRateFactor(p.phases[0]?.pose ?? "camel") * 0.6;
  for (const ph of p.phases) {
    const rate = rps * spinRateFactor(ph.pose);
    const trans = ph.transition ?? 0.45;
    const hold = ph.revolutions / rate;
    segments.push({ from: t, to: t + trans, w0: prevRate, w1: rate });
    segments.push({ from: t + trans, to: t + trans + hold, w0: rate, w1: rate });
    schedule.push({ phase: ph, from: t, to: t + trans + hold, rate });
    t += trans + hold;
    prevRate = rate;
  }
  const tSpinEnd = t;
  const revsUntil = (time: number): number => {
    let revs = 0;
    for (const sg of segments) {
      if (time <= sg.from) break;
      const end = Math.min(time, sg.to);
      const u = (end - sg.from) / (sg.to - sg.from);
      const wEnd = sg.w0 + (sg.w1 - sg.w0) * u;
      revs += ((sg.w0 + wEnd) / 2) * (end - sg.from);
    }
    return revs;
  };
  const totalRev = revsUntil(tSpinEnd);
  const endRate = segments.length ? segments[segments.length - 1].w1 : rps;
  const duration = tSpinEnd + 0.4 + EXIT;
  const yawTravelIn = headingOf(1, 0); // entering while travelling +X, facing forward
  // the hook: the body's yaw rate ramps from the entry curve's rate up to the first position's
  // rate with a smoothstep, so there is no kink at either end; a flying entry adds a sine bump
  // so that about half a revolution happens in the air
  const tHook = tSpinStart - ENTRY;
  const wDrift = 3.2 / R_ENTRY;
  const wSpin = (segments[0]?.w0 ?? rps * 0.6) * TWO_PI;
  const baseHook = tHook * (wDrift + (wSpin - wDrift) / 2);
  const bump = p.entry === "fly" ? (Math.max(0, FLY_TURN - baseHook) * Math.PI) / (2 * tHook) : 0;
  const hookYaw = (u: number): number => tHook * (wDrift * u + (wSpin - wDrift) * (u * u * u - (u * u * u * u) / 2) + (bump * (1 - Math.cos(Math.PI * u))) / Math.PI);
  // travelling threes turn two full revolutions on the entry curve; carry them so the yaw never jumps
  const yawCarry = p.entry === "threes" ? TWO_PI * 2 : 0;
  const yawSpinStart = yawTravelIn + yawCarry + hookYaw(1);
  const yawSpinEnd = yawSpinStart + totalRev * TWO_PI;

  const root = (time: number): RootState => {
    if (time < ENTRY) {
      // arc with centre on -Z, ending at the origin heading +X
      const phi = ((time - ENTRY) * 3.2) / R_ENTRY;
      // travelling threes: two full body revolutions of turns along the entry curve
      const threes = p.entry === "threes" ? TWO_PI * 2 * easeInOut(clamp01((time - 0.2) / (ENTRY - 0.3))) : 0;
      return { x: R_ENTRY * Math.sin(phi), y: 0, z: -R_ENTRY + R_ENTRY * Math.cos(phi), yaw: yawTravelIn + phi + threes };
    }
    if (time < tSpinStart) {
      const u = clamp01((time - ENTRY) / (tSpinStart - ENTRY));
      const y = p.entry === "fly" ? 0.55 * 4 * u * (1 - u) : 0;
      return { x: 0.25 * (1 - u), y, z: 0, yaw: yawTravelIn + yawCarry + hookYaw(u) };
    }
    if (time < tSpinEnd) {
      // slow drift: real spins travel a few centimetres; keep it centred with a tiny wobble
      const yaw = yawSpinStart + revsUntil(time) * TWO_PI;
      return { x: 0.03 * Math.cos(yaw), y: 0, z: 0.03 * Math.sin(yaw), yaw };
    }
    const u = time - tSpinEnd;
    // exit: the blade brakes the rotation at a constant rate from the last position's rate to rest
    // over EXIT_DECEL seconds, then a push out on a back outside edge toward -X
    const e = Math.min(u, EXIT_DECEL);
    const yaw = yawSpinEnd + endRate * TWO_PI * (e - (e * e) / (2 * EXIT_DECEL));
    const s = Math.max(0, u - EXIT_DECEL) * 3.0;
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
  const markers: Marker[] = [{ t: 0, label: "Entry", detail: p.entry === "fly" ? "forward outside edge into a jump: no rotation on the ice before take-off" : p.entry === "threes" ? "travelling threes: a difficult entrance if two revolutions are turned without the free foot touching the ice" : "forward outside edge, hooking into the spin" }];
  if (p.entry === "fly") markers.push({ t: ENTRY, label: "Fly", detail: "a clear jump with a defined air position" });
  for (const { phase, from, to } of schedule) {
    const trans = phase.transition ?? 0.45;
    keys.push({ t: from + trans, pose: poseOf(phase.pose, phase.mirrored), ease: easeInOut });
    keys.push({ t: to, pose: poseOf(phase.pose, phase.mirrored), ease: linear });
    markers.push({ t: from, label: phase.label, detail: `${phase.detail ?? `${phase.revolutions} revolutions`} · about ${schedule.find((x) => x.phase === phase)!.rate.toFixed(1)} rev/s` });
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
  LSp: {
    id: "LSp",
    title: "Layback spin",
    entry: "step",
    rps: 1.6,
    phases: [
      { pose: "layback", revolutions: 8, label: "Layback position", detail: "head and shoulders back, back arched; 8 revolutions required in the Women's Short Program" },
      { pose: "catchFoot", revolutions: 2, label: "Catch-foot", detail: "the free foot is caught above the head; still a layback as long as the back stays arched", transition: 0.7 },
      { pose: "biellmann", revolutions: 3, label: "Biellmann", detail: "a difficult variation of upright taken after the required revolutions", transition: 0.7 },
    ],
  },
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
  FCSpToeArabian: { id: "FCSpToeArabian", title: "Toe Arabian into a camel", entry: "fly", flyPose: "toeArabian", phases: [{ pose: "camel", revolutions: 5, label: "Camel position", detail: "the Toe Arabian counts as a difficult variation of the flying entry, or as a change of foot by jump" }] },
  threes: { id: "threes", title: "Travelling threes into a camel", entry: "threes", phases: [{ pose: "camel", revolutions: 5, label: "Camel position", detail: "entered from travelling three turns" }] },
  shapes: {
    id: "shapes",
    title: "Popular position names",
    entry: "step",
    rps: 1.5,
    phases: [
      { pose: "pancake", revolutions: 2, label: "Pancake", detail: "a sit variation: free leg folded across, torso flat on top (sit forward or sideways in the rules)" },
      { pose: "doughnut", revolutions: 2, label: "Doughnut", detail: "a camel with the free foot caught overhead so the body forms a ring (camel sideways or upward)", transition: 0.8 },
      { pose: "catchFoot", revolutions: 2, label: "Haircutter", detail: "a layback catch-foot where the blade nearly touches the head (upright layback)", transition: 0.8 },
      { pose: "headless", revolutions: 2, label: "Headless", detail: "an upright variation named in the handbook: the head and neck move back off the axis", transition: 0.7 },
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
