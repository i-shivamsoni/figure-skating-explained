import { POSES } from "./poses";
import type { Pose } from "./pose";

/**
 * Poses owned by the Wave 2 jumps agent (entries, edge calls, take-offs). Registered into POSES on
 * import; three/rig/allPoses.ts imports this file so the pose lab and tests/poses.test.ts see them.
 * Timelines that use them must import this module (for its side effect) or JUMP_POSES directly.
 */
export const JUMP_POSES: Record<string, Pose> = {};

Object.assign(POSES, JUMP_POSES);
