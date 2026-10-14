import { describe, expect, it } from "vitest";
import { POSES, poseNames, mirrorPose } from "@/three/rig/allPoses";
import { lerpPose } from "@/three/rig/pose";
import { defaultRest, describeViolations, validatePose } from "@/three/rig/limits";

/**
 * CONTRACT (Wave 0): every registered pose, its mirror, and the midpoint of every blend the
 * timelines make between consecutive poses must respect the range-of-motion table in
 * three/rig/limits.ts. This suite fails at the time of writing; the rig agent (section A)
 * makes it pass by refining how joints are measured (pelvic tilt, hinge projection, twist
 * derivation) and by correcting poses that are genuinely impossible.
 */
describe("every pose respects the range-of-motion limits", () => {
  const names = poseNames();
  it("has registered the whole catalogue", () => {
    expect(names.length).toBeGreaterThan(70);
    for (const n of ["stand", "glideBO", "glideFO", "loadBO", "loadFO", "pickBack", "launch", "tuck", "open", "land", "camel", "sit", "upright", "layback", "biellmann", "spiral", "liftUpright", "deathSpiralBo"]) expect(names, n).toContain(n);
  });
  for (const name of names) {
    it(`${name} is within range`, () => {
      const v = validatePose(POSES[name], defaultRest);
      expect(v, describeViolations(v)).toEqual([]);
      const m = validatePose(mirrorPose(POSES[name]), defaultRest);
      expect(m, `mirrored: ${describeViolations(m)}`).toEqual([]);
    });
  }
  // blends the jump, spin and step timelines pass through
  const PAIRS: [string, string][] = [
    ["glideBO", "loadBO"],
    ["loadBO", "pickBack"],
    ["pickBack", "launch"],
    ["launch", "tuck"],
    ["tuck", "open"],
    ["open", "land"],
    ["land", "landDeep"],
    ["glideFO", "loadFO"],
    ["spinEntry", "camel"],
    ["camel", "sit"],
    ["sit", "upright"],
    ["upright", "layback"],
    ["layback", "biellmann"],
    ["glideFO", "spiral"],
  ];
  for (const [a, b] of PAIRS) {
    it(`the blend ${a} → ${b} stays within range`, () => {
      for (const t of [0.25, 0.5, 0.75]) {
        const v = validatePose(lerpPose(POSES[a], POSES[b], t, defaultRest), defaultRest);
        expect(v, `t=${t}: ${describeViolations(v)}`).toEqual([]);
      }
    });
  }
});
