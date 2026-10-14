import { JUMP_BY_SLUG } from "@/data/jumps";
import { jumpTimeline, type RotationCall } from "./jumps";
import { spinPreset, SPIN_PRESETS } from "./spins";
import { choreoTimeline, turnTimeline, TURN_SPECS, type ChoreoId, type TurnId } from "./steps";
import type { Timeline } from "./timeline";
import { ROTATION_NAMES } from "@/data/jumps";
import { SPIN_FAMILIES } from "@/data/spins";
import { hasCode, baseValueOf } from "@/lib/scoring/sov";

/** Serialisable description of what to animate, safe to pass from server components. */
export type ViewerSpec =
  | { kind: "jump"; slug: string; rotations: number; call?: RotationCall }
  | { kind: "spin"; code: string }
  | { kind: "turn"; id: TurnId }
  | { kind: "choreo"; id: ChoreoId };

export function buildTimeline(spec: ViewerSpec): Timeline {
  switch (spec.kind) {
    case "jump": {
      const jump = JUMP_BY_SLUG[spec.slug] ?? JUMP_BY_SLUG.lutz;
      const rotations = jump.rotations.includes(spec.rotations) ? spec.rotations : jump.rotations[jump.rotations.length - 1];
      return jumpTimeline({ jump, rotations, call: spec.call });
    }
    case "spin":
      return spinPreset(spec.code in SPIN_PRESETS ? spec.code : "CSp");
    case "turn":
      return turnTimeline(spec.id in TURN_SPECS ? spec.id : "three-turn");
    case "choreo":
      return choreoTimeline(spec.id);
  }
}

/** Which spin preset best illustrates a Scale of Values family code. */
export function spinPresetFor(family: string): string {
  if (family in SPIN_PRESETS) return family;
  const map: Record<string, string> = {
    FUSp: "USp", FLSp: "LSp", CUSp: "USp", CLSp: "LSp", FCUSp: "USp", FCLSp: "LSp", FCCSp: "CCSp", FCSSp: "CSSp", CoSp: "CCoSp", FCoSp: "CCoSp", FCCoSp: "CCoSp",
  };
  return map[family] ?? "CSp";
}

/** Broadcast-style caption and the base value to pop up when the element completes. */
export function captionFor(spec: ViewerSpec): { caption: string; value?: number } {
  switch (spec.kind) {
    case "jump": {
      const jump = JUMP_BY_SLUG[spec.slug] ?? JUMP_BY_SLUG.lutz;
      const code = jump.id === "Eu" ? "Eu" : `${spec.rotations}${jump.id}${spec.call ?? ""}`;
      const name = jump.id === "Eu" ? "Euler" : `${ROTATION_NAMES[spec.rotations] ?? ""} ${jump.name}`;
      return { caption: `${name}${spec.call ? ` (${spec.call})` : ""}`, value: hasCode(code) ? baseValueOf(code) : undefined };
    }
    case "spin": {
      const fam = SPIN_FAMILIES.find((f) => f.code === spec.code);
      const code = `${spec.code}4`;
      return { caption: fam ? `${fam.name} (Level 4)` : SPIN_PRESETS[spec.code]?.title ?? spec.code, value: fam && hasCode(code) ? baseValueOf(code) : undefined };
    }
    case "turn":
      return { caption: TURN_SPECS[spec.id]?.label ?? spec.id };
    case "choreo":
      return { caption: spec.id.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
  }
}
