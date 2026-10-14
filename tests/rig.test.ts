import { describe, expect, it } from "vitest";
import { Bone, Group, Quaternion, Vector3 } from "three";
import { SkaterRig } from "@/three/rig/rig";
import { BONES, TAIL_CHILD, type BoneName } from "@/three/rig/bones";
import { lerpPose, slerpDir, vec } from "@/three/rig/pose";

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
