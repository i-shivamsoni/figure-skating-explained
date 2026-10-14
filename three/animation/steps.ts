import { POSES } from "../rig/poses";
import { clamp01, easeInOut, easeOut, headingOf, linear, TWO_PI, type Marker, type PoseKey, type RootState, type Timeline, type TraceSample, type EdgeKind } from "./timeline";

export type TurnId = "three-turn" | "bracket" | "rocker" | "counter" | "loop" | "twizzle" | "mohawk" | "choctaw";

interface TurnSpec {
  /** Rotation of the body at the cusp relative to the curve: with = toward the circle centre. */
  rotation: "with" | "against";
  changesEdge: boolean;
  changesLobe: boolean;
  changesFoot: boolean;
  /** Extra revolutions (twizzle). */
  revolutions?: number;
  loop?: boolean;
  label: string;
  detail: string;
}

export const TURN_SPECS: Record<TurnId, TurnSpec> = {
  "three-turn": { rotation: "with", changesEdge: true, changesLobe: false, changesFoot: false, label: "Three turn", detail: "forward outside to backward inside, turning into the curve: the cusp points inside the circle" },
  bracket: { rotation: "against", changesEdge: true, changesLobe: false, changesFoot: false, label: "Bracket", detail: "same edge change as a three turn, but the body turns against the curve: the cusp points outward" },
  rocker: { rotation: "with", changesEdge: false, changesLobe: true, changesFoot: false, label: "Rocker", detail: "outside to outside, turning with the entry curve and changing lobe: an S on the ice" },
  counter: { rotation: "against", changesEdge: false, changesLobe: true, changesFoot: false, label: "Counter", detail: "outside to outside, turning against the entry curve and changing lobe" },
  loop: { rotation: "with", changesEdge: false, changesLobe: false, changesFoot: false, loop: true, label: "Loop", detail: "a tight circle about a blade length long drawn on one edge" },
  twizzle: { rotation: "with", changesEdge: false, changesLobe: false, changesFoot: false, revolutions: 2, label: "Twizzle", detail: "a travelling turn of at least two revolutions on one foot" },
  mohawk: { rotation: "with", changesEdge: false, changesLobe: false, changesFoot: true, label: "Mohawk", detail: "a step to the other foot, forward to backward, keeping the same kind of edge" },
  choctaw: { rotation: "with", changesEdge: true, changesLobe: true, changesFoot: true, label: "Choctaw", detail: "a step to the other foot, forward to backward, onto the opposite kind of edge" },
};

const R = 3.2; // lobe radius
const SPEED = 3.0;
const LOBE = 1.6; // seconds on each lobe
const TURN = 0.35;

/**
 * One turn or step in a step sequence, viewed on its lobes: glide in on a forward outside
 * edge, turn at the cusp, glide out. The cusp is the origin; the entry travels toward +X.
 */
export function turnTimeline(id: TurnId): Timeline {
  const spec = TURN_SPECS[id];
  const tTurn = LOBE;
  const tOut = LOBE + TURN;
  const duration = tOut + LOBE;
  // entry lobe: circle centre on -Z (curving to the skater's left on a left forward outside edge)
  const cIn = -R;
  const cOut = spec.changesLobe ? R : -R;
  const yawFwd = headingOf(1, 0);
  const spin = (spec.revolutions ?? 0) * TWO_PI;
  const flip = spec.rotation === "with" ? Math.PI : -Math.PI;

  const drift = spec.loop ? 0 : TURN * SPEED * (spec.revolutions ? 0.6 : 0.3);
  const cuspTurn = spec.loop ? 0 : spec.revolutions ? spin : flip;

  const root = (t: number): RootState => {
    if (t < tTurn) {
      const phi = ((t - tTurn) * SPEED) / R; // negative before the cusp
      return { x: R * Math.sin(phi), y: 0, z: cIn + R * Math.cos(phi), yaw: yawFwd + phi };
    }
    if (t < tOut) {
      const u = easeInOut(clamp01((t - tTurn) / TURN));
      if (spec.loop) {
        const a = u * TWO_PI;
        return { x: 0.35 * Math.sin(a), y: 0, z: -0.35 + 0.35 * Math.cos(a), yaw: yawFwd + a };
      }
      return { x: drift * u, y: 0, z: 0, yaw: yawFwd + cuspTurn * u };
    }
    const phi = ((t - tOut) * SPEED) / R;
    if (cOut < 0) return { x: drift + R * Math.sin(phi), y: 0, z: -R + R * Math.cos(phi), yaw: yawFwd + phi + cuspTurn };
    return { x: drift + R * Math.sin(phi), y: 0, z: R - R * Math.cos(phi), yaw: yawFwd - phi + cuspTurn };
  };

  const entryEdge: EdgeKind = "outside";
  const exitEdge: EdgeKind = spec.changesEdge ? "inside" : "outside";
  const trace: TraceSample[] = [];
  for (let t = 0; t <= duration; t += 1 / 50) {
    const r = root(t);
    const after = t >= tTurn + TURN / 2;
    trace.push({ t, x: r.x, z: r.z, foot: after && spec.changesFoot ? "R" : "L", edge: after ? exitEdge : entryEdge });
  }

  const keys: PoseKey[] = [
    { t: 0, pose: POSES.glideFO },
    { t: tTurn - 0.3, pose: POSES.turnReady, ease: easeInOut },
    { t: tTurn + TURN / 2, pose: spec.revolutions ? POSES.twizzle : POSES.turnReady, ease: easeOut },
    { t: tOut + 0.3, pose: spec.changesFoot ? POSES.glideBO : POSES.glideBO, ease: easeInOut },
    { t: duration, pose: POSES.glideBO, ease: linear },
  ];
  const markers: Marker[] = [
    { t: 0, label: "Entry", detail: "left forward outside edge" },
    { t: tTurn - 0.3, label: spec.label, detail: spec.detail },
    { t: tOut + 0.2, label: "Exit", detail: `${spec.changesFoot ? "right" : "left"} backward ${exitEdge} edge${spec.changesLobe ? " on the opposite lobe" : ""}` },
  ];
  return {
    id,
    title: spec.label,
    duration,
    keys,
    root,
    markers,
    trace,
    rotation: spec.revolutions ? { start: tTurn, end: tOut, turns: spec.revolutions, nominal: spec.revolutions } : undefined,
    focus: { x: 0, z: 0 },
    heading: 0,
  };
}

export type ChoreoId = "spiral" | "spread-eagle" | "ina-bauer" | "hydroblade";

const CHOREO: Record<ChoreoId, { pose: string; label: string; detail: string; sideways?: boolean; edge: EdgeKind; feet: "L" | "R" | "both" }> = {
  spiral: { pose: "arabesque", label: "Spiral", detail: "free leg held above hip level on a long edge", edge: "outside", feet: "L" },
  "spread-eagle": { pose: "spreadEagle", label: "Spread eagle", detail: "both feet on the ice, heels together, toes turned out, gliding sideways to the travel", sideways: true, edge: "outside", feet: "both" },
  "ina-bauer": { pose: "inaBauer", label: "Ina Bauer", detail: "one knee bent forward, the other leg straight behind, back arched; both blades on parallel edges", sideways: true, edge: "inside", feet: "both" },
  hydroblade: { pose: "hydroblade", label: "Hydroblade", detail: "a deep lean on a back inside edge with the body almost on the ice", edge: "inside", feet: "L" },
};

/** A gliding choreographic movement held along a long curve. */
export function choreoTimeline(id: ChoreoId): Timeline {
  const spec = CHOREO[id];
  const RC = 9;
  const duration = 4.2;
  const hold = { from: 0.9, to: 3.4 };
  const yawFwd = headingOf(1, 0);
  const root = (t: number): RootState => {
    const phi = ((t - duration / 2) * 3.8) / RC;
    const travel = yawFwd + phi;
    const u = easeInOut(clamp01((t - hold.from + 0.4) / 0.8)) * (1 - easeInOut(clamp01((t - hold.to) / 0.6)));
    const yaw = spec.sideways ? travel + (Math.PI / 2) * u : travel;
    return { x: RC * Math.sin(phi), y: 0, z: -RC + RC * Math.cos(phi), yaw };
  };
  const trace: TraceSample[] = [];
  for (let t = 0; t <= duration; t += 1 / 40) {
    const r = root(t);
    trace.push({ t, x: r.x, z: r.z, foot: t > hold.from && t < hold.to ? spec.feet : "L", edge: t > hold.from && t < hold.to ? spec.edge : "outside" });
  }
  const keys: PoseKey[] = [
    { t: 0, pose: POSES.glideFO },
    { t: hold.from - 0.4, pose: POSES.glideFO },
    { t: hold.from + 0.4, pose: POSES[spec.pose], ease: easeInOut },
    { t: hold.to, pose: POSES[spec.pose], ease: linear },
    { t: hold.to + 0.6, pose: POSES.glideFO, ease: easeInOut },
    { t: duration, pose: POSES.glideFO, ease: linear },
  ];
  const markers: Marker[] = [
    { t: 0, label: "Glide", detail: "building speed on a long edge" },
    { t: hold.from, label: spec.label, detail: spec.detail },
    { t: hold.to, label: "Recover", detail: "back to a normal skating position" },
  ];
  return { id, title: spec.label, duration, keys, root, markers, trace, focus: { x: 0, z: 0 }, heading: 0 };
}
