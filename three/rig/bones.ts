/** Bone names exported by tools/blender/build_skater.py (glTF nodes). */
export const BONES = [
  "root", "hips", "spine", "chest", "neck", "head", "head_tip",
  "shoulder_L", "upper_arm_L", "forearm_L", "hand_L", "hand_L_tip",
  "shoulder_R", "upper_arm_R", "forearm_R", "hand_R", "hand_R_tip",
  "thigh_L", "shin_L", "foot_L", "foot_L_tip",
  "thigh_R", "shin_R", "foot_R", "foot_R_tip",
] as const;

export type BoneName = (typeof BONES)[number];

/** Which child marks the "tail" of each bone, giving its rest direction. */
export const TAIL_CHILD: Partial<Record<BoneName, BoneName>> = {
  hips: "spine",
  spine: "chest",
  chest: "neck",
  neck: "head",
  head: "head_tip",
  shoulder_L: "upper_arm_L",
  upper_arm_L: "forearm_L",
  forearm_L: "hand_L",
  hand_L: "hand_L_tip",
  shoulder_R: "upper_arm_R",
  upper_arm_R: "forearm_R",
  forearm_R: "hand_R",
  hand_R: "hand_R_tip",
  thigh_L: "shin_L",
  shin_L: "foot_L",
  foot_L: "foot_L_tip",
  thigh_R: "shin_R",
  shin_R: "foot_R",
  foot_R: "foot_R_tip",
};

/** Bones a pose may aim (parents before children). */
export const POSABLE: BoneName[] = [
  "hips", "spine", "chest", "neck", "head",
  "shoulder_L", "upper_arm_L", "forearm_L", "hand_L",
  "shoulder_R", "upper_arm_R", "forearm_R", "hand_R",
  "thigh_L", "shin_L", "foot_L",
  "thigh_R", "shin_R", "foot_R",
];
