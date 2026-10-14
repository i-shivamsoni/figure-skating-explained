import { JUMP_BY_SLUG } from "@/data/jumps";
import { jumpTimeline, type RotationCall } from "./jumps";
import { spinPreset, SPIN_PRESETS } from "./spins";
import { choreoTimeline, turnTimeline, TURN_SPECS, type ChoreoId, type TurnId } from "./steps";
import type { Timeline } from "./timeline";

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
