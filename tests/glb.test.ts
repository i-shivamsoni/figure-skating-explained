import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BONES } from "@/three/rig/bones";
import { DEFAULT_APPEARANCES, GLB_MATERIALS, variantNodes, type SkaterVariant } from "@/three/skaterStore";
import { visibleNodes } from "@/three/appearance";

interface GltfJson {
  materials?: { name?: string }[];
  nodes?: { name?: string; mesh?: number; extras?: Record<string, unknown> }[];
  meshes?: { name?: string }[];
}

/** The JSON chunk of a binary glTF. */
function readGlb(path: string): GltfJson {
  const buf = readFileSync(path);
  expect(buf.readUInt32LE(0)).toBe(0x46546c67); // "glTF"
  const length = buf.readUInt32LE(12);
  expect(buf.readUInt32LE(16)).toBe(0x4e4f534a); // "JSON"
  return JSON.parse(buf.subarray(20, 20 + length).toString("utf8")) as GltfJson;
}

const VARIANTS: SkaterVariant[] = ["female", "male"];
const MAX_BYTES = 2.6 * 1024 * 1024;

describe.each(VARIANTS)("public/models/skater-%s.glb", (variant) => {
  const path = `public/models/skater-${variant}.glb`;
  const gltf = readGlb(path);
  const materials = new Set((gltf.materials ?? []).map((m) => m.name));
  const nodes = new Set((gltf.nodes ?? []).map((n) => n.name));

  it("carries every recolourable material of the contract", () => {
    for (const m of GLB_MATERIALS) {
      if (m === "skirt" && variant === "male") continue;
      expect(materials.has(m), m).toBe(true);
    }
  });

  it("carries every hair style, length and skirt as a named node", () => {
    for (const n of variantNodes(variant)) expect(nodes.has(n), n).toBe(true);
  });

  it("keeps the rig's bone names", () => {
    for (const b of BONES) expect(nodes.has(b), b).toBe(true);
  });

  it("stays small enough to ship", () => {
    expect(statSync(path).size).toBeLessThan(MAX_BYTES);
  });

  it("is built with the default look's variants in place", () => {
    for (const n of visibleNodes(DEFAULT_APPEARANCES[variant])) expect(nodes.has(n), n).toBe(true);
  });
});
