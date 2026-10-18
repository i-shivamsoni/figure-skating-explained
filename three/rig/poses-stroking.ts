import { limb, pointed, vec, type Pose, type Vec3 } from "./pose";
import { POSES, mirrorPose } from "./poses";

/**
 * Stroking poses, generated from a shape (how deep the knee, how far the trunk leans, how far
 * the free leg reaches) so the same stroke can be easy, a progressive run or a flat-out sprint,
 * forward or backward. Forward stroking: the skating knee is bent over a flat blade, the free
 * leg finishes its push behind and out to the side, toe pointed, the trunk leans in with the
 * head up; the knee is deepest as the feet pass (the push starts there) and rises a little in the
 * glide. Backward stroking: the free leg finishes ahead of the body (the C-cut push) and the head
 * looks over a shoulder in the direction of travel. On a sustained curve the strokes become
 * crossovers: the outside foot crosses over the inside one and the inside foot pushes under the
 * body on its outside edge, finishing extended across; the inside arm leads and the head turns
 * into the circle.
 */
export interface StrokeShape {
  /** Knee bend of the skating leg in degrees (thigh forward plus shin back). */
  knee: number;
  /** Forward lean of the trunk in degrees. */
  torso: number;
  /** How far the free leg reaches at the end of the push, degrees from vertical. */
  reach: number;
  /** How far the free leg is pushed out to the side, degrees. */
  push: number;
  /** Arm carriage: held out softly, low and relaxed, or pumping like a sprinter. */
  arms: "out" | "low" | "swing";
}

export type StrokeFoot = "L" | "R" | "both";

export interface StrokeParams extends StrokeShape {
  /** The skating foot; "both" is the two-foot moment between strokes (or a coast). */
  foot: StrokeFoot;
  /** Skating backward: the free leg reaches ahead and the head turns to look where she is going. */
  backward?: boolean;
  /** Which shoulder she looks over when skating backward. */
  look?: "L" | "R";
  /** Crossovers on a curve: the side the circle's centre is on (the inside foot's side). */
  cross?: "L" | "R";
}

/** The flat standing foot: the rest direction of the foot bone, which lies along the ice. */
const FLAT: Vec3 = [0, -0.381, 0.924];
const THIGH = 0.45;
const SHIN = 0.43;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** The trunk leaning `torso` degrees forward; `look` turns the head over a shoulder, `glance` turns it a little that way (into a circle). */
function trunk(torso: number, look?: "L" | "R", glance?: "L" | "R"): Pose["bones"] {
  const t = rad(torso);
  const tw = look ? (look === "L" ? 1 : -1) : glance ? (glance === "L" ? 0.3 : -0.3) : 0;
  return {
    spine: { dir: vec(0, Math.cos(t), Math.sin(t)) },
    chest: { dir: vec(0, Math.cos(t * 1.1), Math.sin(t * 1.1)), twist: tw * 0.3 },
    neck: { dir: vec(0, Math.cos(t * 0.35), Math.sin(t * 0.35)), twist: tw * 0.45 },
    head: { dir: vec(0, 0.995, 0.1), twist: tw * 0.75 },
  };
}

/**
 * Arms for a stroke. `swing` is +1 when the right arm leads (gliding on the left foot), −1 when
 * the left leads, 0 between strokes. "out" holds them softly out and a little forward, "low"
 * lets them hang lower with a small swing, "swing" pumps them like a sprinter.
 */
function arms(style: StrokeShape["arms"], swing: -1 | 0 | 1, inside?: "L" | "R"): Pose["bones"] {
  if (style === "swing") {
    // the leading arm swings to chest height with the elbow at about a right angle, the trailing arm reaches back
    const fwd = (lead: boolean, back: boolean) => (lead ? 45 : back ? -35 : 10);
    const fore = (lead: boolean, back: boolean) => (lead ? 95 : back ? -5 : 55);
    const leadR = swing > 0;
    const leadL = swing < 0;
    const backR = swing < 0;
    const backL = swing > 0;
    return {
      upper_arm_L: { dir: limb(fwd(leadL, backL), 12) },
      upper_arm_R: { dir: limb(fwd(leadR, backR), -12) },
      forearm_L: { dir: limb(fore(leadL, backL), 9) },
      forearm_R: { dir: limb(fore(leadR, backR), -9) },
    };
  }
  const elev = style === "out" ? 50 : 35;
  const base = style === "out" ? 20 : 25;
  const amp = style === "out" ? 6 : 12;
  // on a circle the inside arm leads and the outside arm trails
  const lead = inside === "L" ? 1 : inside === "R" ? -1 : 0;
  const fwdL = base - amp * swing + 18 * lead;
  const fwdR = base + amp * swing - 18 * lead;
  return {
    upper_arm_L: { dir: limb(fwdL, elev - 4) },
    upper_arm_R: { dir: limb(fwdR, -(elev - 4)) },
    forearm_L: { dir: limb(fwdL + 14, elev - 12) },
    forearm_R: { dir: limb(fwdR + 14, -(elev - 12)) },
  };
}

/** A bent skating leg over a flat blade, the foot drawn a little toward the centre line. */
function skatingLeg(side: "L" | "R", knee: number, inward: number): Pose["bones"] {
  const a = knee * 0.55;
  const b = knee * 0.45;
  const s = side === "L" ? -inward : inward;
  return {
    [`thigh_${side}`]: { dir: limb(a, s) },
    [`shin_${side}`]: { dir: limb(-b, s) },
    [`foot_${side}`]: { dir: FLAT },
  };
}

/** The free leg at the end of its push: behind (forward stroking) or ahead (backward), swung `sideDeg` to the skater's left (negative: right). */
function freeLeg(side: "L" | "R", reach: number, sideDeg: number, backward: boolean): Pose["bones"] {
  const dir = backward ? limb(reach * 0.8, sideDeg) : limb(-reach, sideDeg);
  return {
    [`thigh_${side}`]: { dir },
    [`shin_${side}`]: { dir },
    [`foot_${side}`]: { dir: pointed(dir, 50) },
  };
}

function drop(knee: number): number {
  const a = rad(knee * 0.55);
  const b = rad(knee * 0.45);
  return THIGH * (1 - Math.cos(a)) + SHIN * (1 - Math.cos(b));
}

/** A stroking pose from its shape. */
export function strokePose({ foot, knee, torso, reach, push, arms: armStyle, backward = false, look, cross }: StrokeParams): Pose {
  const over = backward ? look ?? "R" : undefined;
  const lean = backward ? Math.min(torso, 8) : torso;
  const inside = cross;
  const outside = cross === "L" ? "R" : cross === "R" ? "L" : undefined;
  const toInside = cross === "L" ? 1 : -1;
  if (foot === "both") {
    // the feet pass: the knee is at its deepest as the next push starts; in a crossover the outside foot is crossing in front
    const deep = knee * 1.1;
    const legs = outside ? { ...skatingLeg(outside, deep, 10), ...skatingLeg(inside!, deep, -6) } : { ...skatingLeg("L", deep, 2), ...skatingLeg("R", deep, 2) };
    return {
      bones: { ...legs, ...trunk(lean, over, inside), ...arms(armStyle, 0, inside) },
      hips: [outside ? 0.04 * toInside : 0, -drop(deep), 0],
    };
  }
  const free = foot === "L" ? "R" : "L";
  const out = free === "L" ? 1 : -1;
  const glide = knee * 0.85;
  if (outside && foot === outside) {
    // on the crossed-over outside foot: it sits across under the body, the inside leg has pushed under on its outside edge and finishes across
    return {
      bones: { ...skatingLeg(foot, glide, 14), ...freeLeg(free, reach, -out * 18, backward), ...trunk(lean, over, inside), ...arms(armStyle, foot === "L" ? 1 : -1, inside) },
      hips: [0.08 * toInside, -drop(glide), 0],
    };
  }
  const shift = foot === "L" ? 0.05 : -0.05;
  return {
    bones: { ...skatingLeg(foot, glide, 5), ...freeLeg(free, reach, out * (backward ? push * 0.6 : push), backward), ...trunk(lean, over, inside), ...arms(armStyle, foot === "L" ? 1 : -1, inside) },
    hips: [shift, -drop(glide), 0],
  };
}

/** Representative shapes, registered so the catalogue tests cover them; the gears in three/animation/stroking.ts own the live values. */
const EASY: StrokeShape = { knee: 30, torso: 10, reach: 35, push: 28, arms: "out" };
const RUN: StrokeShape = { knee: 42, torso: 18, reach: 42, push: 34, arms: "low" };
const SPRINT: StrokeShape = { knee: 55, torso: 30, reach: 50, push: 40, arms: "swing" };
const COAST: StrokeShape = { knee: 12, torso: 4, reach: 0, push: 0, arms: "out" };

POSES.strokeGlide = strokePose({ ...EASY, foot: "L" });
POSES.strokeRecover = strokePose({ ...EASY, foot: "both" });
POSES.runGlide = strokePose({ ...RUN, foot: "L" });
POSES.runRecover = strokePose({ ...RUN, foot: "both" });
POSES.sprintGlide = strokePose({ ...SPRINT, foot: "L" });
POSES.sprintRecover = strokePose({ ...SPRINT, foot: "both" });
POSES.backGlide = strokePose({ ...EASY, foot: "L", backward: true });
POSES.backRecover = strokePose({ ...EASY, foot: "both", backward: true });
POSES.backSprintGlide = strokePose({ ...SPRINT, foot: "L", backward: true });
POSES.coast = strokePose({ ...COAST, foot: "both" });
POSES.coastBack = strokePose({ ...COAST, foot: "both", backward: true });
POSES.strokeGlideR = mirrorPose(POSES.strokeGlide);
POSES.crossGlide = strokePose({ ...EASY, foot: "R", cross: "L" });
POSES.crossRecover = strokePose({ ...EASY, foot: "both", cross: "L" });
POSES.crossGlideInside = strokePose({ ...EASY, foot: "L", cross: "L" });
POSES.backCrossGlide = strokePose({ ...EASY, foot: "L", cross: "R", backward: true });
POSES.sprintCrossGlide = strokePose({ ...SPRINT, foot: "R", cross: "L" });
