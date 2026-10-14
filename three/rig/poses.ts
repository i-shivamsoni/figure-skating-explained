import { limb, mirrorDir, pointed, vec, type Pose, type Vec3 } from "./pose";

/**
 * Named poses in skater space (+X left, +Y up, +Z forward). Legs: `limb(fwd, side)`.
 * Spine/neck/head directions point up at rest; arms hang down at rest.
 * "L" is the skater's left. Most skaters rotate counter-clockwise and land on the right foot.
 */
/**
 * Arms carried out to the sides. A skater's arms are never a stiff T: the upper arm sits a
 * little below the shoulder line, the elbow is soft, so the forearm continues slightly lower
 * and further forward than the upper arm, with the hand leading. `elev` is the upper arm's
 * elevation from hanging (90 = horizontal), `fwd` how far forward of the frontal plane.
 */
const armsOut = (elev = 85, fwd = 10): Pose["bones"] => ({
  upper_arm_L: { dir: limb(fwd, Math.min(elev, 88) - 4) },
  upper_arm_R: { dir: limb(fwd, -(Math.min(elev, 88) - 4)) },
  forearm_L: { dir: limb(fwd + 14, Math.min(elev, 88) - 12) },
  forearm_R: { dir: limb(fwd + 14, -(Math.min(elev, 88) - 12)) },
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
      // the free foot is softly pointed; a foot hooked forward of a backward shin folds the ankle past 95°
      foot_L: { dir: pointed(limb(-50, 8), 50) },
      spine: { dir: vec(0, 0.98, 0.15) },
      ...armsOut(80, 5),
    },
    hips: [0, -0.02, 0],
  },

  /** Deep knee before take-off. */
  loadBO: {
    bones: {
      // the standing blade lies flat on the ice however far the shin leans
      foot_R: { dir: vec(0, -0.38, 0.925) },
      thigh_R: { dir: limb(45, -2) },
      shin_R: { dir: limb(-40, -2) },
      thigh_L: { dir: limb(-50, 8) },
      shin_L: { dir: limb(-60, 8) },
      spine: { dir: vec(0, 0.95, 0.3) },
      ...armsOut(70, -40),
    },
    hips: [0, -0.2, 0],
  },

  /** Rotating in the air: ankles crossed with the left foot in front, arms folded on the chest. */
  tuck: {
    bones: {
      thigh_L: { dir: limb(8, -7) },
      thigh_R: { dir: limb(1, 3) },
      shin_L: { dir: limb(-6, -13) },
      shin_R: { dir: limb(-2, 3) },
      foot_L: { dir: vec(0, -0.82, 0.57) },
      foot_R: { dir: vec(0, -0.82, 0.57) },
      spine: { dir: vec(0, 1, 0.02) },
      neck: { dir: vec(0, 1, 0.05) },
      upper_arm_L: { dir: vec(-0.2, -0.7, 0.68) },
      upper_arm_R: { dir: vec(0.2, -0.7, 0.68) },
      forearm_L: { dir: vec(-0.92, 0.3, 0.25) },
      forearm_R: { dir: vec(0.92, 0.3, 0.25) },
      hand_L: { dir: vec(-0.8, 0.5, 0.3) },
      hand_R: { dir: vec(0.8, 0.5, 0.3) },
    },
  },

  /** Landing check-out: right knee bent, left leg stretched back, arms open. */
  land: {
    bones: {
      // the standing blade lies flat on the ice however far the shin leans
      foot_R: { dir: vec(0, -0.38, 0.925) },
      thigh_R: { dir: limb(35, -2) },
      shin_R: { dir: limb(-30, -2) },
      thigh_L: { dir: limb(-60, 10) },
      shin_L: { dir: limb(-65, 10) },
      foot_L: { dir: pointed(limb(-65, 10), 50) },
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
      foot_R: { dir: pointed(limb(-95, -4), 50) },
      spine: { dir: vec(0, 0.3, 0.95) },
      chest: { dir: vec(0, 0.22, 0.98) },
      // the back arches and the head lifts so the eyes look ahead, not at the ice
      neck: { dir: vec(0, 0.62, 0.78) },
      head: { dir: vec(0, 0.88, 0.47) },
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

  /** Upright scratch spin: free foot crossed over the skating ankle, hands clasped overhead. */
  upright: {
    bones: {
      thigh_L: { dir: limb(1, 0) },
      shin_L: { dir: limb(-1, 0) },
      thigh_R: { dir: limb(6, 14) },
      shin_R: { dir: limb(-4, 18) },
      foot_R: { dir: vec(0.5, -0.55, 0.65) },
      spine: { dir: vec(0, 1, 0.02) },
      upper_arm_L: { dir: vec(0.12, 0.97, 0.08) },
      upper_arm_R: { dir: vec(-0.12, 0.97, 0.08) },
      forearm_L: { dir: vec(-0.62, 0.78, 0.08) },
      forearm_R: { dir: vec(0.62, 0.78, 0.08) },
      hand_L: { dir: vec(-0.85, 0.5, 0.05) },
      hand_R: { dir: vec(0.85, 0.5, 0.05) },
    },
  },

  /** Layback: head and shoulders arched back, free leg bent behind. */
  layback: {
    bones: {
      thigh_L: { dir: limb(2, 0) },
      shin_L: { dir: limb(-2, 0) },
      // attitude leg at 22° behind: with the pelvis tucked back for the arch, more would exceed the hip's extension
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
    hips: [0, -0.03, 0.06],
  },

  /**
   * Biellmann: free leg pulled up behind and over the head, held by both hands. The ring is shared
   * over the chain: the pelvis tips ~100° forward over the standing hip, the hip extends 40°, the
   * lumbar and thoracic arch back 45° and 35°, the neck 65°, so the thigh ends 50° above horizontal
   * and the folded shin brings the blade above the head.
   */
  biellmann: {
    bones: {
      thigh_L: { dir: limb(2, 0) },
      shin_L: { dir: limb(-2, 0) },
      thigh_R: { dir: limb(-140, -6) },
      shin_R: { dir: vec(0.05, 0.55, 0.85) },
      foot_R: { dir: pointed(vec(0.05, 0.55, 0.85), 50) },
      spine: { dir: vec(0, 0.57, 0.82) },
      chest: { dir: vec(0, 0.925, 0.38) },
      neck: { dir: vec(0, 0.74, -0.67) },
      head: { dir: vec(0, 0.24, -0.97) },
      upper_arm_L: { dir: vec(0.15, 0.97, 0.2) },
      upper_arm_R: { dir: vec(-0.15, 0.97, 0.2) },
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
      foot_R: { dir: pointed(limb(-108, -4), 50) },
      spine: { dir: vec(0, 0.7, 0.7) },
      chest: { dir: vec(0, 0.6, 0.8) },
      neck: { dir: vec(0, 0.8, 0.6) },
      head: { dir: vec(0, 0.95, 0.3) },
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

/**
 * Every registered pose name, read at call time: poses are added to POSES all through this
 * file and by other modules (three/rig/allPoses.ts imports them all), so a constant captured
 * here would miss everything registered after this line.
 */
export function poseNames(): string[] {
  return Object.keys(POSES);
}

/** Swap left and right so a pose can be mirrored for clockwise skaters or the other foot. */
export function mirrorPose(p: Pose): Pose {
  const bones: Pose["bones"] = {};
  for (const [name, aim] of Object.entries(p.bones)) {
    const swapped = name.endsWith("_L") ? name.slice(0, -2) + "_R" : name.endsWith("_R") ? name.slice(0, -2) + "_L" : name;
    // a twist the pose leaves out stays out, so the rig derives it for the mirrored side too
    bones[swapped as keyof Pose["bones"]] = aim.twist === undefined ? { dir: mirrorDir(aim.dir as Vec3) } : { dir: mirrorDir(aim.dir as Vec3), twist: -aim.twist };
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
    foot_R: { dir: pointed(limb(-50, -8), 50) },
    spine: { dir: vec(0, 0.98, 0.15) },
    ...armsOut(75, 10),
  },
  hips: [0, -0.02, 0],
};

/** Deep knee on the forward edge, arms swung back before the Axel. */
POSES.loadFO = {
  bones: {
    // the standing blade lies flat on the ice however far the shin leans
    foot_L: { dir: vec(0, -0.38, 0.925) },
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

/* ---------- spin variations (Technical Panel Handbook: 10 categories) ---------- */

/** Camel sideways (CS): shoulder line twisted to vertical, one arm up one down. */
POSES.camelSideways = {
  bones: {
    ...POSES.camel.bones,
    spine: { dir: vec(0, 0.35, 0.94), twist: 0.9 },
    chest: { dir: vec(0, 0.15, 0.99), twist: 1.4 },
    upper_arm_L: { dir: vec(0.1, 0.98, 0.15) },
    forearm_L: { dir: vec(0.1, 0.98, 0.1) },
    upper_arm_R: { dir: vec(-0.1, -0.98, 0.15) },
    forearm_R: { dir: vec(-0.1, -0.98, 0.1) },
  },
  hips: [0, -0.04, 0],
};

/** Camel upward (CU): shoulder line twisted past vertical, chest opening to the ceiling. */
POSES.camelUpward = {
  bones: {
    ...POSES.camel.bones,
    spine: { dir: vec(0, 0.4, 0.92), twist: 1.6 },
    chest: { dir: vec(0, 0.3, 0.95), twist: 2.6 },
    head: { dir: vec(0, 0.9, 0.4) },
    upper_arm_L: { dir: vec(0.2, 0.95, -0.2) },
    forearm_L: { dir: vec(0.2, 0.95, -0.2) },
    // the chest is rolled 149° to face the ceiling, so the right shoulder sits low on the skater's left and its
    // arm reaches out that way toward the ice; reaching down behind the rolled chest would be 110° of extension
    upper_arm_R: { dir: vec(0.75, -0.6, 0.3) },
    forearm_R: { dir: vec(0.7, -0.65, 0.3) },
  },
  hips: [0, -0.04, 0],
};

/** Sit sideways (SS): free leg out to the side, arms grasping under the knee. */
POSES.sitSideways = {
  bones: {
    ...POSES.sit.bones,
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
  hips: [0, -0.46, 0.05],
};

/** Sit behind (SB): free leg bent behind the skating leg ("broken leg" is the opposite; this is the tuck-behind). */
POSES.sitBehind = {
  bones: {
    ...POSES.sit.bones,
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
  hips: [0, -0.46, 0.02],
};

/** Upright forward (UF): torso folded forward toward the skating knee. */
POSES.uprightForward = {
  bones: {
    thigh_L: { dir: limb(2, 0) },
    shin_L: { dir: limb(-2, 0) },
    thigh_R: { dir: limb(5, 12) },
    shin_R: { dir: limb(-5, 14) },
    spine: { dir: vec(0, 0.3, 0.95) },
    chest: { dir: vec(0, 0.1, 1) },
    neck: { dir: vec(0, -0.2, 0.98) },
    head: { dir: vec(0, -0.3, 0.95) },
    upper_arm_L: { dir: vec(0.1, -0.9, 0.4) },
    upper_arm_R: { dir: vec(-0.1, -0.9, 0.4) },
    forearm_L: { dir: vec(0.1, -0.95, 0.3) },
    forearm_R: { dir: vec(-0.1, -0.95, 0.3) },
  },
  hips: [0, -0.02, -0.05],
};

/** Sideways leaning spin: upper body arched to the side. */
POSES.sidewaysLean = {
  bones: {
    thigh_L: { dir: limb(2, 0) },
    shin_L: { dir: limb(-2, 0) },
    thigh_R: { dir: limb(-20, -20) },
    shin_R: { dir: limb(-90, -25) },
    spine: { dir: vec(-0.45, 0.89, 0) },
    chest: { dir: vec(-0.7, 0.7, 0) },
    neck: { dir: vec(-0.85, 0.5, 0) },
    head: { dir: vec(-0.9, 0.4, 0) },
    upper_arm_L: { dir: vec(0.2, 0.95, 0.1) },
    forearm_L: { dir: vec(-0.4, 0.9, 0.1) },
    upper_arm_R: { dir: vec(-0.95, 0.2, 0.1) },
    forearm_R: { dir: vec(-0.95, -0.2, 0.1) },
  },
  hips: [0.05, -0.03, 0],
};

/** Crossfoot spin: both feet on the ice, toes together, heels apart. */
POSES.crossfoot = {
  bones: {
    thigh_L: { dir: limb(2, -8) },
    thigh_R: { dir: limb(2, 8) },
    shin_L: { dir: limb(-2, -10) },
    shin_R: { dir: limb(-2, 10) },
    foot_L: { dir: vec(-0.4, -0.2, 0.9) },
    foot_R: { dir: vec(0.4, -0.2, 0.9) },
    upper_arm_L: { dir: vec(0.05, 0.99, 0.05) },
    upper_arm_R: { dir: vec(-0.05, 0.99, 0.05) },
    forearm_L: { dir: vec(-0.1, 0.99, 0.05) },
    forearm_R: { dir: vec(0.1, 0.99, 0.05) },
  },
};

/** Butterfly take-off into a flying camel: body horizontal, legs scissoring high behind. */
POSES.flyCamel = {
  bones: {
    thigh_L: { dir: limb(-120, 10) },
    shin_L: { dir: limb(-130, 10) },
    thigh_R: { dir: limb(-70, -15) },
    shin_R: { dir: limb(-80, -15) },
    spine: { dir: vec(0, -0.1, 1) },
    chest: { dir: vec(0, -0.2, 0.98) },
    neck: { dir: vec(0, 0.05, 1) },
    head: { dir: vec(0, 0.3, 0.95) },
    ...armsOut(85, 20),
  },
  hips: [0, 0.35, 0],
};

/** Flying sit: full sit position in the air. */
POSES.flySit = {
  bones: {
    thigh_L: { dir: limb(95, 5) },
    shin_L: { dir: limb(-5, 5) },
    thigh_R: { dir: limb(95, -12) },
    shin_R: { dir: limb(90, -12) },
    spine: { dir: vec(0, 0.85, 0.5) },
    upper_arm_L: { dir: vec(0.2, -0.3, 0.93) },
    upper_arm_R: { dir: vec(-0.2, -0.3, 0.93) },
    forearm_L: { dir: vec(0.1, 0.1, 0.99) },
    forearm_R: { dir: vec(-0.1, 0.1, 0.99) },
  },
  hips: [0, 0.15, 0],
};

/** Windmill: free leg swept near horizontal while the torso dips, one of three in a row. */
POSES.windmillUp = {
  bones: {
    thigh_L: { dir: limb(15, 0) },
    shin_L: { dir: limb(-15, 0) },
    thigh_R: { dir: limb(-130, -20) },
    shin_R: { dir: limb(-135, -20) },
    spine: { dir: vec(0, 0.2, 0.98) },
    chest: { dir: vec(0, 0.0, 1) },
    head: { dir: vec(0, -0.2, 0.98) },
    upper_arm_L: { dir: vec(0.2, -0.9, 0.4) },
    upper_arm_R: { dir: vec(-0.2, -0.9, 0.4) },
    forearm_L: { dir: vec(0.1, -0.95, 0.3) },
    forearm_R: { dir: vec(-0.1, -0.95, 0.3) },
  },
  hips: [0, -0.12, 0],
};
POSES.windmillDown = {
  bones: {
    thigh_L: { dir: limb(30, 0) },
    shin_L: { dir: limb(-30, 0) },
    thigh_R: { dir: limb(10, -30) },
    shin_R: { dir: limb(10, -30) },
    spine: { dir: vec(0, 0.6, 0.8) },
    chest: { dir: vec(0, 0.5, 0.86) },
    upper_arm_L: { dir: vec(0.3, 0.3, 0.9) },
    upper_arm_R: { dir: vec(-0.3, 0.3, 0.9) },
    forearm_L: { dir: vec(0.2, 0.5, 0.85) },
    forearm_R: { dir: vec(-0.2, 0.5, 0.85) },
  },
  hips: [0, -0.2, 0],
};

/** Preparation step into a spin: forward outside edge with the free leg wide behind. */
POSES.spinEntry = {
  bones: {
    thigh_L: { dir: limb(25, 2) },
    shin_L: { dir: limb(-20, 2) },
    thigh_R: { dir: limb(-50, -20) },
    shin_R: { dir: limb(-55, -20) },
    spine: { dir: vec(0, 0.95, 0.3) },
    ...armsOut(85, -30),
  },
  hips: [0, -0.1, 0],
};

/** Wind-up at the end of a spin: upright, arms overhead, free foot crossed. */
POSES.windUp = POSES.upright;

/** Exit of a spin: pushing out onto a back outside edge. */
POSES.spinExit = POSES.glideBO;

/** Step-over change of foot during a spin. */
POSES.changeFoot = {
  bones: {
    thigh_L: { dir: limb(20, 10) },
    shin_L: { dir: limb(-10, 10) },
    thigh_R: { dir: limb(20, -10) },
    shin_R: { dir: limb(-10, -10) },
    spine: { dir: vec(0, 0.95, 0.3) },
    ...armsOut(60, 10),
  },
  hips: [0, -0.12, 0],
};

/* ---------- steps and choreographic movements ---------- */

/** Gliding on one foot through a turn: free foot held close, arms quiet. */
POSES.turnReady = {
  bones: {
    thigh_L: { dir: limb(5, 0) },
    shin_L: { dir: limb(-8, 0) },
    thigh_R: { dir: limb(-15, -6) },
    shin_R: { dir: limb(-40, -6) },
    spine: { dir: vec(0, 0.99, 0.1) },
    ...armsOut(60, 10),
  },
  hips: [0, -0.06, 0],
};

/** Twizzle: tight axis, arms in, free foot crossed at the ankle. */
POSES.twizzle = {
  bones: {
    thigh_L: { dir: limb(2, 0) },
    shin_L: { dir: limb(-2, 0) },
    thigh_R: { dir: limb(8, 8) },
    shin_R: { dir: limb(-20, 10) },
    spine: { dir: vec(0, 1, 0.02) },
    ...armsCrossed,
  },
};

/** Ina Bauer: one leg bent forward, the other straight behind on the same line, back arched. */
POSES.inaBauer = {
  bones: {
    thigh_L: { dir: limb(40, 40) },
    shin_L: { dir: limb(-30, 40) },
    foot_L: { dir: vec(0.9, -0.2, 0.3) },
    thigh_R: { dir: limb(-15, -60) },
    shin_R: { dir: limb(-15, -60) },
    foot_R: { dir: vec(-0.95, -0.2, 0.1) },
    spine: { dir: vec(0, 0.85, -0.5) },
    chest: { dir: vec(0, 0.6, -0.8) },
    neck: { dir: vec(0, 0.3, -0.95) },
    head: { dir: vec(0, 0.2, -1) },
    upper_arm_L: { dir: vec(0.4, 0.7, -0.6) },
    upper_arm_R: { dir: vec(-0.4, 0.7, -0.6) },
    forearm_L: { dir: vec(0.3, 0.6, -0.75) },
    forearm_R: { dir: vec(-0.3, 0.6, -0.75) },
  },
  hips: [0, -0.2, 0.05],
};

/** Hydroblade: deep lean on a back inside edge, torso almost on the ice, hand trailing. */
POSES.hydroblade = {
  bones: {
    thigh_L: { dir: limb(105, 15) },
    shin_L: { dir: limb(-5, 25) },
    foot_L: { dir: vec(0.3, -0.2, 0.9) },
    // the extended leg trails behind-sideways along the curve: a leg straight out to the side while the
    // trunk leans over it would need 85° of abduction on top of the pelvis's roll
    thigh_R: { dir: limb(-30, -60) },
    shin_R: { dir: limb(-32, -60) },
    foot_R: { dir: pointed(limb(-32, -60), 50) },
    spine: { dir: vec(-0.75, 0.4, 0.5) },
    chest: { dir: vec(-0.85, 0.3, 0.45) },
    neck: { dir: vec(-0.8, 0.45, 0.4) },
    head: { dir: vec(-0.7, 0.55, 0.45) },
    upper_arm_L: { dir: vec(0.1, 0.95, 0.3) },
    forearm_L: { dir: vec(0.2, 0.95, 0.2) },
    upper_arm_R: { dir: vec(-0.4, -0.7, 0.6) },
    forearm_R: { dir: vec(-0.3, -0.8, 0.5) },
  },
  hips: [-0.15, -0.62, 0.05],
};

/** Arabesque spiral at full extension (free leg well above hip height). */
POSES.arabesque = {
  bones: {
    ...POSES.spiral.bones,
    thigh_R: { dir: limb(-120, -4) },
    shin_R: { dir: limb(-122, -4) },
    foot_R: { dir: pointed(limb(-122, -4), 50) },
    spine: { dir: vec(0, 0.5, 0.86) },
    chest: { dir: vec(0, 0.4, 0.92) },
    upper_arm_L: { dir: vec(0.3, 0.4, 0.86) },
    upper_arm_R: { dir: vec(-0.3, 0.4, 0.86) },
    forearm_L: { dir: vec(0.2, 0.4, 0.9) },
    forearm_R: { dir: vec(-0.2, 0.4, 0.9) },
  },
};

/** Catch-foot layback on a bent skating knee: the free foot is held above the head by one hand. */
POSES.catchFoot = {
  bones: {
    thigh_L: { dir: limb(35, 0) },
    shin_L: { dir: limb(-35, 0) },
    // the hand pulls the knee up: 55° behind with the pelvis tilted ~17° forward keeps the hip inside 40° of extension
    thigh_R: { dir: limb(-55, -12) },
    shin_R: { dir: vec(0.05, 0.9, -0.45) },
    // pointed on the dorsal side of the shin line (toes up and back into the hand), never folded toward the sole
    foot_R: { dir: pointed(vec(0.05, 0.9, -0.45), 50) },
    spine: { dir: vec(0, 0.9, -0.44) },
    chest: { dir: vec(0, 0.62, -0.78) },
    neck: { dir: vec(0, 0.4, -0.92) },
    head: { dir: vec(0, 0.25, -0.97) },
    upper_arm_R: { dir: vec(-0.15, 0.85, -0.5) },
    forearm_R: { dir: vec(-0.05, 0.45, -0.9) },
    hand_R: { dir: vec(0, 0.2, -1) },
    upper_arm_L: { dir: vec(0.9, 0.35, 0.25) },
    forearm_L: { dir: vec(0.95, 0.25, 0.2) },
  },
  hips: [0, -0.2, 0.08],
};

/** Open arch: chest to the ceiling, hands behind the head, on a long glide. */
POSES.openArch = {
  bones: {
    thigh_L: { dir: limb(15, 25) },
    shin_L: { dir: limb(-10, 25) },
    thigh_R: { dir: limb(-15, -40) },
    shin_R: { dir: limb(-15, -40) },
    foot_L: { dir: vec(0.6, -0.2, 0.75) },
    foot_R: { dir: vec(-0.8, -0.2, 0.55) },
    spine: { dir: vec(0, 0.85, -0.52) },
    chest: { dir: vec(0, 0.7, -0.7) },
    neck: { dir: vec(0, 0.5, -0.85) },
    head: { dir: vec(0, 0.45, -0.9) },
    upper_arm_L: { dir: vec(0.5, 0.75, -0.4) },
    upper_arm_R: { dir: vec(-0.5, 0.75, -0.4) },
    forearm_L: { dir: vec(-0.7, 0.4, -0.55) },
    forearm_R: { dir: vec(0.7, 0.4, -0.55) },
  },
  hips: [0, -0.1, 0.04],
};

/* ---------- field moves, non-listed jumps and spin shapes named in the handbooks or in common use ---------- */

/** Cantilever: both blades on the ice, knees bent deeply, torso laid back almost parallel to the ice. */
POSES.cantilever = {
  bones: {
    thigh_L: { dir: limb(75, 30) },
    thigh_R: { dir: limb(75, -30) },
    shin_L: { dir: limb(-5, 30) },
    shin_R: { dir: limb(-5, -30) },
    foot_L: { dir: vec(0.5, -0.2, 0.85) },
    foot_R: { dir: vec(-0.5, -0.2, 0.85) },
    spine: { dir: vec(0, 0.3, -0.95) },
    chest: { dir: vec(0, 0.15, -0.99) },
    neck: { dir: vec(0, 0.0, -1) },
    head: { dir: vec(0, -0.1, -1) },
    upper_arm_L: { dir: vec(0.6, 0.3, -0.75) },
    upper_arm_R: { dir: vec(-0.6, 0.3, -0.75) },
    forearm_L: { dir: vec(0.4, 0.2, -0.9) },
    forearm_R: { dir: vec(-0.4, 0.2, -0.9) },
  },
  hips: [0, -0.55, 0.25],
};

/** Charlotte: a forward spiral folded in half, chest to the skating knee and the free leg straight up. */
POSES.charlotte = {
  bones: {
    thigh_L: { dir: limb(4, 0) },
    shin_L: { dir: limb(-4, 0) },
    // 160° behind: the pelvis tips 120° over the standing hip (near its 130° of flexion) and the free hip extends 40°
    thigh_R: { dir: limb(-160, -6) },
    shin_R: { dir: limb(-166, -6) },
    foot_R: { dir: vec(0, 0.3, -0.95) },
    spine: { dir: vec(0, -0.55, 0.84) },
    chest: { dir: vec(0, -0.8, 0.6) },
    neck: { dir: vec(0, -0.95, 0.3) },
    head: { dir: vec(0, -1, 0.1) },
    upper_arm_L: { dir: vec(0.1, -0.95, 0.3) },
    upper_arm_R: { dir: vec(-0.1, -0.95, 0.3) },
    forearm_L: { dir: vec(0.05, -1, 0.1) },
    forearm_R: { dir: vec(-0.05, -1, 0.1) },
  },
  hips: [0, -0.05, 0.05],
};

/** Layover (layback) Ina Bauer: the Ina Bauer with the back arched until the head hangs below the shoulders. */
POSES.layoverBauer = {
  bones: {
    ...POSES.inaBauer.bones,
    spine: { dir: vec(0, 0.6, -0.8) },
    chest: { dir: vec(0, 0.2, -0.98) },
    neck: { dir: vec(0, -0.2, -0.98) },
    head: { dir: vec(0, -0.4, -0.9) },
    upper_arm_L: { dir: vec(0.5, 0.3, -0.8) },
    upper_arm_R: { dir: vec(-0.5, 0.3, -0.8) },
    forearm_L: { dir: vec(0.3, 0.1, -0.95) },
    forearm_R: { dir: vec(-0.3, 0.1, -0.95) },
  },
  hips: [0, -0.3, 0.1],
};

/** Knee slide: sliding on both knees, shins flat on the ice, torso arched back. */
POSES.kneeSlide = {
  bones: {
    thigh_L: { dir: limb(5, 8) },
    thigh_R: { dir: limb(5, -8) },
    shin_L: { dir: limb(-95, 8) },
    shin_R: { dir: limb(-95, -8) },
    foot_L: { dir: vec(0.1, -0.1, -1) },
    foot_R: { dir: vec(-0.1, -0.1, -1) },
    spine: { dir: vec(0, 0.9, -0.42) },
    chest: { dir: vec(0, 0.75, -0.65) },
    head: { dir: vec(0, 0.5, -0.85) },
    upper_arm_L: { dir: vec(0.7, 0.6, -0.3) },
    upper_arm_R: { dir: vec(-0.7, 0.6, -0.3) },
    forearm_L: { dir: vec(0.4, 0.9, -0.1) },
    forearm_R: { dir: vec(-0.4, 0.9, -0.1) },
  },
  hips: [0, -0.5, 0.0],
};

/** Split position in the air (split jump, Russian split): legs opened front and back, arms reaching the front foot. */
POSES.splitAir = {
  bones: {
    // a 166° split: front hip at 130° of flexion and back hip at 40° of extension about a pelvis tipped ~40° forward
    thigh_L: { dir: limb(88, 5) },
    shin_L: { dir: limb(90, 5) },
    foot_L: { dir: pointed(limb(90, 5), 50) },
    thigh_R: { dir: limb(-78, -5) },
    shin_R: { dir: limb(-82, -5) },
    foot_R: { dir: pointed(limb(-82, -5), 50) },
    spine: { dir: vec(0, 0.85, 0.5) },
    chest: { dir: vec(0, 0.75, 0.65) },
    upper_arm_L: { dir: vec(0.2, -0.3, 0.93) },
    upper_arm_R: { dir: vec(-0.2, -0.3, 0.93) },
    forearm_L: { dir: vec(0.1, -0.2, 0.98) },
    forearm_R: { dir: vec(-0.1, -0.2, 0.98) },
  },
};

/** Somersault tuck for a backflip: knees drawn up, arms out for balance. */
POSES.flipTuck = {
  bones: {
    thigh_L: { dir: limb(100, 6) },
    thigh_R: { dir: limb(100, -6) },
    shin_L: { dir: limb(-10, 6) },
    shin_R: { dir: limb(-10, -6) },
    spine: { dir: vec(0, 0.95, 0.3) },
    neck: { dir: vec(0, 0.95, -0.3) },
    head: { dir: vec(0, 0.8, -0.6) },
    ...armsOut(90, -20),
  },
};

/** Headless spin: an upright spin with the head and neck dropped backward off the axis. */
POSES.headless = {
  bones: {
    ...POSES.upright.bones,
    neck: { dir: vec(0, 0.42, -0.91) },
    head: { dir: vec(0, 0.1, -1) },
    upper_arm_L: { dir: vec(0.05, 0.99, -0.1) },
    upper_arm_R: { dir: vec(-0.05, 0.99, -0.1) },
    forearm_L: { dir: vec(-0.3, 0.95, -0.1) },
    forearm_R: { dir: vec(0.3, 0.95, -0.1) },
  },
};

/** Pancake: a sit variation with the free leg folded across and the torso flattened over it. */
POSES.pancake = {
  bones: {
    thigh_L: { dir: limb(88, 3) },
    shin_L: { dir: limb(-5, 3) },
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
  hips: [0, -0.46, 0.05],
};

/** Doughnut: a camel with the free leg bent up behind and the blade caught overhead, body making a ring. */
POSES.doughnut = {
  bones: {
    thigh_L: { dir: limb(3, 0) },
    shin_L: { dir: limb(-3, 0) },
    thigh_R: { dir: limb(-95, -4) },
    shin_R: { dir: vec(0, 0.95, -0.3) },
    foot_R: { dir: pointed(vec(0, 0.95, -0.3), 50) },
    // the ring: pelvis ~74° forward, lumbar arched back 45°, thoracic 35°, so the chest is near vertical and the
    // arms can go straight up and the forearms back to the blade (the shoulder cannot reach 100° behind the chest)
    spine: { dir: vec(0, 0.87, 0.49) },
    chest: { dir: vec(0, 1, -0.08) },
    neck: { dir: vec(0, 0.75, -0.66) },
    head: { dir: vec(0, 0.5, -0.87) },
    upper_arm_L: { dir: vec(0.12, 0.99, -0.08) },
    upper_arm_R: { dir: vec(-0.12, 0.99, -0.08) },
    forearm_L: { dir: vec(-0.05, 0.6, -0.8) },
    forearm_R: { dir: vec(0.05, 0.6, -0.8) },
  },
  hips: [0, -0.04, 0],
};

/** Butterfly / Toe Arabian take-off: a horizontal scissor kick, used as a flying entry or a change of foot by jump. */
POSES.toeArabian = {
  bones: {
    ...POSES.flyCamel.bones,
    thigh_L: { dir: limb(-150, 15) },
    shin_L: { dir: limb(-155, 15) },
    thigh_R: { dir: limb(-40, -20) },
    shin_R: { dir: limb(-45, -20) },
    spine: { dir: vec(0, -0.3, 0.95) },
    chest: { dir: vec(0, -0.4, 0.92) },
    neck: { dir: vec(0, -0.15, 0.99) },
    head: { dir: vec(0, 0.1, 1) },
  },
  hips: [0, 0.4, 0],
};

/** Cross roll: the free foot crosses in front and takes a new outside edge. */
POSES.crossRoll = {
  bones: {
    thigh_L: { dir: limb(8, 0) },
    shin_L: { dir: limb(-8, 0) },
    thigh_R: { dir: limb(20, 25) },
    shin_R: { dir: limb(5, 28) },
    foot_R: { dir: vec(0.4, -0.3, 0.85) },
    spine: { dir: vec(0, 0.98, 0.15) },
    ...armsOut(70, 10),
  },
  hips: [0, -0.05, 0],
};

/** Toe step: a step onto the toe pick of the free foot, blade pointed down. */
POSES.toeStep = {
  bones: {
    thigh_L: { dir: limb(8, 0) },
    shin_L: { dir: limb(-8, 0) },
    thigh_R: { dir: limb(25, -8) },
    shin_R: { dir: limb(-10, -8) },
    foot_R: { dir: vec(0, -0.95, 0.3) },
    spine: { dir: vec(0, 0.99, 0.1) },
    ...armsOut(65, 15),
  },
  hips: [0, -0.04, 0],
};

/** Deep landing absorption: the landing knee bends well past the check-out depth before rising. */
POSES.landDeep = {
  bones: {
    // the standing blade lies flat on the ice however far the shin leans
    foot_R: { dir: vec(0, -0.38, 0.925) },
    ...POSES.land.bones,
    thigh_R: { dir: limb(55, -2) },
    shin_R: { dir: limb(-45, -2) },
    thigh_L: { dir: limb(-50, 10) },
    shin_L: { dir: limb(-55, 10) },
    foot_L: { dir: pointed(limb(-55, 10), 50) },
    spine: { dir: vec(0, 0.9, 0.42) },
  },
  hips: [0, -0.26, 0],
};

/* ---------- pair skating (Technical Panel Handbook Pairs) ---------- */

/**
 * Lift positions put the Woman's hips at the root (`hips: [0, -0.91, 0]`) so a timeline can
 * place the root on the Man's hands; the hold point of each position is listed in
 * three/animation/pairs.ts. The Man's lifting poses keep the root between his blades.
 */

/** Upright position (upper body vertical) in a Group 3 hip lift: legs in a split, arms in a V. */
POSES.liftUpright = {
  bones: {
    // a 160° split about a pelvis tipped ~40° forward (front hip 125° flexed, back hip 35° extended); the trunk stays vertical
    thigh_L: { dir: limb(85, 6) },
    shin_L: { dir: limb(88, 6) },
    foot_L: { dir: pointed(limb(88, 6), 50) },
    thigh_R: { dir: limb(-75, -6) },
    shin_R: { dir: limb(-80, -6) },
    foot_R: { dir: pointed(limb(-80, -6), 50) },
    spine: { dir: vec(0, 1, 0.02) },
    chest: { dir: vec(0, 0.97, -0.22) },
    neck: { dir: vec(0, 0.95, -0.3) },
    head: { dir: vec(0, 0.9, -0.42) },
    upper_arm_L: { dir: vec(0.75, 0.65, 0) },
    forearm_L: { dir: vec(0.7, 0.7, 0) },
    hand_L: { dir: vec(0.65, 0.75, 0) },
    upper_arm_R: { dir: vec(-0.75, 0.65, 0) },
    forearm_R: { dir: vec(-0.7, 0.7, 0) },
    hand_R: { dir: vec(-0.65, 0.75, 0) },
  },
  hips: [0, -0.91, 0],
};

/** Press lift (Group 4, hand to hand): the Woman upright over the Man, arms straight down into his hands, legs in a straddle. */
POSES.liftPress = {
  bones: {
    // a 130° straddle: 65° of abduction each side is the turnout limit of the hip
    thigh_L: { dir: limb(0, 65) },
    shin_L: { dir: limb(0, 66) },
    foot_L: { dir: pointed(limb(0, 66), 50) },
    thigh_R: { dir: limb(0, -65) },
    shin_R: { dir: limb(0, -66) },
    foot_R: { dir: pointed(limb(0, -66), 50) },
    spine: { dir: vec(0, 1, 0.05) },
    chest: { dir: vec(0, 1, 0.02) },
    head: { dir: vec(0, 0.98, 0.2) },
    upper_arm_L: { dir: vec(0.05, -0.95, 0.3) },
    forearm_L: { dir: vec(0.02, -0.95, 0.3) },
    hand_L: { dir: vec(0, -0.95, 0.3) },
    upper_arm_R: { dir: vec(-0.05, -0.95, 0.3) },
    forearm_R: { dir: vec(-0.02, -0.95, 0.3) },
    hand_R: { dir: vec(0, -0.95, 0.3) },
  },
  hips: [0, -0.91, 0],
};

/** Star position (Group 5 lasso): sideways with the upper body parallel to the ice, one hand straight down to the Man's hand, legs spread. */
POSES.liftStar = {
  bones: {
    hips: { dir: vec(-1, 0.05, 0) },
    spine: { dir: vec(-1, 0, 0) },
    chest: { dir: vec(-1, 0.05, 0) },
    neck: { dir: vec(-1, 0.1, 0) },
    head: { dir: vec(-1, 0.15, 0) },
    upper_arm_R: { dir: vec(0, -1, 0) },
    forearm_R: { dir: vec(0, -1, 0) },
    hand_R: { dir: vec(0, -1, 0) },
    upper_arm_L: { dir: vec(0.05, 1, 0) },
    forearm_L: { dir: vec(0.05, 1, 0) },
    hand_L: { dir: vec(0.05, 1, 0) },
    thigh_L: { dir: vec(0.85, 0.1, 0.5) },
    shin_L: { dir: vec(0.85, 0.1, 0.5) },
    foot_L: { dir: pointed(vec(0.85, 0.1, 0.5), 50) },
    thigh_R: { dir: vec(0.85, -0.05, -0.5) },
    shin_R: { dir: vec(0.85, -0.05, -0.5) },
    foot_R: { dir: pointed(vec(0.85, -0.05, -0.5), 50) },
  },
  hips: [0, -0.91, 0],
};

/** Platter position: flat, facing down, upper body parallel to the ice; one hand down to the Man, the other arm out. */
POSES.liftPlatter = {
  bones: {
    hips: { dir: vec(0, 0, 1) },
    spine: { dir: vec(0, 0, 1) },
    chest: { dir: vec(0, 0.02, 1) },
    neck: { dir: vec(0, 0.1, 1) },
    head: { dir: vec(0, 0.25, 1) },
    upper_arm_R: { dir: vec(0, -1, 0) },
    forearm_R: { dir: vec(0, -1, 0) },
    hand_R: { dir: vec(0, -1, 0) },
    upper_arm_L: { dir: vec(0.95, -0.15, 0.25) },
    forearm_L: { dir: vec(1, 0, 0.1) },
    hand_L: { dir: vec(1, 0, 0) },
    thigh_L: { dir: vec(0.08, 0, -1) },
    shin_L: { dir: vec(0.08, 0.02, -1) },
    foot_L: { dir: vec(0.05, -0.2, -1) },
    thigh_R: { dir: vec(-0.08, 0, -1) },
    shin_R: { dir: vec(-0.08, 0.02, -1) },
    foot_R: { dir: vec(-0.05, -0.2, -1) },
  },
  hips: [0, -0.91, 0],
};

/** Twist lift: split position before rotating (each leg at least 45° from the body axis, legs straight), arms overhead. */
POSES.twistSplit = {
  bones: {
    // a 166° split (each leg well past 45° from the body axis): front hip 130° flexed, back hip 40° extended, pelvis ~40° forward
    thigh_L: { dir: limb(88, 5) },
    shin_L: { dir: limb(90, 5) },
    foot_L: { dir: pointed(limb(90, 5), 50) },
    thigh_R: { dir: limb(-78, -5) },
    shin_R: { dir: limb(-82, -5) },
    foot_R: { dir: pointed(limb(-82, -5), 50) },
    spine: { dir: vec(0, 1, 0.08) },
    chest: { dir: vec(0, 1, 0.05) },
    upper_arm_L: { dir: vec(0.35, 0.93, 0.05) },
    upper_arm_R: { dir: vec(-0.35, 0.93, 0.05) },
    forearm_L: { dir: vec(0.2, 0.98, 0.05) },
    forearm_R: { dir: vec(-0.2, 0.98, 0.05) },
    hand_L: { dir: vec(0.1, 1, 0) },
    hand_R: { dir: vec(-0.1, 1, 0) },
  },
};

/** Twist lift rotation: legs together, arms above the head for the revolutions. */
POSES.twistAir = {
  bones: {
    thigh_L: { dir: limb(4, -4) },
    thigh_R: { dir: limb(2, 3) },
    shin_L: { dir: limb(-2, -8) },
    shin_R: { dir: limb(-2, 3) },
    foot_L: { dir: vec(0, -0.8, 0.6) },
    foot_R: { dir: vec(0, -0.8, 0.6) },
    spine: { dir: vec(0, 1, 0.02) },
    neck: { dir: vec(0, 1, 0.05) },
    upper_arm_L: { dir: vec(0.1, 0.99, 0.03) },
    upper_arm_R: { dir: vec(-0.1, 0.99, 0.03) },
    forearm_L: { dir: vec(-0.08, 1, 0) },
    forearm_R: { dir: vec(0.08, 1, 0) },
    hand_L: { dir: vec(-0.1, 1, 0) },
    hand_R: { dir: vec(0.1, 1, 0) },
  },
};

/** Forward inside death spiral (right forward inside edge, circling counter-clockwise): leaning sideways to the ice, head below the skating knee, left arm to the Man. */
POSES.deathSpiralFi = {
  bones: {
    // the pelvis tips forward and rolls left with the lean and turns toward the circle, so the lumbar bends
    // 45° sideways at most (not 77°), the trailing free leg is within the hip's extension and the skating
    // knee bends in its own plane; the trunk carries the same turn
    hips: { dir: vec(0.7, 0.17, 0.7), twist: -1.05 },
    spine: { dir: vec(0.9, -0.4, 0.1), twist: 1.05 },
    chest: { dir: vec(0.92, -0.35, 0.1), twist: 1.05 },
    neck: { dir: vec(0.95, -0.25, 0.1), twist: 1.05 },
    head: { dir: vec(0.97, -0.15, 0.1), twist: 1.05 },
    thigh_R: { dir: vec(-0.909, -0.101, 0.404) },
    shin_R: { dir: vec(0.3, -0.949, -0.1) },
    thigh_L: { dir: vec(-0.1, 0.15, -0.98) },
    shin_L: { dir: vec(-0.1, 0.1, -0.99) },
    foot_L: { dir: pointed(vec(-0.1, 0.1, -0.99), 50) },
    upper_arm_L: { dir: vec(0.62, 0.72, 0.2) },
    forearm_L: { dir: vec(0.62, 0.72, 0.2) },
    hand_L: { dir: vec(0.62, 0.72, 0.2) },
    upper_arm_R: { dir: vec(0.85, 0.2, -0.3) },
    forearm_R: { dir: vec(0.9, 0.15, -0.3) },
    hand_R: { dir: vec(0.9, 0.1, -0.3) },
  },
  hips: [0.33, -0.41, -0.12],
};

/**
 * Backward outside death spiral (right back outside edge, counter-clockwise): the root faces away
 * from the pivot, the body arched backward toward it with the chest to the ceiling and the head
 * close to the ice; the right arm reaches overhead to the Man. The blade points to the skater's right.
 */
POSES.deathSpiralBo = {
  bones: {
    // the pelvis arches back with the trunk (the lumbar takes 45° of the 96°) and is turned toward the blade
    // so the skating knee, bent 80°, flexes in its plane with the blade across the line of the body
    hips: { dir: vec(0, 0.64, -0.77), twist: 0.26 },
    spine: { dir: vec(0, -0.1, -1) },
    chest: { dir: vec(0, -0.2, -1) },
    neck: { dir: vec(0, -0.45, -0.9) },
    head: { dir: vec(0, -0.65, -0.75) },
    // the skating knee bends in a plane that nearly holds the blade: thigh out to the right-front, shin down-right,
    // the blade turned the last 20° by the tibia
    thigh_R: { dir: vec(-0.6, -0.3, 0.74) },
    shin_R: { dir: vec(-0.5, -0.85, 0.15) },
    foot_R: { dir: vec(-0.85, -0.3, 0.4) },
    thigh_L: { dir: vec(0.75, -0.1, 0.65) },
    shin_L: { dir: vec(0.75, -0.15, 0.65) },
    foot_L: { dir: pointed(vec(0.75, -0.15, 0.65), 50) },
    upper_arm_R: { dir: vec(-0.1, 0.4, -0.9) },
    forearm_R: { dir: vec(-0.1, 0.4, -0.9) },
    hand_R: { dir: vec(-0.1, 0.4, -0.9) },
    upper_arm_L: { dir: vec(0.9, 0.3, -0.3) },
    forearm_L: { dir: vec(0.9, 0.3, -0.3) },
    hand_L: { dir: vec(0.9, 0.3, -0.3) },
  },
  hips: [0, -0.31, -0.22],
};

/** Pair camel: the inner (left) arm bent toward the partner's hand on the common axis, the outer arm out. */
POSES.pairCamel = {
  bones: {
    ...POSES.camel.bones,
    upper_arm_L: { dir: vec(0.7, 0.55, 0.45) },
    forearm_L: { dir: vec(0.85, -0.4, 0.3) },
    hand_L: { dir: vec(0.9, -0.3, 0.3) },
    upper_arm_R: { dir: vec(-0.95, 0.1, 0.3) },
    forearm_R: { dir: vec(-0.95, 0.1, 0.3) },
  },
  hips: [0, -0.04, 0],
};

/** Pair sit: the inner (left) arm to the partner on the axis, the free leg forward. */
POSES.pairSit = {
  bones: {
    ...POSES.sit.bones,
    upper_arm_L: { dir: vec(0.8, 0.2, 0.55) },
    forearm_L: { dir: vec(0.9, -0.2, 0.4) },
    hand_L: { dir: vec(0.9, -0.2, 0.4) },
    upper_arm_R: { dir: vec(-0.3, -0.2, 0.93) },
    forearm_R: { dir: vec(-0.2, 0.2, 0.96) },
  },
  hips: [0, -0.46, 0.05],
};

/** Pair sit with the free leg behind (the handbook's pair sit: one partner's free leg behind, the other's in front). */
POSES.pairSitBehind = {
  bones: {
    ...POSES.sitBehind.bones,
    upper_arm_L: { dir: vec(0.8, 0.2, 0.55) },
    forearm_L: { dir: vec(0.9, -0.2, 0.4) },
    hand_L: { dir: vec(0.9, -0.2, 0.4) },
    upper_arm_R: { dir: vec(-0.3, -0.2, 0.93) },
    forearm_R: { dir: vec(-0.2, 0.2, 0.96) },
  },
  hips: [0, -0.46, 0.02],
};

/** Pair upright: inner arm to the partner, outer arm overhead. */
POSES.pairUpright = {
  bones: {
    thigh_L: { dir: limb(1, 0) },
    shin_L: { dir: limb(-1, 0) },
    thigh_R: { dir: limb(6, 14) },
    shin_R: { dir: limb(-4, 18) },
    foot_R: { dir: vec(0.5, -0.55, 0.65) },
    spine: { dir: vec(0, 1, 0.02) },
    upper_arm_L: { dir: vec(0.9, -0.1, 0.4) },
    forearm_L: { dir: vec(0.95, -0.1, 0.3) },
    hand_L: { dir: vec(0.95, -0.1, 0.3) },
    upper_arm_R: { dir: vec(-0.2, 0.97, 0.1) },
    forearm_R: { dir: vec(0.1, 0.99, 0.05) },
    hand_R: { dir: vec(0.2, 0.97, 0.05) },
  },
};

/* --- the Man --- */

/** Full extension of both lifting arms overhead, gliding on two feet. */
POSES.liftHold = {
  bones: {
    thigh_L: { dir: limb(8, 6) },
    shin_L: { dir: limb(-8, 6) },
    thigh_R: { dir: limb(-10, -6) },
    shin_R: { dir: limb(-15, -6) },
    spine: { dir: vec(0, 1, 0.03) },
    chest: { dir: vec(0, 1, 0.0) },
    neck: { dir: vec(0, 0.95, -0.3) },
    head: { dir: vec(0, 0.85, -0.5) },
    upper_arm_L: { dir: vec(-0.08, 0.98, 0.17) },
    forearm_L: { dir: vec(-0.05, 0.98, 0.17) },
    hand_L: { dir: vec(0, 0.98, 0.2) },
    upper_arm_R: { dir: vec(0.08, 0.98, 0.17) },
    forearm_R: { dir: vec(0.05, 0.98, 0.17) },
    hand_R: { dir: vec(0, 0.98, 0.2) },
  },
  hips: [0, -0.03, 0],
};

/** One-hand hold: the right arm fully extended overhead, the left arm out to the side. */
POSES.liftHoldOne = {
  bones: {
    ...POSES.liftHold.bones,
    upper_arm_R: { dir: vec(0.1, 0.98, 0.15) },
    forearm_R: { dir: vec(0.08, 0.98, 0.15) },
    hand_R: { dir: vec(0.05, 0.98, 0.18) },
    upper_arm_L: { dir: limb(10, 85) },
    forearm_L: { dir: limb(10, 85) },
    hand_L: { dir: limb(10, 85) },
  },
  hips: [0, -0.03, 0],
};

/** Knee bend before the lift, hands at the Woman's waist or hands in front. */
POSES.liftLoad = {
  bones: {
    thigh_L: { dir: limb(50, 8) },
    shin_L: { dir: limb(-45, 8) },
    thigh_R: { dir: limb(50, -8) },
    shin_R: { dir: limb(-45, -8) },
    spine: { dir: vec(0, 0.95, 0.3) },
    chest: { dir: vec(0, 0.95, 0.3) },
    upper_arm_L: { dir: vec(0.1, -0.45, 0.9) },
    forearm_L: { dir: vec(0.05, -0.1, 1) },
    hand_L: { dir: vec(0, -0.1, 1) },
    upper_arm_R: { dir: vec(-0.1, -0.45, 0.9) },
    forearm_R: { dir: vec(-0.05, -0.1, 1) },
    hand_R: { dir: vec(0, -0.1, 1) },
  },
  hips: [0, -0.22, 0],
};

/** Lowering the Woman: arms forward at shoulder level, knees soft. */
POSES.liftLower = {
  bones: {
    thigh_L: { dir: limb(25, 6) },
    shin_L: { dir: limb(-20, 6) },
    thigh_R: { dir: limb(25, -6) },
    shin_R: { dir: limb(-20, -6) },
    spine: { dir: vec(0, 0.98, 0.15) },
    upper_arm_L: { dir: vec(0.15, 0.35, 0.92) },
    forearm_L: { dir: vec(0.1, 0.3, 0.95) },
    hand_L: { dir: vec(0, 0.2, 1) },
    upper_arm_R: { dir: vec(-0.15, 0.35, 0.92) },
    forearm_R: { dir: vec(-0.1, 0.3, 0.95) },
    hand_R: { dir: vec(0, 0.2, 1) },
  },
  hips: [0, -0.1, 0],
};

/** Twist lift: arms sideways, straight, at shoulder level after the release. */
POSES.twistSideways = {
  bones: {
    thigh_L: { dir: limb(8, 6) },
    shin_L: { dir: limb(-8, 6) },
    thigh_R: { dir: limb(-10, -6) },
    shin_R: { dir: limb(-15, -6) },
    spine: { dir: vec(0, 1, 0.03) },
    neck: { dir: vec(0, 0.95, -0.3) },
    head: { dir: vec(0, 0.85, -0.5) },
    upper_arm_L: { dir: limb(5, 90) },
    forearm_L: { dir: limb(5, 90) },
    hand_L: { dir: limb(5, 90) },
    upper_arm_R: { dir: limb(5, -90) },
    forearm_R: { dir: limb(5, -90) },
    hand_R: { dir: limb(5, -90) },
  },
  hips: [0, -0.03, 0],
};

/** Twist lift: hands apart overhead, ready to catch the Woman at the sides of the waist. */
POSES.twistCatch = {
  bones: {
    thigh_L: { dir: limb(20, 6) },
    shin_L: { dir: limb(-18, 6) },
    thigh_R: { dir: limb(-5, -6) },
    shin_R: { dir: limb(-15, -6) },
    spine: { dir: vec(0, 1, 0.05) },
    neck: { dir: vec(0, 0.95, -0.3) },
    head: { dir: vec(0, 0.85, -0.5) },
    upper_arm_L: { dir: vec(0.3, 0.85, 0.4) },
    forearm_L: { dir: vec(0.2, 0.9, 0.35) },
    hand_L: { dir: vec(0.15, 0.95, 0.3) },
    upper_arm_R: { dir: vec(-0.3, 0.85, 0.4) },
    forearm_R: { dir: vec(-0.2, 0.9, 0.35) },
    hand_R: { dir: vec(-0.15, 0.95, 0.3) },
  },
  hips: [0, -0.08, 0],
};

/** Throw jump: beside the Woman with both hands at her waist on his right, knees bent. */
POSES.throwAssist = {
  bones: {
    thigh_L: { dir: limb(40, 10) },
    shin_L: { dir: limb(-35, 10) },
    thigh_R: { dir: limb(35, -12) },
    shin_R: { dir: limb(-35, -12) },
    spine: { dir: vec(-0.25, 0.9, 0.3), twist: -0.5 },
    chest: { dir: vec(-0.3, 0.9, 0.3), twist: -0.6 },
    head: { dir: vec(-0.3, 0.95, 0.1) },
    upper_arm_R: { dir: vec(-0.85, -0.45, 0.25) },
    forearm_R: { dir: vec(-0.9, -0.2, 0.4) },
    hand_R: { dir: vec(-0.9, -0.1, 0.4) },
    upper_arm_L: { dir: vec(-0.55, -0.7, 0.45) },
    forearm_L: { dir: vec(-0.9, -0.2, 0.4) },
    hand_L: { dir: vec(-0.9, -0.1, 0.4) },
  },
  hips: [0, -0.18, 0],
};

/** Throw jump: the arms follow through up and to the right as the Woman leaves. */
POSES.throwRelease = {
  bones: {
    thigh_L: { dir: limb(15, 8) },
    shin_L: { dir: limb(-12, 8) },
    thigh_R: { dir: limb(-20, -10) },
    shin_R: { dir: limb(-30, -10) },
    spine: { dir: vec(-0.15, 0.97, 0.15), twist: -0.3 },
    chest: { dir: vec(-0.2, 0.95, 0.2), twist: -0.4 },
    head: { dir: vec(-0.3, 0.9, 0.2) },
    upper_arm_R: { dir: vec(-0.7, 0.6, 0.35) },
    forearm_R: { dir: vec(-0.7, 0.65, 0.3) },
    hand_R: { dir: vec(-0.7, 0.65, 0.3) },
    upper_arm_L: { dir: vec(-0.4, 0.75, 0.5) },
    forearm_L: { dir: vec(-0.6, 0.65, 0.45) },
    hand_L: { dir: vec(-0.6, 0.65, 0.45) },
  },
  hips: [0, -0.05, 0],
};

/**
 * Death spiral pivot: the right toe pick anchored behind, both knees clearly bent with the buttocks
 * not higher than the knee, the left arm fully extended to the Woman on his left, leaning away.
 */
POSES.pivot = {
  bones: {
    thigh_L: { dir: limb(85, 15) },
    shin_L: { dir: limb(-5, 15) },
    foot_L: { dir: vec(0.1, -0.3, 0.95) },
    thigh_R: { dir: limb(-20, -25) },
    shin_R: { dir: limb(-110, -25) },
    foot_R: { dir: vec(0, -0.9, -0.4) },
    spine: { dir: vec(-0.25, 0.95, 0.1) },
    chest: { dir: vec(-0.2, 0.97, 0.1) },
    neck: { dir: vec(0.1, 0.98, 0.15) },
    head: { dir: vec(0.3, 0.9, 0.2) },
    upper_arm_L: { dir: vec(0.9, -0.4, 0.15) },
    forearm_L: { dir: vec(0.92, -0.35, 0.15) },
    hand_L: { dir: vec(0.92, -0.3, 0.15) },
    upper_arm_R: { dir: vec(-0.9, 0.2, -0.3) },
    forearm_R: { dir: vec(-0.9, 0.2, -0.3) },
    hand_R: { dir: vec(-0.9, 0.2, -0.3) },
  },
  hips: [0.05, -0.45, -0.05],
};

/** Death spiral entry and exit: upright on the edge, the left arm extended to the partner. */
POSES.pivotEntry = {
  bones: {
    thigh_L: { dir: limb(20, 6) },
    shin_L: { dir: limb(-20, 6) },
    thigh_R: { dir: limb(-25, -12) },
    shin_R: { dir: limb(-45, -12) },
    spine: { dir: vec(-0.1, 0.99, 0.08) },
    head: { dir: vec(0.2, 0.95, 0.15) },
    upper_arm_L: { dir: vec(0.97, -0.1, 0.2) },
    forearm_L: { dir: vec(0.97, -0.1, 0.2) },
    hand_L: { dir: vec(0.97, -0.1, 0.2) },
    upper_arm_R: { dir: vec(-0.9, -0.1, 0.3) },
    forearm_R: { dir: vec(-0.9, -0.1, 0.3) },
  },
  hips: [0, -0.08, 0],
};

/** The Woman's death spiral entry: gliding on the right foot with the left arm extended to the Man, free leg back. */
POSES.spiralHold = {
  bones: {
    thigh_R: { dir: limb(8, -2) },
    shin_R: { dir: limb(-10, -2) },
    thigh_L: { dir: limb(-45, 10) },
    shin_L: { dir: limb(-50, 10) },
    foot_L: { dir: pointed(limb(-50, 10), 50) },
    spine: { dir: vec(0.15, 0.98, 0.1) },
    upper_arm_L: { dir: vec(0.97, -0.1, 0.2) },
    forearm_L: { dir: vec(0.97, -0.1, 0.2) },
    hand_L: { dir: vec(0.97, -0.1, 0.2) },
    upper_arm_R: { dir: vec(-0.9, -0.1, 0.3) },
    forearm_R: { dir: vec(-0.9, -0.1, 0.3) },
  },
  hips: [0, -0.04, 0],
};

/** The Woman's back outside death spiral entry: gliding backward on the right foot, the right arm reaching behind to the Man. */
POSES.spiralHoldBack = {
  bones: {
    thigh_R: { dir: limb(8, -2) },
    shin_R: { dir: limb(-10, -2) },
    thigh_L: { dir: limb(25, 15) },
    shin_L: { dir: limb(20, 15) },
    spine: { dir: vec(0, 0.95, -0.3) },
    // the shoulders turn so the right arm can reach behind: an arm 90° behind an unturned chest is out of reach
    chest: { dir: vec(0, 0.9, -0.42), twist: -0.8 },
    head: { dir: vec(0, 0.7, -0.7) },
    upper_arm_R: { dir: vec(-0.3, 0.4, -0.86) },
    forearm_R: { dir: vec(-0.3, 0.4, -0.86) },
    hand_R: { dir: vec(-0.3, 0.4, -0.86) },
    upper_arm_L: { dir: vec(0.95, 0.1, 0.3) },
    forearm_L: { dir: vec(0.95, 0.1, 0.3) },
  },
  hips: [0, -0.04, 0],
};
