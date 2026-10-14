"use client";

import { useEffect, useImperativeHandle, useMemo, type Ref } from "react";
import { Group } from "three";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { SkaterRig } from "./rig/rig";
import type { Pose } from "./rig/pose";

export const SKATER_URL = "/models/skater.glb";

export interface SkaterHandle {
  rig: SkaterRig;
  group: Group;
}

export interface SkaterModelProps {
  /** Applied once when it changes; for per-frame animation use the handle's rig directly. */
  pose?: Pose;
  ref?: Ref<SkaterHandle>;
  onReady?: (h: SkaterHandle) => void;
}

/** The rigged skater. Faces +Z with its blades on y = 0. */
export function SkaterModel({ pose, ref, onReady }: SkaterModelProps) {
  const gltf = useGLTF(SKATER_URL);
  const { group, rig } = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene) as Group;
    clone.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
        o.frustumCulled = false;
      }
    });
    return { group: clone, rig: new SkaterRig(clone) };
  }, [gltf.scene]);
  const handle = useMemo(() => ({ rig, group }), [rig, group]);
  useImperativeHandle(ref, () => handle, [handle]);
  useEffect(() => {
    onReady?.(handle);
  }, [handle, onReady]);
  useEffect(() => {
    if (pose) rig.applyPose(pose);
  }, [pose, rig]);
  return <primitive object={group} />;
}

useGLTF.preload(SKATER_URL);
