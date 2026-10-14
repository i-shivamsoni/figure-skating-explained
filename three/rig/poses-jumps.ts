import { POSES } from "./poses";
import { limb, pointed, vec, type Pose } from "./pose";

/**
 * Poses owned by the Wave 2 jumps agent: the entries and take-offs that tell the six jumps apart
 * (Technical Panel Handbook, Jump Elements; the usual coaching descriptions of each take-off).
 * Registered into POSES on import; three/rig/allPoses.ts imports this file so the pose lab and
 * tests/poses.test.ts see them. Timelines that use them must import this module (for its side
 * effect) or JUMP_POSES directly.
 *
 * Every pose is authored for a counter-clockwise skater on the foot the jump actually uses (the
 * Loop and toe loop on the right, the Salchow, Flip, Lutz and Axel on the left), so jumps.ts uses
 * them without mirroring. Feet are `pointed(shin, deg)` so the booted ankle stays in range, and the
 * free knee bends in its hinge plane (the same `side` angle for thigh and shin).
 */
export const JUMP_POSES: Record<string, Pose> = {
  /* ---------- Loop: right back outside edge, the free foot crossed in front ---------- */

  /** Loop glide: on the right back outside edge with the left foot crossed in front of the skating foot, blade just off the ice. */
  loopGlide: {
    bones: {
      thigh_R: { dir: limb(8, -2) },
      shin_R: { dir: limb(-8, -2) },
      // the free thigh crosses the midline (adduction, well inside the hip's 30°) with a soft knee
      thigh_L: { dir: limb(22, -16) },
      shin_L: { dir: limb(6, -16) },
      foot_L: { dir: pointed(limb(6, -16), 60) },
      spine: { dir: vec(0, 0.97, 0.2) },
      // the left arm leads into the circle, the right arm holds out to the side
      upper_arm_L: { dir: limb(55, 35) },
      forearm_L: { dir: limb(70, 25) },
      upper_arm_R: { dir: limb(5, -75) },
      forearm_R: { dir: limb(20, -70) },
      head: { dir: vec(0, 0.99, 0.1), twist: 0.3 },
    },
    hips: [0, -0.04, 0],
  },

  /** Loop knee bend: sitting back over the right heel, the crossed free foot kept low and in front. */
  loopLoad: {
    bones: {
      // the standing blade lies flat on the ice however far the shin leans
      foot_R: { dir: vec(0, -0.38, 0.925) },
      thigh_R: { dir: limb(50, -2) },
      shin_R: { dir: limb(-42, -2) },
      // the free knee folds with the skating knee so the crossed foot stays just above the ice
      thigh_L: { dir: limb(62, -16) },
      shin_L: { dir: limb(-26, -16) },
      foot_L: { dir: pointed(limb(-26, -16), 60) },
      spine: { dir: vec(0, 0.94, 0.34) },
      upper_arm_L: { dir: limb(40, 30) },
      forearm_L: { dir: limb(55, 20) },
      upper_arm_R: { dir: limb(-20, -60) },
      forearm_R: { dir: limb(-5, -55) },
      head: { dir: vec(0, 0.99, 0.1), twist: 0.3 },
    },
    hips: [0, -0.22, 0],
  },

  /** Loop take-off: springing straight from the edge, the free leg still crossed in front (no swing to help). */
  loopLaunch: {
    bones: {
      thigh_R: { dir: limb(-8, -2) },
      shin_R: { dir: limb(-8, -2) },
      thigh_L: { dir: limb(35, -14) },
      shin_L: { dir: limb(-5, -14) },
      foot_L: { dir: pointed(limb(-5, -14), 55) },
      spine: { dir: vec(0, 1, 0.05) },
      upper_arm_L: { dir: vec(0.3, 0.6, 0.74) },
      upper_arm_R: { dir: vec(-0.3, 0.6, 0.74) },
      forearm_L: { dir: vec(0.1, 0.9, 0.4) },
      forearm_R: { dir: vec(-0.1, 0.9, 0.4) },
    },
    hips: [0, 0.02, 0],
  },

  /* ---------- Salchow: left back inside edge after a three turn, the free leg swings through ---------- */

  /** Salchow knee bend: deep left knee on the back inside edge, the right leg trailing behind and out, arms back, ready to swing. */
  salchowLoad: {
    bones: {
      // the standing blade lies flat on the ice however far the shin leans
      foot_L: { dir: vec(0, -0.38, 0.925) },
      thigh_L: { dir: limb(45, 2) },
      shin_L: { dir: limb(-40, 2) },
      // the trailing leg is lifted enough behind to clear the ice under the deeply bent standing hip
      thigh_R: { dir: limb(-40, -25) },
      shin_R: { dir: limb(-46, -25) },
      foot_R: { dir: pointed(limb(-46, -25), 50) },
      spine: { dir: vec(0, 0.92, 0.38) },
      upper_arm_L: { dir: limb(-35, 30) },
      forearm_L: { dir: limb(-20, 35) },
      upper_arm_R: { dir: limb(-35, -30) },
      forearm_R: { dir: limb(-20, -35) },
      head: { dir: vec(0, 0.99, 0.12), twist: 0.4 },
    },
    hips: [0, -0.2, 0],
  },

  /** Salchow take-off: the free leg sweeps forward and wide around the circle as the arms swing up: a wide, scooping take-off. */
  salchowSwing: {
    bones: {
      thigh_L: { dir: limb(-8, 2) },
      shin_L: { dir: limb(-8, 2) },
      thigh_R: { dir: limb(55, -42) },
      shin_R: { dir: limb(40, -42) },
      foot_R: { dir: pointed(limb(40, -42), 50) },
      spine: { dir: vec(0, 1, 0.05), twist: 0.25 },
      upper_arm_L: { dir: vec(0.35, 0.55, 0.75) },
      upper_arm_R: { dir: vec(-0.5, 0.45, 0.74) },
      forearm_L: { dir: vec(0.1, 0.9, 0.4) },
      forearm_R: { dir: vec(-0.2, 0.85, 0.45) },
    },
    hips: [0, 0.02, 0],
  },

  /* ---------- Flip: left back inside edge after a three turn, a quick pick with the right toe ---------- */

  /** Flip pick: a quick, straight reach back of the right toe after the three turn; shoulders square to the circle, eyes into it. */
  flipPick: {
    bones: {
      // the standing blade lies flat on the ice however far the shin leans
      foot_L: { dir: vec(0, -0.38, 0.925) },
      thigh_L: { dir: limb(32, 2) },
      shin_L: { dir: limb(-32, 2) },
      thigh_R: { dir: limb(-45, -6) },
      shin_R: { dir: limb(-50, -6) },
      // the toe pick points straight down into the ice
      foot_R: { dir: pointed(limb(-50, -6), 50) },
      spine: { dir: vec(0, 0.94, 0.34) },
      upper_arm_L: { dir: limb(-40, 25) },
      forearm_L: { dir: limb(-30, 28) },
      upper_arm_R: { dir: limb(-40, -25) },
      forearm_R: { dir: limb(-30, -28) },
      head: { dir: vec(0, 0.99, 0.1), twist: 0.45 },
    },
    hips: [0, -0.15, 0],
  },

  /* ---------- Toe loop: right back outside edge after a three turn, the left toe reaches ---------- */

  /** Toe loop pick: on the right back outside edge the left toe reaches back; the right arm leads, the left trails with the picking leg, the body opens to the pick. */
  toeLoopPick: {
    bones: {
      // the standing blade lies flat on the ice however far the shin leans
      foot_R: { dir: vec(0, -0.38, 0.925) },
      thigh_R: { dir: limb(32, -2) },
      shin_R: { dir: limb(-32, -2) },
      thigh_L: { dir: limb(-48, 8) },
      shin_L: { dir: limb(-54, 8) },
      foot_L: { dir: pointed(limb(-54, 8), 50) },
      spine: { dir: vec(0, 0.94, 0.34), twist: 0.2 },
      upper_arm_R: { dir: limb(35, -35) },
      forearm_R: { dir: limb(50, -30) },
      upper_arm_L: { dir: limb(-45, 20) },
      forearm_L: { dir: limb(-35, 25) },
      head: { dir: vec(0, 0.99, 0.1), twist: 0.5 },
    },
    hips: [0, -0.15, 0],
  },

  /* ---------- Axel: step forward onto the left forward outside edge, arms drawn back then swung ---------- */

  /** Axel glide after the step forward: left forward outside edge, arms drawn back behind the hips, free leg behind, chest up. */
  axelGlide: {
    bones: {
      thigh_L: { dir: limb(8, 2) },
      shin_L: { dir: limb(-8, 2) },
      thigh_R: { dir: limb(-35, -8) },
      shin_R: { dir: limb(-45, -8) },
      foot_R: { dir: pointed(limb(-45, -8), 50) },
      spine: { dir: vec(0, 0.98, 0.18) },
      upper_arm_L: { dir: limb(-45, 15) },
      forearm_L: { dir: limb(-38, 18) },
      upper_arm_R: { dir: limb(-45, -15) },
      forearm_R: { dir: limb(-38, -18) },
      head: { dir: vec(0, 0.98, 0.2) },
    },
    hips: [0, -0.03, 0],
  },

  /** Axel knee bend: the left knee deep on the forward edge, arms fully drawn back, the free leg stretched behind. */
  axelLoad: {
    bones: {
      // the standing blade lies flat on the ice however far the shin leans
      foot_L: { dir: vec(0, -0.38, 0.925) },
      thigh_L: { dir: limb(52, 2) },
      shin_L: { dir: limb(-45, 2) },
      thigh_R: { dir: limb(-42, -8) },
      shin_R: { dir: limb(-62, -8) },
      foot_R: { dir: pointed(limb(-62, -8), 50) },
      spine: { dir: vec(0, 0.9, 0.42) },
      upper_arm_L: { dir: limb(-55, 12) },
      forearm_L: { dir: limb(-48, 15) },
      upper_arm_R: { dir: limb(-55, -12) },
      forearm_R: { dir: limb(-48, -15) },
      head: { dir: vec(0, 0.97, 0.25) },
    },
    hips: [0, -0.22, 0],
  },

  /** Axel take-off: the right knee drives up in front and the arms swing through to chest height. */
  axelLaunch: {
    bones: {
      thigh_L: { dir: limb(-8, 2) },
      shin_L: { dir: limb(-8, 2) },
      thigh_R: { dir: limb(85, -6) },
      shin_R: { dir: limb(0, -6) },
      foot_R: { dir: pointed(limb(0, -6), 55) },
      spine: { dir: vec(0, 1, 0.04) },
      upper_arm_L: { dir: limb(75, 12) },
      forearm_L: { dir: limb(110, 0) },
      upper_arm_R: { dir: limb(75, -12) },
      forearm_R: { dir: limb(110, 0) },
      head: { dir: vec(0, 0.99, 0.12) },
    },
    hips: [0, 0.03, 0],
  },

  /* ---------- Lutz: a long left back outside edge held against the rotation ---------- */

  /**
   * Lutz glide: the long left back outside edge. The free leg is stretched back down the line of
   * travel, the shoulders are held against the rotation (left arm leading, right arm trailing back
   * along the travel, chest turned clockwise) and the head looks back over the right shoulder.
   */
  lutzGlide: {
    bones: {
      thigh_L: { dir: limb(6, 2) },
      shin_L: { dir: limb(-6, 2) },
      thigh_R: { dir: limb(-35, -6) },
      shin_R: { dir: limb(-42, -6) },
      foot_R: { dir: pointed(limb(-42, -6), 50) },
      spine: { dir: vec(0, 0.98, 0.15) },
      chest: { dir: vec(0, 0.99, 0.08), twist: -0.4 },
      upper_arm_L: { dir: limb(55, 45) },
      forearm_L: { dir: limb(62, 42) },
      upper_arm_R: { dir: limb(-45, -40) },
      forearm_R: { dir: limb(-35, -38) },
      neck: { dir: vec(0, 0.98, 0.1), twist: -0.35 },
      head: { dir: vec(0, 0.98, -0.08), twist: -0.8 },
    },
    hips: [0, -0.02, 0],
  },

  /** Lutz pick: the right toe reaches far back along the line while the shoulders stay counter and the eyes stay over the right shoulder. */
  lutzPick: {
    bones: {
      // the standing blade lies flat on the ice however far the shin leans
      foot_L: { dir: vec(0, -0.38, 0.925) },
      thigh_L: { dir: limb(36, 2) },
      shin_L: { dir: limb(-36, 2) },
      thigh_R: { dir: limb(-50, -8) },
      shin_R: { dir: limb(-55, -8) },
      foot_R: { dir: pointed(limb(-55, -8), 50) },
      spine: { dir: vec(0, 0.93, 0.36) },
      chest: { dir: vec(0, 0.95, 0.3), twist: -0.35 },
      upper_arm_L: { dir: limb(15, 35) },
      forearm_L: { dir: limb(30, 35) },
      upper_arm_R: { dir: limb(-50, -30) },
      forearm_R: { dir: limb(-40, -30) },
      neck: { dir: vec(0, 0.97, 0.2), twist: -0.3 },
      head: { dir: vec(0, 0.98, 0.1), twist: -0.7 },
    },
    hips: [0, -0.16, 0],
  },
};

Object.assign(POSES, JUMP_POSES);
