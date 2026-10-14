import { POSES } from "./poses";
import type { Pose } from "./pose";

/**
 * Poses owned by the Wave 2 spins agent (corrected and new spin positions, variations, entries).
 * Registered into POSES on import; three/rig/allPoses.ts imports this file so the pose lab and
 * tests/poses.test.ts see them. Timelines that use them must import this module or SPIN_POSES.
 */
export const SPIN_POSES: Record<string, Pose> = {};

Object.assign(POSES, SPIN_POSES);
