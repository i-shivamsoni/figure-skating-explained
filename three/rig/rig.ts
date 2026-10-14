import { Bone, Object3D, Quaternion, Vector3 } from "three";
import { BONES, POSABLE, TAIL_CHILD, type BoneName } from "./bones";
import { resolvePose, type PosableBone } from "./limits";
import type { Pose, Vec3 } from "./pose";

interface RestInfo {
  localQ: Quaternion;
  worldQ: Quaternion;
  worldPos: Vector3;
  dir: Vector3; // rest direction in skater space
  localPos: Vector3;
}

const _q = new Quaternion();
const _qAim = new Quaternion();
const _qTwist = new Quaternion();
const _v = new Vector3();
const _v2 = new Vector3();

/**
 * Wraps the loaded skeleton. Captures the bind pose on construction (bones must still be
 * at rest) and applies direction-based poses in skater space (see pose.ts).
 */
export class SkaterRig {
  readonly bones = new Map<BoneName, Bone>();
  private rest = new Map<BoneName, RestInfo>();
  private worldQ = new Map<BoneName, Quaternion>();
  readonly hipsRest = new Vector3();
  /** Turns a skater-space hips offset into the hips bone's local frame. */
  private readonly hipsOffsetQ = new Quaternion();
  /** Midpoint of the hip sockets relative to the hips bone's head, skater space (the pivot of a derived pelvic tilt). */
  private readonly socketMid = new Vector3();
  readonly restDirFn = (b: BoneName): Vec3 => this.restDir(b);
  readonly height: number;

  constructor(root: Object3D) {
    root.traverse((o) => {
      if ((o as Bone).isBone && (BONES as readonly string[]).includes(o.name)) this.bones.set(o.name as BoneName, o as Bone);
    });
    for (const name of BONES) if (!this.bones.has(name)) throw new Error(`Skater model is missing bone ${name}`);
    // rest world transforms relative to the root bone's parent
    const order = this.hierarchyOrder();
    for (const name of order) {
      const b = this.bones.get(name)!;
      const parent = b.parent && (b.parent as Bone).isBone ? this.rest.get(b.parent.name as BoneName) : undefined;
      const localQ = b.quaternion.clone();
      const worldQ = parent ? parent.worldQ.clone().multiply(localQ) : localQ.clone();
      const worldPos = parent ? parent.worldPos.clone().add(b.position.clone().applyQuaternion(parent.worldQ)) : b.position.clone();
      this.rest.set(name, { localQ, worldQ, worldPos, dir: new Vector3(0, 1, 0), localPos: b.position.clone() });
    }
    for (const name of order) {
      const info = this.rest.get(name)!;
      const tail = TAIL_CHILD[name];
      if (tail) info.dir.copy(this.rest.get(tail)!.worldPos).sub(info.worldPos).normalize();
      this.worldQ.set(name, info.worldQ.clone());
    }
    this.hipsRest.copy(this.rest.get("hips")!.localPos);
    // the hips translate in their parent's frame, which the exported root bone rotates (Blender Z-up); pose offsets are given in skater space
    const hipsParent = this.bones.get("hips")!.parent;
    const parentRest = hipsParent && (hipsParent as Bone).isBone ? this.rest.get(hipsParent.name as BoneName) : undefined;
    if (parentRest) this.hipsOffsetQ.copy(parentRest.worldQ).invert();
    this.socketMid.copy(this.rest.get("thigh_L")!.worldPos).add(this.rest.get("thigh_R")!.worldPos).multiplyScalar(0.5).sub(this.rest.get("hips")!.worldPos);
    this.height = this.rest.get("head_tip")!.worldPos.y - this.rest.get("foot_L_tip")!.worldPos.y + 0.04;
  }

  private hierarchyOrder(): BoneName[] {
    const out: BoneName[] = [];
    const visit = (name: BoneName) => {
      out.push(name);
      const b = this.bones.get(name)!;
      for (const c of b.children) if ((c as Bone).isBone && this.bones.has(c.name as BoneName)) visit(c.name as BoneName);
    };
    visit("root");
    return out;
  }

  restDir(name: BoneName): Vec3 {
    const d = this.rest.get(name)!.dir;
    return [d.x, d.y, d.z];
  }

  restWorldPosition(name: BoneName): Vector3 {
    return this.rest.get(name)!.worldPos.clone();
  }

  /** Reset every bone to the bind pose. */
  reset() {
    for (const [name, b] of this.bones) {
      const r = this.rest.get(name)!;
      b.quaternion.copy(r.localQ);
      b.position.copy(r.localPos);
      this.worldQ.get(name)!.copy(r.worldQ);
    }
  }

  /**
   * Applies a pose after resolving it (three/rig/limits.ts): derived twists, hinge projection
   * and pelvic tilt, so the rig renders exactly what `validatePose` measures. A pelvic tilt the
   * pose did not author pivots about the hip sockets, not the hips bone's head, so the standing
   * foot stays on the ice.
   */
  applyPose(pose: Pose) {
    const resolved = resolvePose(pose, this.restDirFn);
    const hips = this.bones.get("hips")!;
    const off = resolved.hips;
    _v.set(off[0], off[1], off[2]);
    if (!pose.bones.hips) {
      const aim = resolved.bones.hips;
      _v2.set(aim.dir[0], aim.dir[1], aim.dir[2]).normalize();
      _qAim.setFromUnitVectors(this.rest.get("hips")!.dir, _v2);
      if (aim.twist) _qAim.premultiply(_qTwist.setFromAxisAngle(_v2, aim.twist));
      _v2.copy(this.socketMid).applyQuaternion(_qAim);
      _v.add(this.socketMid).sub(_v2);
    }
    _v.applyQuaternion(this.hipsOffsetQ);
    hips.position.set(this.hipsRest.x + _v.x, this.hipsRest.y + _v.y, this.hipsRest.z + _v.z);
    for (const name of this.hierarchyOrder()) {
      const b = this.bones.get(name)!;
      const r = this.rest.get(name)!;
      const parentName = b.parent && (b.parent as Bone).isBone ? (b.parent.name as BoneName) : undefined;
      const parentQ = parentName ? this.worldQ.get(parentName)! : null;
      const aimSpec = POSABLE.includes(name) ? resolved.bones[name as PosableBone] : undefined;
      const wq = this.worldQ.get(name)!;
      if (aimSpec) {
        _v.set(aimSpec.dir[0], aimSpec.dir[1], aimSpec.dir[2]).normalize();
        _qAim.setFromUnitVectors(r.dir, _v);
        wq.copy(_qAim).multiply(r.worldQ);
        if (aimSpec.twist) {
          _qTwist.setFromAxisAngle(_v, aimSpec.twist);
          wq.premultiply(_qTwist);
        }
        if (parentQ) b.quaternion.copy(_q.copy(parentQ).invert().multiply(wq));
        else b.quaternion.copy(wq);
      } else {
        b.quaternion.copy(r.localQ);
        if (parentQ) wq.copy(parentQ).multiply(r.localQ);
        else wq.copy(r.localQ);
      }
    }
  }

  /** Current world-space (skater space) direction of a bone, for debugging and tests. */
  currentDir(name: BoneName): Vector3 {
    const r = this.rest.get(name)!;
    return r.dir.clone().applyQuaternion(_q.copy(this.worldQ.get(name)!).multiply(r.worldQ.clone().invert()));
  }
}
