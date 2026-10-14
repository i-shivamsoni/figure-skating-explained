"use client";

import { useEffect, useImperativeHandle, useMemo, type Ref } from "react";
import { Color, Group, Material, Mesh, MeshStandardMaterial } from "three";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { SkaterRig } from "./rig/rig";
import type { Pose } from "./rig/pose";
import { costumeFor, skaterUrl, useSkaterStore, type CostumeChoice, type SkaterVariant } from "./skaterStore";

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

/** A model instance's materials by GLB material name, with the colours they were built with. */
interface Wardrobe {
  byName: Map<string, MeshStandardMaterial[]>;
  built: Map<MeshStandardMaterial, Color>;
}

/**
 * Gives every mesh of a cloned model its own copy of its materials (the loader shares them between
 * clones) and indexes them by name, so each instance can be recoloured on its own.
 */
function cloneMaterials(root: Group): Wardrobe {
  const byName = new Map<string, MeshStandardMaterial[]>();
  const built = new Map<MeshStandardMaterial, Color>();
  const cloned = new Map<Material, Material>();
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const own = (m: Material) => {
      let c = cloned.get(m);
      if (!c) {
        c = m.clone();
        cloned.set(m, c);
        if ((c as MeshStandardMaterial).isMeshStandardMaterial) {
          const std = c as MeshStandardMaterial;
          built.set(std, std.color.clone());
          const list = byName.get(std.name) ?? [];
          list.push(std);
          byName.set(std.name, list);
        }
      }
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
  });
  return { byName, built };
}

/** Recolours the costume materials by name; materials the preset leaves out go back to the GLB colour. */
export function applyCostume(wardrobe: Wardrobe, costume: CostumeChoice) {
  for (const [name, mats] of wardrobe.byName) {
    const hex = costume.colours[name as keyof CostumeChoice["colours"]];
    for (const m of mats) {
      if (hex) m.color.set(hex);
      else m.color.copy(wardrobe.built.get(m)!);
    }
  }
}

/** The rigged skater. Faces +Z with its blades on y = 0. */
export function SkaterModel({ pose, variant, ref, onReady }: SkaterModelProps) {
  const global = useSkaterStore((s) => s.variant);
  const chosen = variant ?? global;
  const costumeId = useSkaterStore((s) => s.costume[chosen]);
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
    return { group: clone, rig: new SkaterRig(clone), wardrobe: cloneMaterials(clone) };
  }, [gltf.scene]);
  useEffect(() => {
    applyCostume(wardrobe, costumeFor(chosen, costumeId));
  }, [wardrobe, chosen, costumeId]);
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
