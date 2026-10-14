import { JUMP_BY_ID, JUMP_BY_SLUG } from "@/data/jumps";
import type { JumpId } from "@/data/types";
import type { ElementSpec } from "@/lib/scoring/elements";
import { jumpTimeline, type EdgeCallParam, type RotationCall } from "./jumps";
import { spinPreset, SPIN_PRESETS, spinCode, spinFromSpec, spinTimeline, type SpinFeatures, type SpinLevel } from "./spins";
import { choreoTimeline, CHOREO, turnTimeline, TURN_SPECS, type ChoreoId, type TurnId } from "./steps";
import { specialTimeline, SPECIALS, type SpecialId } from "./special";
import { pairTimeline, PAIR_PRESETS, type PairId } from "./pairs";
import type { Timeline } from "./timeline";
import { ROTATION_NAMES } from "@/data/jumps";
import { SPIN_FAMILIES } from "@/data/spins";
import { hasCode, baseValueOf } from "@/lib/scoring/sov";

/** Serialisable description of what to animate, safe to pass from server components. */
export type ViewerSpec =
  | { kind: "jump"; slug: string; rotations: number; call?: RotationCall; edge?: EdgeCallParam }
  /** A preset by code, or any Scale of Values family built with the chosen level features (the spin explorer). */
  | { kind: "spin"; code: string; features?: SpinFeatures }
  | { kind: "turn"; id: TurnId }
  | { kind: "choreo"; id: ChoreoId }
  | { kind: "special"; id: SpecialId }
  | { kind: "pair"; id: PairId };

export function buildTimeline(spec: ViewerSpec): Timeline {
  switch (spec.kind) {
    case "jump": {
      const jump = JUMP_BY_SLUG[spec.slug] ?? JUMP_BY_SLUG.lutz;
      const rotations = jump.rotations.includes(spec.rotations) ? spec.rotations : jump.rotations[jump.rotations.length - 1];
      return jumpTimeline({ jump, rotations, call: spec.call, edgeCall: spec.edge });
    }
    case "spin":
      if (spec.features) return spinTimeline(spinFromSpec(spec.code, spec.features));
      return spinPreset(spec.code in SPIN_PRESETS ? spec.code : "CSp");
    case "turn":
      return turnTimeline(spec.id in TURN_SPECS ? spec.id : "three-turn");
    case "choreo":
      return choreoTimeline(spec.id in CHOREO ? spec.id : "spiral");
    case "special":
      return specialTimeline(spec.id in SPECIALS ? spec.id : "walley");
    case "pair":
      return pairTimeline(spec.id in PAIR_PRESETS ? spec.id : "3Tw");
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
      const code = jump.id === "Eu" ? "Eu" : `${spec.rotations}${jump.id}${spec.edge ?? ""}${spec.call ?? ""}`;
      const name = jump.id === "Eu" ? "Euler" : `${ROTATION_NAMES[spec.rotations] ?? ""} ${jump.name}`;
      const marks = [spec.edge === "e" ? "wrong edge" : spec.edge === "!" ? "unclear edge" : "", spec.call].filter(Boolean).join(", ");
      return { caption: `${name}${marks ? ` (${marks})` : ""}`, value: hasCode(code) ? baseValueOf(code) : undefined };
    }
    case "spin": {
      const fam = SPIN_FAMILIES.find((f) => f.code === spec.code);
      const code = spec.features ? spinCode(spec.code, spec.features) : `${spec.code}4`;
      const level = spec.features?.level ?? 4;
      const caption = fam ? `${fam.name} (Level ${level}${spec.features?.v ? ", reduced value" : ""})` : SPIN_PRESETS[spec.code]?.title ?? spec.code;
      return { caption, value: fam && hasCode(code) ? baseValueOf(code) : undefined };
    }
    case "turn":
      return { caption: TURN_SPECS[spec.id]?.label ?? spec.id };
    case "choreo":
      return { caption: CHOREO[spec.id]?.label ?? spec.id };
    case "special":
      return { caption: `${SPECIALS[spec.id]?.label ?? spec.id} · no value` };
    case "pair": {
      const preset = PAIR_PRESETS[spec.id] ?? PAIR_PRESETS["3Tw"];
      const value = preset.codes.every(hasCode) ? preset.codes.reduce((sum, code) => sum + baseValueOf(code), 0) : undefined;
      return { caption: preset.title, value };
    }
  }
}

/** The scored element(s) a viewer spec stands for; turns, field moves and non-listed jumps have none. */
export function toElementSpecs(spec: ViewerSpec): ElementSpec[] {
  switch (spec.kind) {
    case "jump": {
      const jump = JUMP_BY_SLUG[spec.slug];
      if (!jump) return [];
      const edgeJump = jump.id === "F" || jump.id === "Lz";
      return [{ kind: "jump", jumps: [{ jump: jump.id, rotations: jump.id === "Eu" ? 1 : spec.rotations, rotationCall: spec.call ?? "", edgeCall: edgeJump ? (spec.edge ?? "") : "" }] }];
    }
    case "spin":
      if (!SPIN_FAMILIES.some((f) => f.code === spec.code)) return [];
      return [{ kind: "spin", family: spec.code, level: spec.features?.level ?? 4, v: spec.features?.v }];
    case "pair":
      return (PAIR_PRESETS[spec.id]?.codes ?? []).map((code) => ({ kind: "code", code }));
    default:
      return [];
  }
}

const JUMP_CODE = /^([1-5])(T|S|Lo|F|Lz|A|Eu)(!|e)?(q|<<|<)?$/;
const SPIN_CODE = /^(F?C?(?:U|L|C|S|Co)Sp)(B|[1-4])?(V)?$/;

/** A viewer spec from a protocol-style code or an element id, for deep links such as /rink?perform=4Lz,CCoSp4,twizzle. */
export function specFromCode(raw: string): ViewerSpec | undefined {
  const code = raw.trim();
  const j = JUMP_CODE.exec(code);
  if (j) {
    const jump = JUMP_BY_ID[j[2] as JumpId];
    const edgeJump = jump.id === "F" || jump.id === "Lz";
    return { kind: "jump", slug: jump.slug, rotations: Number(j[1]), call: (j[4] ?? "") as RotationCall, edge: edgeJump ? ((j[3] ?? "") as EdgeCallParam) : undefined };
  }
  const s = SPIN_CODE.exec(code);
  if (s && SPIN_FAMILIES.some((f) => f.code === s[1])) {
    const level: SpinLevel = s[2] ? (s[2] === "B" ? "B" : (Number(s[2]) as SpinLevel)) : 4;
    return { kind: "spin", code: s[1], features: { level, v: s[3] === "V" } };
  }
  if (code in SPIN_PRESETS) return { kind: "spin", code };
  if (code in TURN_SPECS) return { kind: "turn", id: code as TurnId };
  if (code in CHOREO) return { kind: "choreo", id: code as ChoreoId };
  if (code in SPECIALS) return { kind: "special", id: code as SpecialId };
  if (code in PAIR_PRESETS) return { kind: "pair", id: code as PairId };
  return undefined;
}
