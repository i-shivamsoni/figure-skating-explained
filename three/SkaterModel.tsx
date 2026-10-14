"use client";

import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, type Ref } from "react";
import { Group, Material, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { SkaterRig } from "./rig/rig";
import type { Pose } from "./rig/pose";
import { skaterUrl, useSkaterStore, type SkaterVariant } from "./skaterStore";
import { appearanceSignature, applyAppearance, type Wardrobe } from "./appearance";

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

/**
 * Gives every mesh of a cloned model its own copy of its materials (the loader shares them between
 * clones) and indexes them and the named nodes, so each instance can be dressed on its own.
 */
function buildWardrobe(root: Group): Wardrobe {
  const materials = new Map<string, MeshStandardMaterial["color"][]>();
  const nodes = new Map<string, Object3D>();
  const cloned = new Map<Material, Material>();
  root.traverse((o) => {
    if (o.name) nodes.set(o.name, o);
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const own = (m: Material) => {
      let c = cloned.get(m);
      if (!c) {
        c = m.clone();
        cloned.set(m, c);
        if ((c as MeshStandardMaterial).isMeshStandardMaterial) {
          const std = c as MeshStandardMaterial;
          const list = materials.get(std.name) ?? [];
          list.push(std.color);
          materials.set(std.name, list);
        }
      }
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
  });
  return { materials, nodes };
}

/** The rigged skater. Faces +Z with its blades on y = 0. */
export function SkaterModel({ pose, variant, ref, onReady }: SkaterModelProps) {
  const global = useSkaterStore((s) => s.variant);
  const chosen = variant ?? global;
  const appearance = useSkaterStore((s) => s.appearance[chosen]);
  const url = skaterUrl(chosen);
  const gltf = useGLTF(url);
  const { group, rig, wardrobe } = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene) as Group;
    clone.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
        o.frustumCulled = false;
      }
    });
    return { group: clone, rig: new SkaterRig(clone), wardrobe: buildWardrobe(clone) };
  }, [gltf.scene]);
  // before the first paint: the GLB carries every hair style and both skirts, and only the chosen ones may show
  useLayoutEffect(() => {
    applyAppearance(wardrobe, appearance, chosen);
    if (!variant && typeof document !== "undefined") document.body.dataset.appearance = appearanceSignature(appearance);
  }, [wardrobe, chosen, appearance, variant]);
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
