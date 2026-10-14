import { limb, mirrorDir, vec, type Pose, type Vec3 } from "./pose";

/**
 * Named poses in skater space (+X left, +Y up, +Z forward). Legs: `limb(fwd, side)`.
 * Spine/neck/head directions point up at rest; arms hang down at rest.
 * "L" is the skater's left. Most skaters rotate counter-clockwise and land on the right foot.
 */
const armsOut = (elev = 85, fwd = 10): Pose["bones"] => ({
  upper_arm_L: { dir: limb(fwd, elev) },
  upper_arm_R: { dir: limb(fwd, -elev) },
  forearm_L: { dir: limb(fwd + 5, elev) },
  forearm_R: { dir: limb(fwd + 5, -elev) },
});

const armsCrossed: Pose["bones"] = {
  upper_arm_L: { dir: vec(-0.25, -0.75, 0.55) },
  upper_arm_R: { dir: vec(0.25, -0.75, 0.55) },
  forearm_L: { dir: vec(-0.95, 0.15, 0.25) },
  forearm_R: { dir: vec(0.95, 0.15, 0.25) },
  hand_L: { dir: vec(-0.9, 0.1, 0.1) },
  hand_R: { dir: vec(0.9, 0.1, 0.1) },
};

const legsTogether: Pose["bones"] = {
  thigh_L: { dir: limb(0, 2) },
  thigh_R: { dir: limb(0, -2) },
  shin_L: { dir: limb(0, 2) },
  shin_R: { dir: limb(0, -2) },
};

export const POSES: Record<string, Pose> = {
  rest: { bones: {} },

  stand: { bones: { ...legsTogether, ...armsOut(25, 5) } },

  /** Back outside edge glide on the right foot, left leg extended behind. */
  glideBO: {
    bones: {
      thigh_R: { dir: limb(5, -2) },
      shin_R: { dir: limb(-5, -2) },
      thigh_L: { dir: limb(-40, 8) },
      shin_L: { dir: limb(-50, 8) },
      foot_L: { dir: vec(0.1, -0.5, 0.85) },
      spine: { dir: vec(0, 0.98, 0.15) },
      ...armsOut(80, 5),
    },
    hips: [0, -0.02, 0],
  },

  /** Deep knee before take-off. */
  loadBO: {
    bones: {
      thigh_R: { dir: limb(45, -2) },
      shin_R: { dir: limb(-40, -2) },
      thigh_L: { dir: limb(-50, 8) },
      shin_L: { dir: limb(-60, 8) },
      spine: { dir: vec(0, 0.95, 0.3) },
      ...armsOut(70, -40),
    },
    hips: [0, -0.2, 0],
  },

  /** Rotating in the air: legs crossed tight, arms pulled in. */
  tuck: {
    bones: {
      thigh_L: { dir: limb(5, -6) },
      thigh_R: { dir: limb(2, 2) },
      shin_L: { dir: limb(-5, -8) },
      shin_R: { dir: limb(-2, 2) },
      foot_L: { dir: vec(0, -0.6, 0.8) },
      foot_R: { dir: vec(0, -0.6, 0.8) },
      spine: { dir: vec(0, 1, 0.02) },
      ...armsCrossed,
    },
  },

  /** Landing check-out: right knee bent, left leg stretched back, arms open. */
  land: {
    bones: {
      thigh_R: { dir: limb(35, -2) },
      shin_R: { dir: limb(-30, -2) },
      thigh_L: { dir: limb(-60, 10) },
      shin_L: { dir: limb(-65, 10) },
      foot_L: { dir: vec(0.1, -0.3, -0.9) },
      spine: { dir: vec(0, 0.95, 0.25) },
      ...armsOut(85, 0),
    },
    hips: [0, -0.12, 0],
  },

  /** Camel spin on the left foot, right leg back at hip height, torso horizontal. */
  camel: {
    bones: {
      thigh_L: { dir: limb(3, 0) },
      shin_L: { dir: limb(-3, 0) },
      thigh_R: { dir: limb(-92, -4) },
      shin_R: { dir: limb(-95, -4) },
      foot_R: { dir: vec(0, 0.2, -1) },
      spine: { dir: vec(0, 0.35, 0.94) },
      chest: { dir: vec(0, 0.15, 0.99) },
      neck: { dir: vec(0, 0.5, 0.85) },
      head: { dir: vec(0, 0.7, 0.7) },
      ...armsOut(90, 0),
    },
    hips: [0, -0.04, 0],
  },

  /** Sit spin: thigh of the skating leg parallel to the ice, free leg extended forward. */
  sit: {
    bones: {
      thigh_L: { dir: limb(88, 3) },
      shin_L: { dir: limb(-5, 3) },
      thigh_R: { dir: limb(85, -14) },
      shin_R: { dir: limb(85, -14) },
      foot_R: { dir: vec(-0.1, 0.4, 0.9) },
      spine: { dir: vec(0, 0.85, 0.5) },
      chest: { dir: vec(0, 0.9, 0.4) },
      neck: { dir: vec(0, 1, 0.1) },
      upper_arm_L: { dir: vec(0.2, -0.3, 0.93) },
      upper_arm_R: { dir: vec(-0.2, -0.3, 0.93) },
      forearm_L: { dir: vec(0.1, 0.1, 0.99) },
      forearm_R: { dir: vec(-0.1, 0.1, 0.99) },
    },
    hips: [0, -0.46, 0.05],
  },

  /** Upright scratch spin: free leg crossed in front, arms overhead. */
  upright: {
    bones: {
      thigh_L: { dir: limb(2, 0) },
      shin_L: { dir: limb(-2, 0) },
      thigh_R: { dir: limb(12, 10) },
      shin_R: { dir: limb(-10, 12) },
      foot_R: { dir: vec(0.3, -0.5, 0.8) },
      upper_arm_L: { dir: vec(0.1, 0.98, 0.1) },
      upper_arm_R: { dir: vec(-0.1, 0.98, 0.1) },
      forearm_L: { dir: vec(-0.2, 0.97, 0.1) },
      forearm_R: { dir: vec(0.2, 0.97, 0.1) },
    },
  },

  /** Layback: head and shoulders arched back, free leg bent behind. */
  layback: {
    bones: {
      thigh_L: { dir: limb(2, 0) },
      shin_L: { dir: limb(-2, 0) },
      thigh_R: { dir: limb(-35, -8) },
      shin_R: { dir: limb(-125, -8) },
      foot_R: { dir: vec(0, 0.5, -0.85) },
      spine: { dir: vec(0, 0.9, -0.42) },
      chest: { dir: vec(0, 0.6, -0.8) },
      neck: { dir: vec(0, 0.3, -0.95) },
      head: { dir: vec(0, 0.1, -1) },
      upper_arm_L: { dir: vec(0.5, 0.75, -0.4) },
      upper_arm_R: { dir: vec(-0.5, 0.75, -0.4) },
      forearm_L: { dir: vec(-0.3, 0.8, -0.5) },
      forearm_R: { dir: vec(0.3, 0.8, -0.5) },
    },
    hips: [0, -0.03, 0.06],
  },

  /** Biellmann: free leg pulled up behind and over the head, held by both hands. */
  biellmann: {
    bones: {
      thigh_L: { dir: limb(2, 0) },
      shin_L: { dir: limb(-2, 0) },
      thigh_R: { dir: limb(-150, -6) },
      shin_R: { dir: vec(0.05, 1, 0.1) },
      foot_R: { dir: vec(0.05, 0.8, 0.6) },
      spine: { dir: vec(0, 0.92, -0.38) },
      chest: { dir: vec(0, 0.85, -0.5) },
      neck: { dir: vec(0, 0.7, -0.7) },
      head: { dir: vec(0, 0.5, -0.85) },
      upper_arm_L: { dir: vec(0.15, 0.98, -0.1) },
      upper_arm_R: { dir: vec(-0.15, 0.98, -0.1) },
      forearm_L: { dir: vec(-0.1, 0.6, -0.8) },
      forearm_R: { dir: vec(0.1, 0.6, -0.8) },
    },
    hips: [0, -0.02, 0.08],
  },

  /** Spiral: free leg above hip level behind, torso forward. */
  spiral: {
    bones: {
      thigh_L: { dir: limb(3, 0) },
      shin_L: { dir: limb(-3, 0) },
      thigh_R: { dir: limb(-105, -4) },
      shin_R: { dir: limb(-108, -4) },
      foot_R: { dir: vec(0, 0.4, -0.9) },
      spine: { dir: vec(0, 0.7, 0.7) },
      chest: { dir: vec(0, 0.55, 0.83) },
      head: { dir: vec(0, 0.8, 0.6) },
      ...armsOut(80, 0),
    },
  },

  /** Spread eagle: both legs out to the sides, toes turned out, gliding on the inside or outside edges. */
  spreadEagle: {
    bones: {
      thigh_L: { dir: limb(0, 55) },
      thigh_R: { dir: limb(0, -55) },
      shin_L: { dir: limb(0, 55) },
      shin_R: { dir: limb(0, -55) },
      foot_L: { dir: vec(1, -0.2, 0) },
      foot_R: { dir: vec(-1, -0.2, 0) },
      spine: { dir: vec(0, 0.97, -0.2) },
      ...armsOut(85, 0),
    },
    hips: [0, -0.18, 0],
  },
};

export const POSE_NAMES = Object.keys(POSES);

/** Swap left and right so a pose can be mirrored for clockwise skaters or the other foot. */
export function mirrorPose(p: Pose): Pose {
  const bones: Pose["bones"] = {};
  for (const [name, aim] of Object.entries(p.bones)) {
    const swapped = name.endsWith("_L") ? name.slice(0, -2) + "_R" : name.endsWith("_R") ? name.slice(0, -2) + "_L" : name;
    bones[swapped as keyof Pose["bones"]] = { dir: mirrorDir(aim.dir as Vec3), twist: aim.twist ? -aim.twist : 0 };
  }
  return { bones, hips: p.hips ? [-p.hips[0], p.hips[1], p.hips[2]] : undefined };
}

/** Forward outside edge glide on the left foot (Axel entry), right leg behind. */
POSES.glideFO = {
  bones: {
    thigh_L: { dir: limb(5, 2) },
    shin_L: { dir: limb(-5, 2) },
    thigh_R: { dir: limb(-40, -8) },
    shin_R: { dir: limb(-50, -8) },
    foot_R: { dir: vec(-0.1, -0.5, 0.85) },
    spine: { dir: vec(0, 0.98, 0.15) },
    ...armsOut(75, 10),
  },
  hips: [0, -0.02, 0],
};

/** Deep knee on the forward edge, arms swung back before the Axel. */
POSES.loadFO = {
  bones: {
    thigh_L: { dir: limb(50, 2) },
    shin_L: { dir: limb(-45, 2) },
    thigh_R: { dir: limb(-45, -8) },
    shin_R: { dir: limb(-70, -8) },
    spine: { dir: vec(0, 0.92, 0.38) },
    ...armsOut(60, -50),
  },
  hips: [0, -0.22, 0],
};

/** Free leg reaching back to plant the toe pick (toe loop, flip, Lutz). */
POSES.pickBack = {
  bones: {
    thigh_R: { dir: limb(25, -2) },
    shin_R: { dir: limb(-25, -2) },
    thigh_L: { dir: limb(-55, 6) },
    shin_L: { dir: limb(-60, 6) },
    foot_L: { dir: vec(0.05, -0.9, 0.4) },
    spine: { dir: vec(0, 0.95, 0.3) },
    ...armsOut(60, -45),
  },
  hips: [0, -0.14, 0],
};

/** The instant of leaving the ice: skating leg extended, free leg and arms driving up. */
POSES.launch = {
  bones: {
    thigh_R: { dir: limb(-10, -2) },
    shin_R: { dir: limb(-10, -2) },
    thigh_L: { dir: limb(60, 8) },
    shin_L: { dir: limb(10, 8) },
    spine: { dir: vec(0, 1, 0.05) },
    upper_arm_L: { dir: vec(0.3, 0.6, 0.74) },
    upper_arm_R: { dir: vec(-0.3, 0.6, 0.74) },
    forearm_L: { dir: vec(0.1, 0.9, 0.4) },
    forearm_R: { dir: vec(-0.1, 0.9, 0.4) },
  },
  hips: [0, 0.02, 0],
};

/** Opening out of the rotation just before touchdown. */
POSES.open = {
  bones: {
    thigh_R: { dir: limb(10, -2) },
    shin_R: { dir: limb(-10, -2) },
    thigh_L: { dir: limb(-25, 8) },
    shin_L: { dir: limb(-35, 8) },
    spine: { dir: vec(0, 0.98, 0.15) },
    ...armsOut(70, 10),
  },
};
