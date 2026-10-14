import { POSES } from "./poses";
import { limb, pointed, vec, type Pose } from "./pose";

/**
 * Poses owned by the Wave 2 spins agent: the spin positions corrected to the Technical Panel
 * Handbook 2026-27 (Spins: Rules, Categories of difficult variations), the flying positions per
 * family and the change of foot by jump. Registered into POSES on import; three/rig/allPoses.ts
 * imports this file so the pose lab and tests/poses.test.ts see them, and three/animation/spins.ts
 * imports it for its timelines.
 *
 * Geometry used for the hips offsets (measured on the GLBs, woman): hip sockets at y 0.885, thigh
 * 0.378 m, shin 0.371 m, ankle 0.139 m above the blade. A pelvic tilt the pose leaves out pivots
 * about the sockets, so the sockets sit exactly at rest + `hips`, and the skating ankle lands on
 * the ice when socket.y + thigh·T.y + shin·S.y = 0.139.
 *
 * Overrides (same names as poses.ts, because the spin timelines, the stills map and the blend
 * tests all use them): camel, camelSideways, camelUpward, doughnut, sit, sitSideways, sitBehind,
 * pancake. New: camelForward, flyUpright, flyLayback, flySitOpen, hopChange.
 */

/** Arms carried out to the sides; same shape as the private helper in poses.ts. */
const armsOut = (elev = 85, fwd = 10): Pose["bones"] => ({
  upper_arm_L: { dir: limb(fwd, Math.min(elev, 88) - 4) },
  upper_arm_R: { dir: limb(fwd, -(Math.min(elev, 88) - 4)) },
  forearm_L: { dir: limb(fwd + 14, Math.min(elev, 88) - 12) },
  forearm_R: { dir: limb(fwd + 14, -(Math.min(elev, 88) - 12)) },
});

/* ---------- camel: free leg backwards with the knee higher than the hip level ---------- */

/** Standing leg of the camel: straight, the blade under the hip (ankle at 0.137 with hips [0,0,0]). */
const camelStand: Pose["bones"] = {
  thigh_L: { dir: limb(2, 0) },
  shin_L: { dir: limb(-2, 0) },
};

/** Free leg of the camel: thigh 18° above horizontal so the knee is clearly higher than the hip, leg straight, foot pointed. */
const camelFreeLeg: Pose["bones"] = {
  thigh_R: { dir: limb(-108, -3) },
  shin_R: { dir: limb(-110, -3) },
  foot_R: { dir: pointed(limb(-110, -3), 50) },
};

/**
 * Trunk of the camel: parallel to the ice (lumbar at 81°, thoracic at 83° of pitch; the pelvis is
 * derived at ~89° so the free hip extends 19° and the lumbar arches 8°), the head lifted to look ahead.
 */
const camelTrunk: Pose["bones"] = {
  spine: { dir: vec(0, 0.16, 0.99) },
  chest: { dir: vec(0, 0.12, 0.99) },
  neck: { dir: vec(0, 0.7, 0.71) },
  head: { dir: vec(0, 0.93, 0.37) },
};

/** Camel: free leg back with the knee above the hip, body parallel to the ice, head up, arms out. */
const camel: Pose = {
  bones: { ...camelStand, ...camelFreeLeg, ...camelTrunk, ...armsOut(90, 0) },
  hips: [0, 0, 0],
};

/** Camel forward (CF): shoulder line parallel to the ice; both arms stretched ahead along the body line. */
const camelForward: Pose = {
  bones: {
    ...camel.bones,
    upper_arm_L: { dir: vec(0.12, 0.2, 0.97) },
    upper_arm_R: { dir: vec(-0.12, 0.2, 0.97) },
    forearm_L: { dir: vec(0.05, 0.25, 0.97) },
    forearm_R: { dir: vec(-0.05, 0.25, 0.97) },
  },
  hips: [0, 0, 0],
};

/** Camel sideways (CS): shoulder line twisted to vertical, one arm to the ceiling and one to the ice. */
const camelSideways: Pose = {
  bones: {
    ...camel.bones,
    spine: { dir: vec(0, 0.2, 0.98), twist: 0.9 },
    chest: { dir: vec(0, 0.14, 0.99), twist: 1.4 },
    upper_arm_L: { dir: vec(0.1, 0.98, 0.15) },
    forearm_L: { dir: vec(0.1, 0.98, 0.1) },
    upper_arm_R: { dir: vec(-0.1, -0.98, 0.15) },
    forearm_R: { dir: vec(-0.1, -0.98, 0.1) },
  },
  hips: [0, 0, 0],
};

/** Camel upward (CU): shoulder line twisted past vertical, chest opening to the ceiling. */
const camelUpward: Pose = {
  bones: {
    ...camel.bones,
    spine: { dir: vec(0, 0.24, 0.97), twist: 1.6 },
    chest: { dir: vec(0, 0.2, 0.98), twist: 2.6 },
    head: { dir: vec(0, 0.9, 0.4) },
    upper_arm_L: { dir: vec(0.2, 0.95, -0.2) },
    forearm_L: { dir: vec(0.2, 0.95, -0.2) },
    // the chest is rolled ~150° to face the ceiling: the right shoulder sits low on the skater's left and its
    // arm reaches out that way toward the ice
    upper_arm_R: { dir: vec(0.75, -0.6, 0.3) },
    forearm_R: { dir: vec(0.7, -0.65, 0.3) },
  },
  hips: [0, 0, 0],
};

/** Doughnut: a camel with the free leg bent up behind and the blade caught overhead, the body making a ring (CS or CU). */
const doughnut: Pose = {
  bones: {
    ...camelStand,
    thigh_R: { dir: limb(-104, -4) },
    shin_R: { dir: vec(0, 0.95, -0.3) },
    foot_R: { dir: pointed(vec(0, 0.95, -0.3), 50) },
    // the ring: pelvis ~70° forward, lumbar arched back ~42°, thoracic 35°, so the chest is near vertical and the
    // arms go straight up with the forearms back to the blade
    spine: { dir: vec(0, 0.87, 0.49) },
    chest: { dir: vec(0, 1, -0.08) },
    neck: { dir: vec(0, 0.75, -0.66) },
    head: { dir: vec(0, 0.5, -0.87) },
    upper_arm_L: { dir: vec(0.12, 0.99, -0.08) },
    upper_arm_R: { dir: vec(-0.12, 0.99, -0.08) },
    forearm_L: { dir: vec(-0.05, 0.6, -0.8) },
    forearm_R: { dir: vec(0.05, 0.6, -0.8) },
  },
  hips: [0, 0, 0],
};

/* ---------- sit: the upper part of the skating leg at least parallel to the ice ---------- */

/**
 * Standing leg of the sit: thigh 4° above parallel (the hip below the knee), the shin leaning 24°
 * forward (as far as the booted ankle's 95° of dorsiflexion allows with the blade flat), the foot
 * aimed at its rest direction so the blade lies flat on the ice.
 */
const sitStand: Pose["bones"] = {
  thigh_L: { dir: limb(94, 3) },
  shin_L: { dir: limb(-24, 3) },
  foot_L: { dir: vec(0, -0.38, 0.925) },
};

/** Hips for `sitStand`: socket at y 0.451, 0.246 m behind the blade, which puts the ankle at 0.139 on the ice. */
const SIT_HIPS: [number, number, number] = [0, -0.434, -0.246];

/** Sit (SF basic shape): free leg extended forward, slightly below horizontal, arms forward. */
const sit: Pose = {
  bones: {
    ...sitStand,
    thigh_R: { dir: limb(82, -12) },
    shin_R: { dir: limb(84, -12) },
    foot_R: { dir: pointed(limb(84, -12), 50) },
    spine: { dir: vec(0, 0.85, 0.5) },
    chest: { dir: vec(0, 0.9, 0.42) },
    neck: { dir: vec(0, 1, 0.1) },
    upper_arm_L: { dir: vec(0.2, -0.3, 0.93) },
    upper_arm_R: { dir: vec(-0.2, -0.3, 0.93) },
    forearm_L: { dir: vec(0.1, 0.1, 0.99) },
    forearm_R: { dir: vec(-0.1, 0.1, 0.99) },
  },
  hips: SIT_HIPS,
};

/** Sit sideways (SS): free leg out to the side, torso bent down with the arms grasping under the knee. */
const sitSideways: Pose = {
  bones: {
    ...sit.bones,
    thigh_R: { dir: limb(40, -75) },
    shin_R: { dir: limb(40, -75) },
    foot_R: { dir: vec(-0.9, 0.3, 0.3) },
    spine: { dir: vec(0, 0.8, 0.6) },
    chest: { dir: vec(0, 0.75, 0.65) },
    neck: { dir: vec(0, 0.7, 0.7) },
    head: { dir: vec(0, 0.6, 0.8) },
    upper_arm_L: { dir: vec(0.1, -0.8, 0.6) },
    forearm_L: { dir: vec(0.2, -0.3, 0.95) },
    upper_arm_R: { dir: vec(-0.3, -0.85, 0.45) },
    forearm_R: { dir: vec(-0.4, -0.2, 0.9) },
  },
  hips: SIT_HIPS,
};

/** Sit behind (SB): free leg bent behind the skating leg. */
const sitBehind: Pose = {
  bones: {
    ...sit.bones,
    thigh_R: { dir: limb(-25, -15) },
    shin_R: { dir: limb(-110, -15) },
    foot_R: { dir: pointed(limb(-110, -15), 50) },
    spine: { dir: vec(0, 0.9, 0.45) },
    chest: { dir: vec(0, 0.9, 0.4) },
    upper_arm_L: { dir: vec(0.5, -0.4, 0.75) },
    upper_arm_R: { dir: vec(-0.5, -0.4, 0.75) },
    forearm_L: { dir: vec(0.1, 0.3, 0.95) },
    forearm_R: { dir: vec(-0.1, 0.3, 0.95) },
  },
  hips: SIT_HIPS,
};

/** Pancake: a sit forward variation with the free leg folded across and the torso flattened over it. */
const pancake: Pose = {
  bones: {
    ...sitStand,
    thigh_R: { dir: limb(70, -35) },
    // the shin crosses in front as far as 60° of hip rotation allows
    shin_R: { dir: limb(12, 42) },
    foot_R: { dir: pointed(limb(12, 42), 50) },
    spine: { dir: vec(0, 0.2, 0.98) },
    chest: { dir: vec(0, -0.1, 1) },
    neck: { dir: vec(0, -0.3, 0.95) },
    head: { dir: vec(0, -0.4, 0.9) },
    upper_arm_L: { dir: vec(0.3, -0.5, 0.8) },
    upper_arm_R: { dir: vec(-0.3, -0.5, 0.8) },
    forearm_L: { dir: vec(0.1, -0.3, 0.95) },
    forearm_R: { dir: vec(-0.1, -0.3, 0.95) },
  },
  hips: SIT_HIPS,
};

/* ---------- flying positions ---------- */

/** Flying upright: a stag in the air (front knee folded under, back leg bent behind), torso tall, arms out. */
const flyUpright: Pose = {
  bones: {
    thigh_L: { dir: limb(70, 6) },
    shin_L: { dir: limb(-50, 6) },
    foot_L: { dir: pointed(limb(-50, 6), 50) },
    thigh_R: { dir: limb(-40, -8) },
    shin_R: { dir: limb(-100, -8) },
    foot_R: { dir: pointed(limb(-100, -8), 50) },
    spine: { dir: vec(0, 1, 0.05) },
    chest: { dir: vec(0, 1, 0) },
    ...armsOut(80, 15),
  },
  hips: [0, 0.3, 0],
};

/** Flying layback: the arch taken in the air, free leg in attitude behind, arms open overhead. */
const flyLayback: Pose = {
  bones: {
    thigh_L: { dir: limb(15, 2) },
    shin_L: { dir: limb(-35, 2) },
    foot_L: { dir: pointed(limb(-35, 2), 50) },
    thigh_R: { dir: limb(-22, -8) },
    shin_R: { dir: limb(-118, -8) },
    foot_R: { dir: pointed(limb(-118, -8), 50) },
    spine: { dir: vec(0, 0.9, -0.42) },
    chest: { dir: vec(0, 0.6, -0.8) },
    neck: { dir: vec(0, 0.3, -0.95) },
    head: { dir: vec(0, 0.1, -1) },
    upper_arm_L: { dir: vec(0.5, 0.75, -0.4) },
    upper_arm_R: { dir: vec(-0.5, 0.75, -0.4) },
    forearm_L: { dir: vec(-0.3, 0.8, -0.5) },
    forearm_R: { dir: vec(0.3, 0.8, -0.5) },
  },
  hips: [0, 0.3, 0.06],
};

/** Plain flying sit air position: an open tuck, the free leg carried out to the side (the full sit in the air is the difficult fly). */
const flySitOpen: Pose = {
  bones: {
    thigh_L: { dir: limb(75, 12) },
    shin_L: { dir: limb(-30, 12) },
    foot_L: { dir: pointed(limb(-30, 12), 50) },
    thigh_R: { dir: limb(80, -25) },
    shin_R: { dir: limb(60, -25) },
    foot_R: { dir: pointed(limb(60, -25), 50) },
    spine: { dir: vec(0, 0.9, 0.42) },
    chest: { dir: vec(0, 0.92, 0.38) },
    upper_arm_L: { dir: vec(0.6, -0.2, 0.75) },
    upper_arm_R: { dir: vec(-0.6, -0.2, 0.75) },
    forearm_L: { dir: vec(0.3, 0.1, 0.95) },
    forearm_R: { dir: vec(-0.3, 0.1, 0.95) },
  },
  hips: [0, 0.2, 0],
};

/** Change of foot executed by jump: a small hop with both knees folded and the feet pointed. */
const hopChange: Pose = {
  bones: {
    thigh_L: { dir: limb(40, 6) },
    shin_L: { dir: limb(-55, 6) },
    foot_L: { dir: pointed(limb(-55, 6), 50) },
    thigh_R: { dir: limb(30, -6) },
    shin_R: { dir: limb(-65, -6) },
    foot_R: { dir: pointed(limb(-65, -6), 50) },
    spine: { dir: vec(0, 0.97, 0.24) },
    chest: { dir: vec(0, 0.98, 0.2) },
    ...armsOut(55, 15),
  },
  hips: [0, -0.12, 0],
};

export const SPIN_POSES: Record<string, Pose> = {
  camel,
  camelForward,
  camelSideways,
  camelUpward,
  doughnut,
  sit,
  sitSideways,
  sitBehind,
  pancake,
  flyUpright,
  flyLayback,
  flySitOpen,
  hopChange,
};

Object.assign(POSES, SPIN_POSES);
