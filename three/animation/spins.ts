import "../rig/poses-spins";
import { POSES, mirrorPose } from "../rig/poses";
import type { Pose } from "../rig/pose";
import { SPIN_FAMILIES, SPIN_LEVEL_FEATURES, VARIATION_CATEGORIES } from "@/data/spins";
import { clamp01, easeInOut, easeOut, headingOf, linear, TWO_PI, type PoseKey, type RootState, type Timeline, type TraceSample, type Marker } from "./timeline";

export type BasicPosition = "camel" | "sit" | "upright" | "layback";
export type SpinEdge = "outside" | "inside";

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
  edge?: SpinEdge;
  /** Basic position held in this phase, for the counted revolutions; leave out for transitions and non-basic shapes. */
  basic?: BasicPosition;
  /** Difficult variation category (CF, SS, UB…) shown in this phase. */
  variation?: string;
  /** Clear change of edge once two revolutions are held: the lean flips and the trace changes edge for the rest of the phase. */
  changeEdge?: boolean;
  /** The phase is a change of foot executed by jump: a hop between the feet, no blade on the ice. */
  jump?: boolean;
}

export interface SpinParams {
  id: string;
  title: string;
  entry: "step" | "fly" | "threes";
  /** Air pose for flying entries. */
  flyPose?: string;
  /** Height of the flying entry in metres (default 0.55; a difficult fly jumps higher). */
  flyHeight?: number;
  /** HUD text for the flying entry. */
  flyDetail?: string;
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
  camel: 1.0, camelForward: 0.95, camelSideways: 1.0, camelUpward: 0.95, doughnut: 0.85, windmillUp: 1.0, windmillDown: 0.8,
  sit: 0.55, sitSideways: 0.6, sitBehind: 0.5, pancake: 0.5, layback: 0.5, sidewaysLean: 0.5, catchFoot: 0.5, biellmann: 0.4,
  upright: 0.32, uprightForward: 0.45, crossfoot: 0.35, headless: 0.35, changeFoot: 0.65, hopChange: 0.6,
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
const FLY_HEIGHT = 0.55;
/** Metres the blade still travels while the hook turns the entry edge into the spin. */
const HOOK_TRAVEL = 0.25;
/** Edge lean of the spinning blade (about 5°): toward the skater's right on the left back inside and right back outside edges. */
const LEAN = 0.09;
/** Seconds a change of edge takes to flip the lean. */
const FLIP = 0.35;
/** Height of a change of foot executed by jump. */
const HOP = 0.2;
/** Radius of the small circle the blade traces while spinning; its centre sits to the side the blade leans, so a change of edge moves it across. */
const SPIN_R = 0.1;

const otherEdge = (e: SpinEdge): SpinEdge => (e === "inside" ? "outside" : "inside");
/** Sign of the lean (positive toward the skater's right): the left foot's inside and the right foot's outside edge lean right. */
const leanOf = (foot: "L" | "R", edge: SpinEdge): number => ((foot === "L") === (edge === "inside") ? LEAN : -LEAN);
/** Handbook name of the edge the blade spins on: backward on the usual edges, forward after a change of edge. */
export function edgeName(foot: "L" | "R", edge: SpinEdge): string {
  const usual = foot === "L" ? "inside" : "outside";
  return `${edge === usual ? "back" : "forward"} ${edge}`;
}

interface Scheduled {
  phase: SpinPhase;
  from: number;
  to: number;
  rate: number;
  trans: number;
  hold: number;
  foot: "L" | "R";
  edge: SpinEdge;
  /** Time of the change of edge within the phase, when `phase.changeEdge` is set. */
  flipAt?: number;
}

interface Segment {
  from: number;
  to: number;
  w0: number;
  w1: number;
}

/** Phase schedule: each position spins at its own rate, transitions blend the rate linearly. */
function scheduleOf(p: SpinParams) {
  const rps = p.rps ?? 1.7;
  const tSpinStart = ENTRY + (p.entry === "fly" ? FLY : 0.25);
  let t = tSpinStart;
  const schedule: Scheduled[] = [];
  const segments: Segment[] = []; // ω in rev/s
  let prevRate = rps * spinRateFactor(p.phases[0]?.pose ?? "camel") * 0.6;
  for (const ph of p.phases) {
    const rate = rps * spinRateFactor(ph.pose);
    const trans = ph.transition ?? 0.45;
    const hold = ph.revolutions / rate;
    segments.push({ from: t, to: t + trans, w0: prevRate, w1: rate });
    segments.push({ from: t + trans, to: t + trans + hold, w0: rate, w1: rate });
    const foot = ph.foot ?? "L";
    const edge = ph.edge ?? "inside";
    // the edge changes once two revolutions are held (the handbook's minimum on each edge), or half-way in a shorter hold
    const flipAt = ph.changeEdge ? t + trans + Math.min(2 / rate, hold / 2) : undefined;
    schedule.push({ phase: ph, from: t, to: t + trans + hold, rate, trans, hold, foot, edge, flipAt });
    t += trans + hold;
    prevRate = rate;
  }
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
  return { rps, tSpinStart, tSpinEnd: t, schedule, segments, revsUntil };
}

/** Revolutions of a spin the way the technical panel counts them: held in each position, per foot and in all. */
export function spinRevolutions(p: SpinParams): {
  phases: { label: string; basic?: BasicPosition; variation?: string; foot: "L" | "R"; held: number; total: number }[];
  perFoot: { L: number; R: number };
  total: number;
} {
  const { schedule, revsUntil, tSpinEnd } = scheduleOf(p);
  const perFoot = { L: 0, R: 0 };
  const phases = schedule.map((s) => {
    const total = revsUntil(s.to) - revsUntil(s.from);
    if (!s.phase.jump) perFoot[s.foot] += total;
    return { label: s.phase.label, basic: s.phase.basic, variation: s.phase.variation, foot: s.foot, held: s.phase.revolutions, total };
  });
  return { phases, perFoot, total: revsUntil(tSpinEnd) };
}

/**
 * Builds a spin: glide in on a forward edge, optional flying entry, the listed phases
 * (each a held position with a revolution count), then a push out onto an exit edge.
 * The spin centre is the origin; rotation is counter-clockwise. The blade's edge shows as a lean
 * (`roll`) and as the trace colour; a change of edge flips both, a change of foot by jump lifts
 * the skater off the ice between the feet.
 */
export function spinTimeline(p: SpinParams): Timeline {
  const { rps, tSpinStart, tSpinEnd, schedule, segments, revsUntil } = scheduleOf(p);
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
  const flyHeight = p.flyHeight ?? FLY_HEIGHT;

  // the lean: one event per phase (blended over its transition) and one per change of edge (over FLIP);
  // the hook ramps into the first phase's lean and the exit brake lets it go
  const leanEvents: { t: number; lean: number; blend: number }[] = [];
  schedule.forEach((s, i) => {
    const lean = s.phase.jump ? 0 : leanOf(s.foot, s.edge);
    leanEvents.push(i === 0 ? { t: ENTRY, lean, blend: tSpinStart - ENTRY + s.trans } : { t: s.from, lean, blend: s.trans });
    if (s.flipAt !== undefined) leanEvents.push({ t: s.flipAt - FLIP / 2, lean: leanOf(s.foot, otherEdge(s.edge)), blend: FLIP });
  });
  leanEvents.push({ t: tSpinEnd, lean: 0, blend: EXIT_DECEL + 0.3 });
  const rollAt = (time: number): number => {
    let prev = 0;
    for (const e of leanEvents) {
      if (time < e.t) return prev;
      if (time < e.t + e.blend) return prev + (e.lean - prev) * easeInOut((time - e.t) / e.blend);
      prev = e.lean;
    }
    return prev;
  };
  // a change of foot by jump: off the ice for the phase
  const hopAt = (time: number): number => {
    for (const s of schedule) {
      if (!s.phase.jump || time < s.from || time > s.to) continue;
      const u = (time - s.from) / (s.to - s.from);
      return HOP * 4 * u * (1 - u);
    }
    return 0;
  };

  // the blade's small circle: its radius grows in over the first moments of the spin and shrinks away
  // under the exit brake, and its centre sits SPIN_R to the side the blade leans (a change of edge
  // therefore moves the circle across, the way the trace of a real change of edge loops over)
  const circle = (time: number, yaw: number): { x: number; z: number } => {
    const grow = clamp01((time - tSpinStart) / 0.3);
    const shrink = clamp01(1 - (time - tSpinEnd) / EXIT_DECEL);
    const r = SPIN_R * (time < tSpinEnd ? grow : shrink);
    const cx = (SPIN_R * rollAt(time)) / LEAN;
    return { x: cx + r * Math.cos(yaw), z: r * Math.sin(yaw) };
  };
  const root = (time: number): RootState => {
    if (time < ENTRY) {
      // arc with centre on -Z, ending HOOK_TRAVEL short of the origin heading +X
      const phi = ((time - ENTRY) * 3.2) / R_ENTRY;
      // travelling threes: two full body revolutions of turns along the entry curve
      const threes = p.entry === "threes" ? TWO_PI * 2 * easeInOut(clamp01((time - 0.2) / (ENTRY - 0.3))) : 0;
      return { x: R_ENTRY * Math.sin(phi) - HOOK_TRAVEL, y: 0, z: -R_ENTRY + R_ENTRY * Math.cos(phi), yaw: yawTravelIn + phi + threes };
    }
    if (time < tSpinStart) {
      // the hook: the blade covers the last HOOK_TRAVEL to the spin centre while the edge turns under the body
      const u = clamp01((time - ENTRY) / (tSpinStart - ENTRY));
      const y = p.entry === "fly" ? flyHeight * 4 * u * (1 - u) : 0;
      const yaw = yawTravelIn + yawCarry + hookYaw(u);
      return { x: -HOOK_TRAVEL * (1 - u) + circle(time, yaw).x, y, z: 0, yaw, roll: rollAt(time) };
    }
    if (time < tSpinEnd) {
      const yaw = yawSpinStart + revsUntil(time) * TWO_PI;
      const c = circle(time, yaw);
      return { x: c.x, y: hopAt(time), z: c.z, yaw, roll: rollAt(time) };
    }
    const u = time - tSpinEnd;
    // exit: the blade brakes the rotation at a constant rate from the last position's rate to rest
    // over EXIT_DECEL seconds, then a push out on a back outside edge toward -X
    const e = Math.min(u, EXIT_DECEL);
    const yaw = yawSpinEnd + endRate * TWO_PI * (e - (e * e) / (2 * EXIT_DECEL));
    const s = Math.max(0, u - EXIT_DECEL) * 3.0;
    const phi = s / R_ENTRY;
    const c = circle(time, yaw);
    return { x: -R_ENTRY * Math.sin(phi) + c.x, y: 0, z: -R_ENTRY + R_ENTRY * Math.cos(phi) + c.z, yaw: yaw + phi, roll: rollAt(time) };
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
  const markers: Marker[] = [{ t: 0, label: "Entry", detail: p.entry === "fly" ? "forward outside edge into a jump: no rotation on the ice before take-off" : p.entry === "threes" ? "difficult entrance: travelling threes, two revolutions turned without the free foot touching the ice" : "forward outside edge, hooking into the spin" }];
  if (p.entry === "fly") markers.push({ t: ENTRY, label: "Fly", detail: p.flyDetail ?? "a clear jump with a defined air position" });
  for (const s of schedule) {
    const { phase, from, to, trans, rate, foot, edge, flipAt } = s;
    keys.push({ t: from + trans, pose: poseOf(phase.pose, phase.mirrored), ease: easeInOut });
    keys.push({ t: to, pose: poseOf(phase.pose, phase.mirrored), ease: linear });
    const where = phase.jump ? "" : ` · ${foot === "L" ? "left" : "right"} ${edgeName(foot, edge)} edge`;
    markers.push({ t: from, label: phase.label, detail: `${phase.detail ?? `${phase.revolutions} revolutions`} · about ${rate.toFixed(1)} rev/s${where}` });
    // the technical panel's count: two revolutions make a position (and a difficult variation) count
    if (phase.basic && phase.revolutions >= 2 && !flipAt) {
      const what = phase.variation ? `the ${phase.basic} position and its difficult variation count` : `the ${phase.basic} position counts`;
      markers.push({ t: from + trans + 2 / rate, label: `${phase.label} · counted`, detail: `two revolutions held: ${what}` });
    }
    if (flipAt !== undefined) {
      markers.push({ t: flipAt, label: `${phase.label} · change of edge`, detail: `clear change of edge: two revolutions on the ${edgeName(foot, edge)} edge, then two on the ${edgeName(foot, otherEdge(edge))} in the same position (one of the six features that unlock Level 4)` });
    }
    if (phase.basic && phase.revolutions >= 8) {
      markers.push({ t: from + trans + 8 / rate, label: `${phase.label} · 8 revolutions`, detail: "at least eight revolutions without any change of position, variation, foot or edge: a level feature (once per program)" });
    }
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
  for (const { phase, from, to, foot, edge, flipAt } of schedule) {
    for (let s = from; s < to; s += 1 / 30) {
      const r = root(s);
      if (phase.jump && r.y > 0.01) continue; // in the air: no trace
      trace.push({ t: s, x: r.x, z: r.z, foot, edge: flipAt !== undefined && s >= flipAt ? otherEdge(edge) : edge });
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
  CSp: { id: "CSp", title: "Camel spin", entry: "step", phases: [{ pose: "camel", revolutions: 6, label: "Camel position", detail: "free leg back, knee above hip level, body horizontal", basic: "camel" }] },
  SSp: { id: "SSp", title: "Sit spin", entry: "step", phases: [{ pose: "sit", revolutions: 6, label: "Sit position", detail: "thigh of the skating leg at least parallel to the ice", basic: "sit" }] },
  USp: { id: "USp", title: "Upright spin", entry: "step", rps: 2.4, phases: [{ pose: "upright", revolutions: 6, label: "Upright position", detail: "skating leg extended, free foot crossed, arms pulled in to accelerate", basic: "upright" }] },
  LSp: {
    id: "LSp",
    title: "Layback spin",
    entry: "step",
    rps: 1.6,
    phases: [
      { pose: "layback", revolutions: 8, label: "Layback position", detail: "head and shoulders back, back arched; 8 revolutions required in the Women's Short Program", basic: "layback" },
      { pose: "catchFoot", revolutions: 2, label: "Catch-foot", detail: "the free foot is caught above the head; still a layback as long as the back stays arched", transition: 0.7, basic: "layback" },
      { pose: "biellmann", revolutions: 3, label: "Biellmann", detail: "a difficult variation of upright taken after the required revolutions", transition: 0.7, basic: "upright", variation: "UB" },
    ],
  },
  FCSp: { id: "FCSp", title: "Flying camel spin", entry: "fly", flyPose: "flyCamel", phases: [{ pose: "camel", revolutions: 6, label: "Camel position", detail: "landed directly into the camel", basic: "camel" }] },
  FSSp: { id: "FSSp", title: "Flying sit spin", entry: "fly", flyPose: "flySit", phases: [{ pose: "sit", revolutions: 6, label: "Sit position", basic: "sit" }] },
  CCSp: { id: "CCSp", title: "Camel spin with change of foot", entry: "step", phases: [{ pose: "camel", revolutions: 4, label: "Camel on the left foot", basic: "camel" }, { pose: "changeFoot", revolutions: 0.5, label: "Change of foot", detail: "a step or a jump; at least three revolutions are needed on each side", transition: 0.3 }, { pose: "camel", mirrored: true, revolutions: 4, label: "Camel on the right foot", foot: "R", edge: "outside", transition: 0.4, basic: "camel" }] },
  CSSp: { id: "CSSp", title: "Sit spin with change of foot", entry: "step", phases: [{ pose: "sit", revolutions: 4, label: "Sit on the left foot", basic: "sit" }, { pose: "changeFoot", revolutions: 0.5, label: "Change of foot", transition: 0.3 }, { pose: "sit", mirrored: true, revolutions: 4, label: "Sit on the right foot", foot: "R", edge: "outside", transition: 0.5, basic: "sit" }] },
  CCoSp: {
    id: "CCoSp",
    title: "Combination spin with change of foot",
    entry: "step",
    phases: [
      { pose: "camel", revolutions: 2.5, label: "Camel", detail: "two revolutions make the position count", basic: "camel" },
      { pose: "sit", revolutions: 2.5, label: "Sit", detail: "change of position on the same foot", transition: 0.6, basic: "sit" },
      { pose: "changeFoot", revolutions: 0.5, label: "Change of foot", transition: 0.3 },
      { pose: "sitSideways", mirrored: true, revolutions: 2.5, label: "Sit sideways (SS)", detail: "a difficult variation on the second foot", foot: "R", edge: "outside", transition: 0.5, basic: "sit", variation: "SS" },
      { pose: "upright", mirrored: true, revolutions: 3, label: "Upright", detail: "all three basic positions: full value", foot: "R", edge: "outside", transition: 0.6, basic: "upright" },
    ],
  },
  variations: {
    id: "variations",
    title: "Difficult variations",
    entry: "step",
    rps: 1.5,
    phases: [
      { pose: "camelForward", revolutions: 2, label: "Camel forward (CF)", detail: "shoulder line parallel to the ice" },
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
  FCSpToeArabian: { id: "FCSpToeArabian", title: "Toe Arabian into a camel", entry: "fly", flyPose: "toeArabian", phases: [{ pose: "camel", revolutions: 5, label: "Camel position", detail: "the Toe Arabian counts as a difficult variation of the flying entry, or as a change of foot by jump", basic: "camel" }] },
  edgeChange: { id: "edgeChange", title: "Camel with a clear change of edge", entry: "step", phases: [{ pose: "camel", revolutions: 5, label: "Camel position", detail: "two revolutions on the back inside edge, then the blade rolls onto the forward outside edge for the rest", basic: "camel", changeEdge: true }] },
  jumpChange: {
    id: "jumpChange",
    title: "Sit spin with the change of foot by jump",
    entry: "step",
    phases: [
      { pose: "sit", revolutions: 4, label: "Sit on the left foot", basic: "sit" },
      { pose: "hopChange", revolutions: 0.5, label: "Change of foot executed by jump", detail: "a clear jump from one foot to the other: counts as a level feature if a camel or sit position is reached within two revolutions of landing", transition: 0.25, jump: true },
      { pose: "sit", mirrored: true, revolutions: 3, label: "Sit on the right foot", foot: "R", edge: "outside", transition: 0.4, basic: "sit" },
    ],
  },
  threes: { id: "threes", title: "Travelling threes into a camel", entry: "threes", phases: [{ pose: "camel", revolutions: 5, label: "Camel position", detail: "entered from travelling three turns", basic: "camel" }] },
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
      { pose: "camel", revolutions: 2, label: "Camel", transition: 0.5, basic: "camel" },
    ],
  },
};

export function spinPreset(code: string): Timeline {
  const p = SPIN_PRESETS[code];
  if (!p) throw new Error(`No spin preset ${code}`);
  return spinTimeline(p);
}

/* ---------- spins built from a family code and the level features the viewer chose ---------- */

export type SpinLevel = "B" | 1 | 2 | 3 | 4;

/** Serialisable choices of the spin explorer; every field is optional so `{}` is the family's plain spin. */
export interface SpinFeatures {
  level?: SpinLevel;
  /** Reduced value: a stepped-over flying entry, only two basic positions in a combination, or fewer than three revolutions on one foot. */
  v?: boolean;
  /** Difficult variation category per basic position (CF, CS, CU; SF, SS, SB; UF, US, UB; for the layback UL, sideways or UB). */
  variations?: Partial<Record<BasicPosition, string>>;
  changeOfEdge?: boolean;
  /** Change of foot executed by jump instead of a step over (change-of-foot families). */
  changeByJump?: boolean;
  /** Difficult variation of the flying entry (flying families). */
  difficultFly?: boolean;
  /** At least eight revolutions without changes in the first position that allows it. */
  eightRevolutions?: boolean;
  /** Difficult entrance: travelling threes (not with a flying entry). */
  difficultEntrance?: boolean;
  /** Three windmills before the camel (spins that begin in a camel, not flying). */
  windmills?: boolean;
}

const POSITION_OF: Record<string, BasicPosition> = { U: "upright", L: "layback", C: "camel", S: "sit" };
const BASIC_POSE: Record<BasicPosition, string> = { camel: "camel", sit: "sit", upright: "upright", layback: "layback" };
const POSITION_LABEL: Record<BasicPosition, string> = { camel: "Camel position", sit: "Sit position", upright: "Upright position", layback: "Layback position" };
const POSITION_DETAIL: Record<BasicPosition, string> = {
  camel: "free leg backwards with the knee higher than the hip level",
  sit: "the upper part of the skating leg at least parallel to the ice",
  upright: "skating leg extended or slightly bent, not a camel",
  layback: "head and shoulders leaning backwards with the back arched",
};

/** Which pose shows each difficult variation category (the layback position adds "sideways"). */
export const VARIATION_POSE: Record<string, { pose: string; name: string; detail: string }> = {
  CF: { pose: "camelForward", name: "Camel forward (CF)", detail: "shoulder line parallel to the ice, arms stretched along the body line" },
  CS: { pose: "camelSideways", name: "Camel sideways (CS)", detail: "shoulder line twisted to vertical, with a movement that affects the balance of the body core" },
  CU: { pose: "camelUpward", name: "Camel upward (CU)", detail: "shoulder line twisted past vertical" },
  SF: { pose: "pancake", name: "Sit forward (SF)", detail: "free leg forward, torso folded over it: a movement that affects the balance of the body core" },
  SS: { pose: "sitSideways", name: "Sit sideways (SS)", detail: "free leg sideways, arms under the leg with the torso bent down" },
  SB: { pose: "sitBehind", name: "Sit behind (SB)", detail: "free leg behind the skating leg" },
  UF: { pose: "uprightForward", name: "Upright forward (UF)", detail: "torso leaning forward" },
  US: { pose: "crossfoot", name: "Upright straight (US)", detail: "crossfoot: both feet with equal weight, toes together, heels apart" },
  UB: { pose: "biellmann", name: "Upright Biellmann (UB)", detail: "free leg pulled from behind above the head, close to the spinning axis" },
  UL: { pose: "layback", name: "Upright layback (UL)", detail: "the layback position itself as a difficult variation" },
  sideways: { pose: "sidewaysLean", name: "Sideways leaning", detail: "head and shoulders leaning sideways, upper body arched: a change of position backwards to sideways in a layback (feature 14)" },
};

/** Variation categories the explorer offers for each basic position. */
export const VARIATIONS_FOR: Record<BasicPosition, string[]> = {
  camel: ["CF", "CS", "CU"],
  sit: ["SF", "SS", "SB"],
  upright: ["UF", "US", "UB"],
  layback: ["sideways", "UB"],
};

/** Where a flying entry lands: the air pose per landing position, plain and as a difficult variation of flying entry. */
const FLY_POSE: Record<BasicPosition, { plain: string; difficult: string; plainDetail: string; difficultDetail: string }> = {
  camel: { plain: "flyCamel", difficult: "toeArabian", plainDetail: "a clear jump with the legs scissoring, landing straight into the camel", difficultDetail: "difficult variation of flying entry: a clear butterfly (Toe Arabian) with the body horizontal in the air" },
  sit: { plain: "flySitOpen", difficult: "flySit", plainDetail: "a clear jump with an open air position, landing into the sit", difficultDetail: "difficult variation of flying entry: the total sit position in the air, with height and control" },
  upright: { plain: "flyUpright", difficult: "flyUpright", plainDetail: "a clear jump with a stag air position, landing into the upright", difficultDetail: "difficult variation of flying entry: a high stag with the back leg bent behind" },
  layback: { plain: "flyLayback", difficult: "flyLayback", plainDetail: "a clear jump arching back in the air, landing into the layback", difficultDetail: "difficult variation of flying entry: the full arch taken in the air" },
};

const familyOf = (code: string) => SPIN_FAMILIES.find((f) => f.code === code) ?? SPIN_FAMILIES.find((f) => f.code === "CSp")!;

/** Protocol code of a spin spec: family, level and the V sign. */
export function spinCode(code: string, f: SpinFeatures = {}): string {
  return `${familyOf(code).code}${f.level ?? 4}${f.v ? "V" : ""}`;
}

/** Basic positions the spin goes through, in order (the combination keeps camel, sit, upright). */
export function spinPositions(code: string, f: SpinFeatures = {}): BasicPosition[] {
  const fam = familyOf(code);
  if (!fam.combination) return [POSITION_OF[fam.position ?? "C"]];
  return f.v ? ["camel", "sit"] : ["camel", "sit", "upright"];
}

/**
 * Phases that hold one basic position: the basic shape for two revolutions, then its difficult
 * variation (if chosen) for the rest, both counted in the position.
 */
function positionPhases(position: BasicPosition, variation: string | undefined, revolutions: number, foot: "L" | "R", first: boolean): SpinPhase[] {
  const mirrored = foot === "R";
  const edge: SpinEdge = foot === "L" ? "inside" : "outside";
  const base: SpinPhase = { pose: BASIC_POSE[position], mirrored, revolutions, label: POSITION_LABEL[position], detail: POSITION_DETAIL[position], foot, edge, basic: position, transition: first ? 0.45 : 0.6 };
  const v = variation ? VARIATION_POSE[variation] : undefined;
  if (!v) return [base];
  const held = Math.max(2, revolutions - 2);
  const varBasic: BasicPosition = variation === "UB" ? "upright" : variation === "UL" ? "layback" : position;
  return [
    { ...base, revolutions: 2 },
    { pose: v.pose, mirrored, revolutions: held, label: v.name, detail: v.detail, foot, edge, basic: varBasic, variation, transition: 0.6 },
  ];
}

/** The change of foot: a step over, or a jump (feature 2) that must land in a camel or sit within two revolutions. */
function changeOfFootPhase(byJump: boolean): SpinPhase {
  return byJump
    ? { pose: "hopChange", revolutions: 0.5, label: "Change of foot executed by jump", detail: "a clear jump from one foot to the other: counts as a level feature if a camel or sit position is reached within two revolutions of landing", transition: 0.25, jump: true }
    : { pose: "changeFoot", revolutions: 0.5, label: "Change of foot", detail: "a step over; at least three revolutions are needed on each foot", transition: 0.3 };
}

const WINDMILL_PHASES: SpinPhase[] = [
  { pose: "windmillUp", revolutions: 0.5, label: "Windmill 1", detail: "the free leg sweeps close to a split (at least 135°), hands off the ice", transition: 0.3 },
  { pose: "windmillDown", revolutions: 0.5, label: "Windmill 1", transition: 0.3 },
  { pose: "windmillUp", revolutions: 0.5, label: "Windmill 2", transition: 0.3 },
  { pose: "windmillDown", revolutions: 0.5, label: "Windmill 2", transition: 0.3 },
  { pose: "windmillUp", revolutions: 0.5, label: "Windmill 3", detail: "three consecutive windmills are one level feature, and one of the six that unlock Level 4", transition: 0.3 },
];

/** A change of edge is credited in a sit, camel, layback, Biellmann or a difficult variation of upright, not in a plain upright. */
const allowsChangeOfEdge = (ph: SpinPhase) => ph.basic !== undefined && (ph.basic !== "upright" || ph.variation !== undefined);
/** Eight revolutions count in a camel, a layback or a difficult variation of any basic position. */
const allowsEight = (ph: SpinPhase) => ph.basic === "camel" || ph.basic === "layback" || ph.variation !== undefined;

/** Builds the animation parameters of any Scale of Values family with the chosen level features. */
export function spinFromSpec(code: string, f: SpinFeatures = {}): SpinParams {
  const fam = familyOf(code);
  const positions = spinPositions(code, f);
  const flying = fam.flying && !f.v; // a stepped-over flying entry is the V case
  const landing = positions[0];
  const phases: SpinPhase[] = [];
  if (f.windmills && !fam.flying && landing === "camel") phases.push(...WINDMILL_PHASES);
  const twoFeet = fam.changeOfFoot;
  // revolutions per position: the Short Program asks six on each foot of a spin in one position; a
  // change of foot needs three before and after it, and each basic position two
  const revsFirst = fam.combination ? 3 : twoFeet ? 4 : 6;
  const revsSecond = f.v && !fam.combination ? 2 : 3;
  if (!twoFeet) {
    positions.forEach((pos, i) => phases.push(...positionPhases(pos, f.variations?.[pos], revsFirst, "L", i === 0)));
  } else if (!fam.combination) {
    phases.push(...positionPhases(landing, f.variations?.[landing], revsFirst, "L", true));
    phases.push(changeOfFootPhase(!!f.changeByJump));
    phases.push(...positionPhases(landing, undefined, revsSecond, "R", false));
  } else {
    // the camel on the first foot, the change (landing in the sit, where a jump is credited), the sit and
    // the upright on the second foot
    const [a, ...rest] = positions;
    phases.push(...positionPhases(a, f.variations?.[a], revsFirst, "L", true));
    phases.push(changeOfFootPhase(!!f.changeByJump));
    for (const pos of rest) phases.push(...positionPhases(pos, f.variations?.[pos], revsSecond, "R", false));
  }
  if (f.changeOfEdge) {
    const target = phases.find(allowsChangeOfEdge) ?? phases.find((ph) => ph.basic);
    if (target) {
      target.changeEdge = true;
      target.revolutions = Math.max(target.revolutions, 4);
    }
  }
  if (f.eightRevolutions) {
    // eight revolutions without any change: never in the phase that changes edge; a spin with a single
    // position gets a second, unchanged hold of the same position
    const target = phases.find((ph) => allowsEight(ph) && !ph.changeEdge) ?? phases.find((ph) => ph.basic && !ph.changeEdge);
    if (target) target.revolutions = Math.max(target.revolutions, 8);
    else {
      const src = phases.find((ph) => ph.basic);
      if (src) phases.splice(phases.indexOf(src) + 1, 0, { ...src, changeEdge: undefined, revolutions: 8, label: `${src.label}, held`, detail: "no change of position, variation, foot or edge for eight revolutions", transition: 0.3 });
    }
  }
  const fly = FLY_POSE[landing];
  const difficultFly = flying && !!f.difficultFly;
  return {
    id: `${spinCode(code, f)}:${JSON.stringify(f)}`,
    title: fam.name,
    entry: flying ? "fly" : f.difficultEntrance ? "threes" : "step",
    flyPose: flying ? (difficultFly ? fly.difficult : fly.plain) : undefined,
    flyHeight: difficultFly ? 0.72 : undefined,
    flyDetail: flying ? (difficultFly ? fly.difficultDetail : fly.plainDetail) : undefined,
    phases,
    rps: landing === "upright" && positions.length === 1 ? 2.2 : 1.7,
  };
}

export interface SpinFeatureNote {
  /** Handbook name of the feature. */
  name: string;
  /** Feature number in the handbook's list (1–15). */
  number: number;
  /** Whether it is one of the six that unlock Level 4. */
  mandatory: boolean;
  /** Whether the animation shows it in a way the panel would count. */
  counted: boolean;
  note: string;
}

/** The level features shown by a spec, in the handbook's words, and the level they would support. */
export function spinFeatureNotes(code: string, f: SpinFeatures = {}): { features: SpinFeatureNote[]; supported: SpinLevel; mandatoryCounted: boolean; positions: { position: BasicPosition; variation?: string }[] } {
  const fam = familyOf(code);
  const params = spinFromSpec(code, f);
  const feature = (n: number) => SPIN_LEVEL_FEATURES.find((x) => x.number === n)!;
  const out: SpinFeatureNote[] = [];
  const positions = spinPositions(code, f).map((position) => ({ position, variation: f.variations?.[position] }));
  const variations = positions.filter((p) => p.variation).map((p) => p.variation!);
  variations.forEach((id, i) => {
    const cat = VARIATION_CATEGORIES.find((c) => c.id === id);
    const counted = i < 2;
    out.push({ name: `${feature(1).name}: ${cat?.name ?? VARIATION_POSE[id]?.name ?? id}`, number: 1, mandatory: false, counted, note: counted ? "held for two revolutions; each of the ten categories counts once per program" : "only two difficult variations are counted in any spin" });
  });
  if (f.changeByJump && fam.changeOfFoot) {
    const landsIn = params.phases[params.phases.findIndex((ph) => ph.jump) + 1]?.basic;
    const counted = landsIn === "camel" || landsIn === "sit";
    out.push({ name: feature(2).name, number: 2, mandatory: false, counted, note: counted ? `the jump lands in a ${landsIn} position within two revolutions` : "not credited into an upright position" });
  }
  if (f.difficultEntrance && !fam.flying) out.push({ name: `${feature(5).name}: travelling threes`, number: 5, mandatory: false, counted: true, note: "two revolutions turned without the free foot touching the ice; the basic position is reached within two revolutions" });
  if (f.changeOfEdge) {
    const ph = params.phases.find((x) => x.changeEdge);
    const counted = !!ph && allowsChangeOfEdge(ph);
    out.push({ name: feature(7).name, number: 7, mandatory: true, counted, note: counted ? `two revolutions on each edge in the ${ph!.basic} position` : "only in a sit, camel, layback, Biellmann or a difficult upright variation" });
  }
  if (f.eightRevolutions) {
    const ph = params.phases.find((x) => x.basic && x.revolutions >= 8);
    const counted = !!ph && allowsEight(ph);
    out.push({ name: feature(10).name, number: 10, mandatory: false, counted, note: counted ? `eight revolutions in the ${ph!.variation ? VARIATION_POSE[ph!.variation]?.name ?? ph!.basic : ph!.basic}` : "only in a camel, a layback or a difficult variation of a basic position" });
  }
  if (f.difficultFly && fam.flying) out.push({ name: feature(11).name, number: 11, mandatory: true, counted: !f.v, note: f.v ? "the entry was stepped over: no flying feature" : "a clear jump with a genuinely difficult air position, the basic position reached within two revolutions of landing" });
  if (f.windmills && !fam.flying && spinPositions(code, f)[0] === "camel") out.push({ name: feature(13).name, number: 13, mandatory: true, counted: true, note: "three consecutive windmills, each close to a split" });
  if (f.variations?.layback === "sideways") out.push({ name: feature(14).name, number: 14, mandatory: false, counted: true, note: "two revolutions in each position without rising to upright" });
  if (f.variations?.layback === "UB" && fam.position === "L") out.push({ name: feature(15).name, number: 15, mandatory: false, counted: true, note: "taken after the required revolutions in the layback" });
  const counted = out.filter((x) => x.counted).length;
  const mandatoryCounted = out.some((x) => x.counted && x.mandatory);
  const supported: SpinLevel = counted === 0 ? "B" : counted >= 4 && mandatoryCounted ? 4 : (Math.min(3, counted) as SpinLevel);
  return { features: out, supported, mandatoryCounted, positions };
}
