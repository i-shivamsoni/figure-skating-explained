import { describe, expect, it } from "vitest";
import { Bone, Group, Quaternion, Vector3 } from "three";
import { SkaterRig } from "@/three/rig/rig";
import { BONES, TAIL_CHILD, type BoneName } from "@/three/rig/bones";
import { lerpPose, limb, slerpDir, vec, type Pose } from "@/three/rig/pose";
import { ORDER, defaultRest, derivePelvisTilt, poseDir, poseFrames, resolvePose, validatePose } from "@/three/rig/limits";
import { POSES, mirrorPose } from "@/three/rig/allPoses";

/** Builds a synthetic skeleton with the exported bone names, in roughly the exported proportions. */
function syntheticSkeleton() {
  const pos: Record<string, [number, number, number]> = {
    root: [0, 0, 0], hips: [0, 0.9, 0], spine: [0, 0.13, 0], chest: [0, 0.16, 0], neck: [0, 0.19, 0], head: [0, 0.09, 0], head_tip: [0, 0.21, 0],
    shoulder_L: [0.03, -0.02, 0], upper_arm_L: [0.13, -0.01, 0], forearm_L: [0.13, -0.27, 0], hand_L: [0.1, -0.21, 0], hand_L_tip: [0.04, -0.09, 0],
    shoulder_R: [-0.03, -0.02, 0], upper_arm_R: [-0.13, -0.01, 0], forearm_R: [-0.13, -0.27, 0], hand_R: [-0.1, -0.21, 0], hand_R_tip: [-0.04, -0.09, 0],
    thigh_L: [0.09, -0.02, 0], shin_L: [0, -0.38, 0], foot_L: [0, -0.37, 0], foot_L_tip: [0, -0.06, 0.16],
    thigh_R: [-0.09, -0.02, 0], shin_R: [0, -0.38, 0], foot_R: [0, -0.37, 0], foot_R_tip: [0, -0.06, 0.16],
  };
  const parent: Record<string, string | null> = {
    root: null, hips: "root", spine: "hips", chest: "spine", neck: "chest", head: "neck", head_tip: "head",
    shoulder_L: "chest", upper_arm_L: "shoulder_L", forearm_L: "upper_arm_L", hand_L: "forearm_L", hand_L_tip: "hand_L",
    shoulder_R: "chest", upper_arm_R: "shoulder_R", forearm_R: "upper_arm_R", hand_R: "forearm_R", hand_R_tip: "hand_R",
    thigh_L: "hips", shin_L: "thigh_L", foot_L: "shin_L", foot_L_tip: "foot_L",
    thigh_R: "hips", shin_R: "thigh_R", foot_R: "shin_R", foot_R_tip: "foot_R",
  };
  const bones = new Map<string, Bone>();
  const group = new Group();
  for (const name of BONES) {
    const b = new Bone();
    b.name = name;
    b.position.set(...pos[name]);
    bones.set(name, b);
    const p = parent[name];
    if (p) bones.get(p)!.add(b);
    else group.add(b);
  }
  group.updateMatrixWorld(true);
  return { group, bones };
}

describe("SkaterRig", () => {
  it("captures rest directions from tail bones", () => {
    const { group } = syntheticSkeleton();
    const rig = new SkaterRig(group);
    expect(rig.restDir("thigh_L")).toEqual([0, -1, 0]);
    const foot = rig.restDir("foot_L");
    expect(foot[2]).toBeGreaterThan(0.9);
    expect(rig.height).toBeGreaterThan(1.5);
  });

  it("aims a bone at a world direction and keeps children following", () => {
    const { group, bones } = syntheticSkeleton();
    const rig = new SkaterRig(group);
    rig.applyPose({ bones: { thigh_L: { dir: vec(0, 0, 1) } } });
    const d = rig.currentDir("thigh_L");
    expect(d.z).toBeCloseTo(1, 5);
    expect(Math.abs(d.y)).toBeLessThan(1e-5);
    // shin keeps its rest relation to the thigh, so it now also points forward
    const shin = rig.currentDir("shin_L");
    expect(shin.z).toBeCloseTo(1, 5);
    // world position of the knee moved forward
    group.updateMatrixWorld(true);
    const knee = new Vector3();
    bones.get("shin_L")!.getWorldPosition(knee);
    expect(knee.z).toBeGreaterThan(0.3);
    expect(knee.y).toBeCloseTo(0.88, 1);
  });

  it("can bend the knee while the thigh is raised", () => {
    const { group } = syntheticSkeleton();
    const rig = new SkaterRig(group);
    rig.applyPose({ bones: { thigh_L: { dir: vec(0, 0, 1) }, shin_L: { dir: vec(0, -1, 0) } } });
    expect(rig.currentDir("shin_L").y).toBeCloseTo(-1, 5);
    rig.reset();
    expect(rig.currentDir("shin_L").y).toBeCloseTo(-1, 5);
    expect(rig.currentDir("thigh_L").y).toBeCloseTo(-1, 5);
  });

  it("applies twist about the bone axis", () => {
    const { group, bones } = syntheticSkeleton();
    const rig = new SkaterRig(group);
    rig.applyPose({ bones: { hips: { dir: vec(0, 1, 0), twist: Math.PI / 2 } } });
    group.updateMatrixWorld(true);
    const q = new Quaternion();
    bones.get("hips")!.getWorldQuaternion(q);
    const fwd = new Vector3(0, 0, 1).applyQuaternion(q);
    expect(Math.abs(fwd.x)).toBeCloseTo(1, 5);
  });

  it("interpolates directions spherically", () => {
    const mid = slerpDir([0, -1, 0], [0, 0, 1], 0.5);
    expect(mid[1]).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(mid[2]).toBeCloseTo(Math.SQRT1_2, 5);
    const p = lerpPose({ bones: { thigh_L: { dir: [0, -1, 0] } }, hips: [0, 0, 0] }, { bones: { thigh_L: { dir: [0, 0, 1] } }, hips: [0, -0.4, 0] }, 0.5, () => [0, -1, 0]);
    expect(p.hips![1]).toBeCloseTo(-0.2);
    expect(p.bones.thigh_L!.dir[2]).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it("every posable bone has a tail child", () => {
    for (const n of Object.keys(TAIL_CHILD) as BoneName[]) expect(BONES).toContain(TAIL_CHILD[n]);
  });
});

describe("joint model (resolvePose)", () => {
  const deg = (r: number) => (r * 180) / Math.PI;

  it("fully specifies every posable bone and is idempotent", () => {
    const r = resolvePose(POSES.camel, defaultRest);
    for (const b of ORDER) {
      expect(r.bones[b], b).toBeDefined();
      expect(Number.isFinite(r.bones[b].twist), b).toBe(true);
    }
    // the player blends between keys: a pose blended with itself must resolve to the same thing
    const again = resolvePose(lerpPose(POSES.camel, POSES.camel, 0.5, defaultRest), defaultRest);
    for (const b of ORDER) {
      for (let i = 0; i < 3; i++) expect(again.bones[b].dir[i], `${b} dir`).toBeCloseTo(r.bones[b].dir[i], 6);
      expect(again.bones[b].twist, `${b} twist`).toBeCloseTo(r.bones[b].twist, 6);
    }
    expect(validatePose(r, defaultRest)).toEqual([]);
  });

  it("derives the pelvic tilt from the trunk and the legs", () => {
    expect(derivePelvisTilt(POSES.camel).pitch).toBeGreaterThan(60);
    expect(derivePelvisTilt(POSES.spiral).pitch).toBeGreaterThan(60);
    expect(derivePelvisTilt(POSES.layback).pitch).toBeLessThan(0);
    const sit = derivePelvisTilt(POSES.sit).pitch;
    expect(sit).toBeGreaterThan(0);
    expect(sit).toBeLessThan(30); // lags the trunk, which leans 30° forward
    expect(Math.abs(derivePelvisTilt(POSES.stand).pitch)).toBeLessThan(1);
    // the camel's free hip ends within its extension range only because the pelvis tipped
    expect(validatePose({ ...POSES.camel, bones: { ...POSES.camel.bones, hips: { dir: [0, 1, 0] } } }, defaultRest).some((v) => v.bone === "thigh_R" && v.rule === "backward")).toBe(true);
  });

  it("projects a shin aimed out of the knee's plane into it and reports the residual", () => {
    const pose: Pose = { bones: { thigh_L: { dir: limb(0), twist: 0 }, shin_L: { dir: limb(-40, 30) } } };
    const r = resolvePose(pose, defaultRest);
    const thigh = poseFrames(pose, defaultRest).get("thigh_L")!;
    const shin = r.bones.shin_L.dir;
    // the rendered shin lies in the plane of the thigh and the thigh's own backward direction
    const n = new Vector3().crossVectors(new Vector3(...thigh.dir), new Vector3(...thigh.forward)).normalize();
    expect(Math.abs(n.dot(new Vector3(...shin)))).toBeLessThan(1e-6);
    expect(new Vector3(...shin).dot(new Vector3(...thigh.forward))).toBeLessThan(0); // bent backward, not forward
    expect(validatePose(pose, defaultRest).map((v) => `${v.bone}:${v.rule}`)).toContain("shin_L:lateral");
  });

  it("derives the upper arm's twist so the elbow's plane contains the forearm", () => {
    const tuck = resolvePose(POSES.tuck, defaultRest);
    expect(Math.abs(deg(tuck.bones.upper_arm_L.twist))).toBeGreaterThan(20);
    expect(tuck.bones.upper_arm_R.twist).toBeCloseTo(-tuck.bones.upper_arm_L.twist, 5);
    expect(validatePose(POSES.tuck, defaultRest)).toEqual([]);
  });

  it("derives the leg's turnout from the foot when the knee is straight", () => {
    // toes out: a negative twist about the down-pointing left thigh turns its foot to the skater's left
    const eagle = resolvePose(POSES.spreadEagle, defaultRest);
    expect(deg(eagle.bones.thigh_L.twist)).toBeLessThan(-30);
    expect(deg(eagle.bones.thigh_R.twist)).toBeGreaterThan(30);
    expect(eagle.bones.thigh_R.twist).toBeCloseTo(-eagle.bones.thigh_L.twist, 5);
  });

  it("mirrorPose leaves a derived twist undefined", () => {
    const m = mirrorPose(POSES.tuck);
    expect(m.bones.upper_arm_R!.twist).toBeUndefined();
    const twisted = mirrorPose({ bones: { chest: { dir: [0, 1, 0], twist: 0.5 } } });
    expect(twisted.bones.chest!.twist).toBeCloseTo(-0.5);
  });

  it("blends an unposed bone by following its parent", () => {
    // launch leaves the hands alone (they follow the raised forearms); tuck aims them
    const p = lerpPose(POSES.launch, POSES.tuck, 0, defaultRest);
    const fk = poseDir(POSES.launch, "hand_L", defaultRest);
    for (let i = 0; i < 3; i++) expect(p.bones.hand_L!.dir[i]).toBeCloseTo(fk[i], 5);
    for (const t of [0.25, 0.5, 0.75]) expect(validatePose(lerpPose(POSES.launch, POSES.tuck, t, defaultRest), defaultRest)).toEqual([]);
  });

  it("swings a leg from behind to in front past the body, not across it", () => {
    const mid = lerpPose(POSES.camel, POSES.sit, 0.5, defaultRest);
    expect(Math.abs(mid.bones.thigh_R!.dir[0])).toBeLessThan(0.35);
    expect(mid.bones.thigh_R!.dir[1]).toBeLessThan(-0.5);
  });

  it("pivots a derived pelvic tilt about the hip sockets so the standing foot stays put", () => {
    const { group, bones } = syntheticSkeleton();
    const rig = new SkaterRig(group);
    const legs: Pose["bones"] = { thigh_L: { dir: limb(0) }, shin_L: { dir: limb(0) }, thigh_R: { dir: limb(-90) }, shin_R: { dir: limb(-90) } };
    const foot = () => {
      group.updateMatrixWorld(true);
      return bones.get("foot_L_tip")!.getWorldPosition(new Vector3());
    };
    rig.applyPose({ bones: { ...legs, hips: { dir: [0, 1, 0] } } });
    const upright = foot();
    rig.applyPose({ bones: { ...legs, spine: { dir: vec(0, 0.3, 0.95) } } });
    expect(derivePelvisTilt({ bones: { ...legs, spine: { dir: vec(0, 0.3, 0.95) } } }).pitch).toBeGreaterThan(50);
    const tilted = foot();
    expect(tilted.distanceTo(upright)).toBeLessThan(0.01);
  });
});

describe("limb helper", () => {
  it("maps angles to skater-space directions", async () => {
    const { limb } = await import("@/three/rig/pose");
    const down = limb(0);
    expect(down[1]).toBeCloseTo(-1, 5);
    expect(Math.abs(down[0]) + Math.abs(down[2])).toBeLessThan(1e-9);
    const fwd = limb(90);
    expect(fwd[2]).toBeCloseTo(1, 5);
    const left = limb(0, 90);
    expect(left[0]).toBeCloseTo(1, 5);
    const up = limb(180);
    expect(up[1]).toBeCloseTo(1, 5);
  });
});
