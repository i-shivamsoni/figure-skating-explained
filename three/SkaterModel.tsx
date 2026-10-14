"use client";

import { useEffect, useImperativeHandle, useMemo, type Ref } from "react";
import { Group } from "three";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { SkaterRig } from "./rig/rig";
import type { Pose } from "./rig/pose";
import { skaterUrl, useSkaterStore, type SkaterVariant } from "./skaterStore";

export interface SkaterHandle {
  rig: SkaterRig;
  group: Group;
}

export interface SkaterModelProps {
  /** Applied once when it changes; for per-frame animation use the handle's rig directly. */
  pose?: Pose;
  /** Overrides the site-wide choice. */
  variant?: SkaterVariant;
  ref?: Ref<SkaterHandle>;
  onReady?: (h: SkaterHandle) => void;
}

/** The rigged skater. Faces +Z with its blades on y = 0. */
export function SkaterModel({ pose, variant, ref, onReady }: SkaterModelProps) {
  const global = useSkaterStore((s) => s.variant);
  const url = skaterUrl(variant ?? global);
  const gltf = useGLTF(url);
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

useGLTF.preload(skaterUrl("female"));
