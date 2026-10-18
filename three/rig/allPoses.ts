/**
 * Barrel that loads every pose module for its side effects (each registers into POSES) and
 * re-exports the registry. Import POSES from here when you need every pose (pose lab, the
 * all-poses test); animation modules may keep importing from "./poses" plus the file they use.
 * New pose files (three/rig/poses-jumps.ts, poses-spins.ts, poses-stroking.ts, …) must be added to the imports below.
 */
import "./poses";
import "./poses-jumps";
import "./poses-spins";
import "./poses-stroking";

export { POSES, poseNames, mirrorPose } from "./poses";
