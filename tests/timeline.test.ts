import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import { JUMP_BY_ID } from "@/data/jumps";
import type { JumpId } from "@/data/types";
import { EDGE_ROLL_TIME, entryKindOf, entrySegments, FLAT_TIME, jumpModel, jumpTimeline, MISSING_TURNS } from "@/three/animation/jumps";
import { markerAt, poseAt, TWO_PI, type RootState } from "@/three/animation/timeline";
import { JUMP_POSES } from "@/three/rig/poses-jumps";
import { defaultRest } from "@/three/rig/limits";

describe("jump timeline", () => {
  it("rotates the named number of revolutions, all but the short blade skid before touchdown", () => {
    const tl = jumpTimeline({ jump: JUMP_BY_ID.Lz, rotations: 4 });
    const r = tl.rotation!;
    const counted = (tl.root(r.end).yaw - r.yawStart!) / TWO_PI;
    expect(counted).toBeCloseTo(4 - jumpModel({ jump: JUMP_BY_ID.Lz, rotations: 4 }).skid / TWO_PI, 5);
    expect(counted).toBeGreaterThan(3.8);
    expect(tl.root(r.end).yaw - tl.root(r.start).yaw).toBeLessThan(4 * TWO_PI);
    expect(tl.root(r.start).y).toBeCloseTo(0, 5);
    expect(tl.root((r.start + r.end) / 2).y).toBeGreaterThan(0.5);
  });
  it("gives the Axel an extra half revolution and a forward take-off", () => {
    const tl = jumpTimeline({ jump: JUMP_BY_ID.A, rotations: 3 });
    expect(tl.rotation!.nominal).toBe(3.5);
    const r = tl.rotation!;
    expect((tl.root(r.end).yaw - r.yawStart!) / TWO_PI).toBeCloseTo(3.5 - jumpModel({ jump: JUMP_BY_ID.A, rotations: 3 }).skid / TWO_PI, 5);
    // facing +X (direction of travel) at take-off, unlike the backward toe loop
    expect(Math.sin(r.yawStart!)).toBeGreaterThan(0.8);
    const toe = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3 });
    expect(Math.sin(toe.rotation!.yawStart!)).toBeLessThan(-0.8);
  });
  it("short-changes the air rotation for q, < and <<", () => {
    for (const call of ["q", "<", "<<"] as const) {
      const tl = jumpTimeline({ jump: JUMP_BY_ID.T, rotations: 3, call });
      expect(tl.rotation!.turns).toBeCloseTo(3 - MISSING_TURNS[call], 5);
    }
  });
  it("curves the Lutz entry the opposite way to the flip", () => {
    const lz = jumpTimeline({ jump: JUMP_BY_ID.Lz, rotations: 3 });
    const f = jumpTimeline({ jump: JUMP_BY_ID.F, rotations: 3 });
    expect(lz.root(0).z).toBeGreaterThan(0);
    expect(f.root(0).z).toBeLessThan(0);
    expect(Math.abs(lz.root(lz.rotation!.start).x)).toBeLessThan(1e-6);
  });
  it("lands backward on the right foot and provides poses and markers throughout", () => {
    const tl = jumpTimeline({ jump: JUMP_BY_ID.S, rotations: 2 });
    const landing = tl.trace.filter((s) => s.t >= tl.rotation!.end);
    expect(landing.every((s) => s.foot === "R" && s.edge === "outside")).toBe(true);
    // the Salchow enters with a left forward outside three turn, then rides the back inside edge
    const turn = tl.markers.find((m) => m.label === "Three turn")!.t;
    const entry = tl.trace.filter((s) => s.t > turn + 0.4 && s.t < tl.rotation!.start);
    expect(entry.every((s) => s.foot === "L" && s.edge === "inside")).toBe(true);
    expect(tl.trace.filter((s) => s.t < turn - 0.05).every((s) => s.foot === "L" && s.edge === "outside")).toBe(true);
    const rest = () => [0, -1, 0] as [number, number, number];
    for (let t = 0; t <= tl.duration; t += 0.37) expect(Object.keys(poseAt(tl, t, rest).bones).length).toBeGreaterThan(0);
    expect(markerAt(tl, tl.rotation!.start + 0.2)?.label).toBe("Rotation");
    expect(tl.duration).toBeGreaterThan(3.5);
  });
});

describe("turn and choreo timelines", async () => {
  const { turnTimeline, choreoTimeline, TURN_SPECS } = await import("@/three/animation/steps");
  const rest = () => [0, -1, 0] as [number, number, number];
  /** +1 when the skater faces the direction of travel, -1 when skating backward. */
  const facing = (tl: { root: (t: number) => { x: number; z: number; yaw: number } }, t: number) => {
    const a = tl.root(t);
    const b = tl.root(t + 0.02);
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const l = Math.hypot(vx, vz) || 1;
    return (Math.sin(a.yaw) * vx + Math.cos(a.yaw) * vz) / l;
  };
  it("flips the facing by a half turn and changes edge on a three turn", () => {
    const tl = turnTimeline("three-turn");
    expect(facing(tl, 0.5)).toBeGreaterThan(0.95);
    expect(facing(tl, tl.duration - 0.5)).toBeLessThan(-0.95);
    const edges = new Set(tl.trace.map((s) => s.edge));
    expect(edges).toEqual(new Set(["outside", "inside"]));
    expect(tl.trace.every((s) => s.foot === "L")).toBe(true);
  });
  it("keeps the edge and changes lobe on a rocker", () => {
    const tl = turnTimeline("rocker");
    expect(new Set(tl.trace.map((s) => s.edge))).toEqual(new Set(["outside"]));
    expect(tl.root(0.3).z).toBeLessThan(0);
    expect(tl.root(tl.duration - 0.3).z).toBeGreaterThan(0);
  });
  it("turns twice on a twizzle and ends facing forward", () => {
    const tl = turnTimeline("twizzle");
    expect(tl.rotation!.turns).toBe(2);
    expect(facing(tl, 0.5)).toBeGreaterThan(0.95);
    expect(facing(tl, tl.duration - 0.5)).toBeGreaterThan(0.95);
    expect(facing(turnTimeline("rocker"), tl.duration - 0.5)).toBeLessThan(-0.95);
  });
  it("changes foot on a mohawk and choctaw", () => {
    expect(new Set(turnTimeline("mohawk").trace.map((s) => s.foot))).toEqual(new Set(["L", "R"]));
    expect(new Set(turnTimeline("choctaw").trace.map((s) => s.edge))).toEqual(new Set(["outside", "inside"]));
  });
  it("builds every turn and choreo movement with poses throughout", () => {
    for (const id of Object.keys(TURN_SPECS) as (keyof typeof TURN_SPECS)[]) {
      const tl = turnTimeline(id);
      for (let t = 0; t <= tl.duration; t += 0.4) expect(Object.keys(poseAt(tl, t, rest).bones).length, id).toBeGreaterThan(0);
    }
    for (const id of ["spiral", "spread-eagle", "ina-bauer", "hydroblade"] as const) {
      const tl = choreoTimeline(id);
      expect(tl.duration).toBeGreaterThan(3);
      expect(tl.markers.map((m) => m.label)).toContain(tl.title);
    }
  });
});

describe("audit additions", async () => {
  const { specialTimeline, SPECIALS } = await import("@/three/animation/special");
  const { choreoTimeline, turnTimeline, CHOREO, TURN_SPECS } = await import("@/three/animation/steps");
  const { spinPreset } = await import("@/three/animation/spins");
  const rest = () => [0, -1, 0] as [number, number, number];
  it("builds the non-listed jumps and the backflip", () => {
    for (const id of Object.keys(SPECIALS) as (keyof typeof SPECIALS)[]) {
      const tl = specialTimeline(id);
      for (let t = 0; t <= tl.duration; t += 0.4) expect(Object.keys(poseAt(tl, t, rest).bones).length, id).toBeGreaterThan(0);
    }
    const flip = specialTimeline("backflip");
    const mid = flip.root(flip.markers[2].t + 0.4);
    expect(Math.abs(mid.pitch ?? 0)).toBeGreaterThan(1);
    expect(mid.y).toBeGreaterThan(0.5);
    const walley = specialTimeline("walley");
    expect(walley.root(0).z).toBeGreaterThan(0); // counter-rotated entry like the Lutz
    expect(walley.rotation!.turns).toBe(1);
  });
  it("builds every field move and basic step", () => {
    for (const id of Object.keys(CHOREO) as (keyof typeof CHOREO)[]) expect(choreoTimeline(id).markers.map((m) => m.label)).toContain(CHOREO[id].label);
    const facing = (tl: { root: (t: number) => { x: number; z: number; yaw: number } }, t: number) => {
      const a = tl.root(t);
      const b = tl.root(t + 0.02);
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return (Math.sin(a.yaw) * (b.x - a.x) + Math.cos(a.yaw) * (b.z - a.z)) / l;
    };
    for (const id of ["change-of-edge", "cross-roll", "chasse", "toe-step"] as const) {
      const tl = turnTimeline(id);
      expect(TURN_SPECS[id].noTurn).toBe(true);
      // still skating forward after the step
      expect(facing(tl, 0.3), id).toBeGreaterThan(0.9);
      expect(facing(tl, tl.duration - 0.3), id).toBeGreaterThan(0.9);
    }
    expect(turnTimeline("toe-step").trace.some((s) => s.edge === "toe")).toBe(true);
    expect(turnTimeline("chasse").trace.some((s) => s.foot === "R")).toBe(true);
    expect(new Set(turnTimeline("change-of-edge").trace.map((s) => s.edge))).toEqual(new Set(["outside", "inside"]));
  });
  it("builds the spin shape and entry presets", () => {
    for (const code of ["shapes", "FCSpToeArabian", "threes"]) {
      const tl = spinPreset(code);
      expect(tl.trace.length).toBeGreaterThan(50);
      for (let t = 0; t <= tl.duration; t += 0.6) expect(Object.keys(poseAt(tl, t, rest).bones).length, code).toBeGreaterThan(0);
    }
    const threes = spinPreset("threes");
    expect(threes.root(1.2).yaw - threes.root(0.1).yaw).toBeGreaterThan(TWO_PI * 1.5);
  });
});

describe("per-jump entries", () => {
  /** World-space up vector of the skater, applied exactly as the Actor does. */
  const upOf = (r: RootState) => new Vector3(0, 1, 0).applyEuler(new Euler(r.pitch ?? 0, r.yaw, r.roll ?? 0, "YXZ"));
  const tl = (id: JumpId, edgeCall?: "" | "!" | "e") => jumpTimeline({ jump: JUMP_BY_ID[id], rotations: id === "Eu" ? 1 : 3, edgeCall });
  const tLoadOf = (t: ReturnType<typeof jumpTimeline>) => t.rotation!.start - 0.4;
  /** Entry samples on the take-off foot and edge: after the turn or step, before the pick. */
  const onEdge = (t: ReturnType<typeof jumpTimeline>) => {
    const turn = t.markers.find((m) => m.label === "Three turn" || m.label === "Step forward");
    return t.trace.filter((s) => (turn ? s.t > turn.t + 0.4 : true) && s.t < t.rotation!.start && s.edge !== "toe");
  };
  it("rides the listed foot and edge into every take-off, with the listed kind of entry", () => {
    const expected: Record<JumpId, [string, string, string]> = {
      T: ["R", "outside", "three-turn"],
      S: ["L", "inside", "three-turn"],
      Lo: ["R", "outside", "edge"],
      F: ["L", "inside", "three-turn"],
      Lz: ["L", "outside", "long-edge"],
      A: ["L", "outside", "step-forward"],
      Eu: ["R", "outside", "edge"],
    };
    for (const id of Object.keys(expected) as JumpId[]) {
      const [foot, edge, kind] = expected[id];
      const t = tl(id);
      expect(entryKindOf(JUMP_BY_ID[id]), id).toBe(kind);
      const samples = onEdge(t);
      expect(samples.length, id).toBeGreaterThan(20);
      expect(samples.every((s) => s.foot === foot && s.edge === edge), `${id} entry`).toBe(true);
      // the three turn starts on the other edge of the same foot; the Axel's step starts on the other foot
      const first = t.trace[0];
      if (kind === "three-turn") expect([first.foot, first.edge]).toEqual([foot, edge === "inside" ? "outside" : "inside"]);
      else if (kind === "step-forward") expect([first.foot, first.edge]).toEqual(["R", "outside"]);
      else expect([first.foot, first.edge]).toEqual([foot, edge]);
    }
  });
  it("curves the Lutz lobe to +Z and leans it toward +Z, every other jump to -Z", () => {
    for (const id of ["T", "S", "Lo", "F", "Lz", "A", "Eu"] as JumpId[]) {
      const t = tl(id);
      const sign = id === "Lz" ? 1 : -1;
      const before = tLoadOf(t) - 0.5;
      expect(Math.sign(t.root(before).z), `${id} lobe`).toBe(sign);
      expect(Math.sign(upOf(t.root(before)).z), `${id} lean`).toBe(sign);
      expect(Math.abs(t.root(before).roll!), `${id} leans`).toBeGreaterThan(0.1);
    }
  });
  it("sweeps the edge arrow against the rotation arrow only on the Lutz", () => {
    for (const id of ["T", "S", "Lo", "F", "Lz", "A", "Eu"] as JumpId[]) {
      const [edge, rotation] = tl(id).arrows!;
      expect(edge.label.startsWith("edge curves counter-clockwise"), id).toBe(id !== "Lz");
      expect(edge.label.startsWith("edge curves clockwise"), id).toBe(id === "Lz");
      expect(Math.sign(edge.sweep), `${id} edge sweep`).toBe(id === "Lz" ? -1 : 1);
      expect(rotation.sweep).toBeGreaterThan(Math.PI);
      // the edge arrow ends where the entry edge ends: at the take-off point, just outside the trace
      const end = { x: edge.x + edge.radius * Math.sin(edge.startAngle + edge.sweep), z: edge.z + edge.radius * Math.cos(edge.startAngle + edge.sweep) };
      expect(Math.hypot(end.x, end.z), `${id} arrow end`).toBeCloseTo(0.3, 6);
    }
  });
  it("plants the toe pick behind the take-off point on the picking foot's own side", () => {
    for (const id of ["T", "F", "Lz"] as JumpId[]) {
      const t = tl(id);
      const toe = t.trace.find((s) => s.edge === "toe")!;
      const foot = JUMP_BY_ID[id].takeOff.toePickFoot === "left" ? "L" : "R";
      expect(toe.foot, id).toBe(foot);
      expect(toe.x).toBeLessThan(-0.2);
      expect(toe.t).toBeCloseTo(t.rotation!.start, 9);
      // the skater faces -X at the pick, so the left foot lies toward +Z and the right toward -Z
      expect(Math.sign(toe.z), `${id} toe side`).toBe(foot === "L" ? 1 : -1);
      // the picking foot is the free leg of the reach pose: its thigh points back
      const pose = poseAt(t, tLoadOf(t) + 0.2, defaultRest);
      const free = foot === "L" ? pose.bones.thigh_L! : pose.bones.thigh_R!;
      expect(free.dir[2], `${id} reach`).toBeLessThan(-0.5);
    }
    for (const id of ["S", "Lo", "A", "Eu"] as JumpId[]) expect(tl(id).trace.some((s) => s.edge === "toe"), id).toBe(false);
  });
  it("crosses the Loop's free foot in front on the right back outside edge", () => {
    const t = tl("Lo");
    for (const time of [0.2, tLoadOf(t) - 0.3, tLoadOf(t) + 0.2]) {
      const pose = poseAt(t, time, defaultRest);
      // standing on the right: the right ankle is the lower one
      const ankle = (side: "L" | "R") => 0.45 * pose.bones[`thigh_${side}`]!.dir[1] + 0.43 * pose.bones[`shin_${side}`]!.dir[1];
      expect(ankle("R"), `Lo at ${time}`).toBeLessThan(ankle("L"));
      // the left thigh reaches forward and across the midline toward the right
      expect(pose.bones.thigh_L!.dir[2], `Lo at ${time} in front`).toBeGreaterThan(0.2);
      expect(pose.bones.thigh_L!.dir[0], `Lo at ${time} crossed`).toBeLessThan(-0.1);
    }
    expect(JUMP_POSES.loopGlide.bones.thigh_L!.dir[0]).toBeLessThan(0);
    expect(t.markers.find((m) => m.label === "Entry edge")!.detail).toContain("crossed in front");
    // the Salchow swings the free leg wide at take-off, the Axel drives the knee up, the Loop keeps the foot crossed
    const s = tl("S");
    const swing = poseAt(s, s.rotation!.start, defaultRest).bones.thigh_R!.dir;
    expect(swing[0]).toBeLessThan(-0.3);
    expect(swing[2]).toBeGreaterThan(0.4);
    const a = tl("A");
    expect(poseAt(a, a.rotation!.start, defaultRest).bones.thigh_R!.dir[2]).toBeGreaterThan(0.9);
    expect(poseAt(t, t.rotation!.start, defaultRest).bones.thigh_L!.dir[0]).toBeLessThan(-0.1);
  });
  it("holds the Lutz upper body against the rotation and the Axel's arms back before the swing", () => {
    const lz = tl("Lz");
    const glide = poseAt(lz, 1.0, defaultRest);
    expect(glide.bones.chest!.twist).toBeLessThan(-0.2);
    expect(glide.bones.head!.twist).toBeLessThan(-0.5);
    expect(glide.bones.upper_arm_L!.dir[2]).toBeGreaterThan(0.5); // the left arm leads
    expect(glide.bones.upper_arm_R!.dir[2]).toBeLessThan(-0.4); // the right arm trails back
    const a = tl("A");
    const load = poseAt(a, tLoadOf(a) + 0.22, defaultRest);
    expect(load.bones.upper_arm_L!.dir[2]).toBeLessThan(-0.6);
    expect(load.bones.upper_arm_R!.dir[2]).toBeLessThan(-0.6);
    const launch = poseAt(a, a.rotation!.start, defaultRest);
    expect(launch.bones.upper_arm_L!.dir[2]).toBeGreaterThan(0.6);
    expect(launch.bones.upper_arm_R!.dir[2]).toBeGreaterThan(0.6);
  });
});

describe("edge calls", () => {
  const upOf = (r: RootState) => new Vector3(0, 1, 0).applyEuler(new Euler(r.pitch ?? 0, r.yaw, r.roll ?? 0, "YXZ"));
  const tl = (id: "F" | "Lz", edgeCall: "" | "!" | "e") => jumpTimeline({ jump: JUMP_BY_ID[id], rotations: 3, edgeCall });
  it("rolls a lip onto the inside edge and a flutz onto the outside edge before the pick, flipping lobe, lean and trace", () => {
    for (const id of ["Lz", "F"] as const) {
      const clean = tl(id, "");
      const wrong = tl(id, "e");
      const start = wrong.rotation!.start;
      const rolledEdge = id === "Lz" ? "inside" : "outside";
      const sign = id === "Lz" ? -1 : 1; // the rolled lobe bends the other way
      // the geometry of the lobe the skater leaves from
      const segs = entrySegments({ jump: JUMP_BY_ID[id], rotations: 3, edgeCall: "e" });
      expect(segs[0].edge).toBe(rolledEdge);
      expect(segs[0].duration).toBe(EDGE_ROLL_TIME);
      expect(Math.sign(segs[0].curvature)).toBe(-Math.sign(segs[1].curvature));
      expect(Math.sign(segs[0].curvature)).toBe(-Math.sign(entrySegments({ jump: JUMP_BY_ID[id], rotations: 3 })[0].curvature));
      // trace: the rolled edge in the other colour over the last EDGE_ROLL_TIME, the jump's own edge before it
      const rolled = wrong.trace.filter((s) => s.t > start - EDGE_ROLL_TIME + 0.03 && s.t < start && s.edge !== "toe");
      expect(rolled.length).toBeGreaterThan(20);
      expect(rolled.every((s) => s.foot === "L" && s.edge === rolledEdge)).toBe(true);
      const turn = wrong.markers.find((m) => m.label === "Three turn");
      const before = wrong.trace.filter((s) => s.t > (turn ? turn.t + 0.4 : 0) && s.t < start - EDGE_ROLL_TIME - 0.03);
      expect(before.length).toBeGreaterThan(5);
      expect(before.every((s) => s.edge === JUMP_BY_ID[id].takeOff.edge)).toBe(true);
      // the lobe: the path bends the other way over the roll, so z near the pick has the opposite sign to the clean jump's
      const tProbe = start - 0.45;
      expect(Math.sign(wrong.root(tProbe).z)).toBe(sign);
      expect(Math.sign(clean.root(tProbe).z)).toBe(-sign);
      // the lean flips with it, and is the other jump's lean (7 m lobe for a lip, 13 m for a flutz)
      expect(Math.sign(upOf(wrong.root(tProbe)).z)).toBe(sign);
      expect(Math.sign(upOf(clean.root(tProbe)).z)).toBe(-sign);
      const other = jumpModel({ jump: JUMP_BY_ID[id === "Lz" ? "F" : "Lz"], rotations: 3 }).lean;
      expect(Math.abs(wrong.root(tProbe).roll!)).toBeCloseTo(other, 6);
      // before the roll the entry is the jump's own lobe, leaning the jump's own way by the jump's own lean
      const early = turn ? turn.t + 0.45 : 0.8;
      expect(Math.sign(upOf(wrong.root(early)).z)).toBe(-sign);
      expect(Math.abs(wrong.root(early).roll!)).toBeCloseTo(jumpModel({ jump: JUMP_BY_ID[id], rotations: 3 }).lean, 6);
      // the flutz turns its three a little earlier so the inside edge shows before the roll
      if (turn) expect(turn.t).toBeLessThan(clean.markers.find((m) => m.label === "Three turn")!.t);
      // the drift of the heading during the vault follows the rolled lobe, so the pre-rotation differs from the clean jump's
      expect(Math.abs(jumpModel({ jump: JUMP_BY_ID[id], rotations: 3, edgeCall: "e" }).preRotation - jumpModel({ jump: JUMP_BY_ID[id], rotations: 3 }).preRotation)).toBeGreaterThan(0.01);
      // still a complete, monotonic rotation
      expect((wrong.root(wrong.rotation!.end).yaw - wrong.rotation!.yawStart!) / TWO_PI).toBeCloseTo(3 - jumpModel({ jump: JUMP_BY_ID[id], rotations: 3, edgeCall: "e" }).skid / TWO_PI, 5);
      let prev = wrong.root(start - 0.1).yaw;
      for (let t = start - 0.1; t <= wrong.rotation!.end; t += 0.002) {
        expect(wrong.root(t).yaw, `${id}e at ${t.toFixed(3)}`).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = wrong.root(t).yaw;
      }
      // arrows, markers and HUD text say what was called
      expect(wrong.arrows![0].label).toContain(id === "Lz" ? "lip" : "flutz");
      expect(Math.sign(wrong.arrows![0].sweep)).toBe(-Math.sign(clean.arrows![0].sweep));
      expect(wrong.markers.find((m) => m.label === `Edge rolls ${rolledEdge}`)!.t).toBeCloseTo(start - EDGE_ROLL_TIME, 9);
      expect(wrong.markers.find((m) => m.label === "Take-off")!.detail).toContain(`3${id}e`);
      expect(wrong.id).toBe(`3${id}e`);
      expect(wrong.title).toContain(id === "Lz" ? "lip" : "flutz");
    }
  });
  it("rides a flat with no lean for the last FLAT_TIME seconds on an unclear edge", () => {
    for (const id of ["Lz", "F"] as const) {
      const clean = tl(id, "");
      const unclear = tl(id, "!");
      const start = unclear.rotation!.start;
      const flat = unclear.trace.filter((s) => s.t > start - FLAT_TIME + 0.03 && s.t < start && s.edge !== "toe");
      expect(flat.length).toBeGreaterThan(10);
      expect(flat.every((s) => s.edge === "flat" && s.foot === "L")).toBe(true);
      expect(unclear.trace.filter((s) => s.t > 1.5 && s.t < start - FLAT_TIME - 0.03).every((s) => s.edge === JUMP_BY_ID[id].takeOff.edge)).toBe(true);
      // no roll anywhere on the flat; the clean jump still leans there
      for (const t of [start - 0.35, start - 0.2, start - 0.1]) expect(unclear.root(t).roll, `${id}! at ${t}`).toBe(0);
      expect(Math.abs(clean.root(start - 0.35).roll!)).toBeGreaterThan(0.05);
      // the path runs straight along the flat into the take-off point
      for (const t of [start - 0.3, start - 0.15]) expect(Math.abs(unclear.root(t).z), `${id}! straight`).toBeLessThan(1e-9);
      // the heading does not drift on a flat, so the vault starts from the air rate alone
      const m = jumpModel({ jump: JUMP_BY_ID[id], rotations: 3, edgeCall: "!" });
      expect(m.omegaIce).toBeCloseTo(Math.max(0.5, m.spin.omegaTakeoff), 6);
      expect(unclear.markers.find((m) => m.label === "Flat blade")!.t).toBeCloseTo(start - FLAT_TIME, 9);
      expect(unclear.markers.find((m) => m.label === "Take-off")!.detail).toContain(`3${id}!`);
      expect(unclear.arrows![0].label).toContain("flat");
      expect(Math.sign(unclear.arrows![0].sweep)).toBe(Math.sign(clean.arrows![0].sweep));
      expect(unclear.id).toBe(`3${id}!`);
    }
  });
  it("ignores edge calls on jumps the panel never calls for their edge", () => {
    for (const id of ["T", "S", "Lo", "A"] as const) {
      const a = jumpTimeline({ jump: JUMP_BY_ID[id], rotations: 3 });
      const b = jumpTimeline({ jump: JUMP_BY_ID[id], rotations: 3, edgeCall: "e" });
      expect(b.id).toBe(a.id);
      expect(b.root(1.2)).toEqual(a.root(1.2));
      expect(b.trace.map((s) => s.edge)).toEqual(a.trace.map((s) => s.edge));
    }
  });
});
