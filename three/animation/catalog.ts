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
import { PAIR_ELEMENT_BY_ID } from "@/data/pairs";
import { CHOREO_SPIN } from "@/data/choreo";
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

/** What the rink shows after an element: where to read about it and where its value is explained. */
export interface LearnLink {
  /** Broadcast-style name, as in the caption. */
  title: string;
  /** The noun phrase after "About": "the Lutz", "the camel spin", "lifts". */
  about: string;
  href: string;
  code?: string;
  value?: number;
  blurb: string;
  /** Where the number is explained; undefined when the element is not scored on its own. */
  scoringHref?: string;
}

const PAIR_FAMILY: Record<PairId, keyof typeof PAIR_ELEMENT_BY_ID> = {
  "3Li": "lift",
  "4Li": "lift",
  "5RLi": "lift",
  "3Tw": "twist",
  "3LzTh": "throw",
  FiDs: "deathSpiral",
  BoDs: "deathSpiral",
  PCoSp: "pairSpinCombination",
  "3T+3T": "soloJump",
};

const sentence = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}${/[.!?]$/.test(s) ? "" : "."}`;

export function learnFor(spec: ViewerSpec): LearnLink {
  const { caption, value } = captionFor(spec);
  const scoringHref = value !== undefined ? "/scoring#base-value" : undefined;
  switch (spec.kind) {
    case "jump": {
      const jump = JUMP_BY_SLUG[spec.slug] ?? JUMP_BY_SLUG.lutz;
      const code = jump.id === "Eu" ? "1Eu" : `${spec.rotations}${jump.id}${spec.edge ?? ""}${spec.call ?? ""}`;
      return { title: caption, about: `the ${jump.name}`, href: `/jumps/${jump.slug}`, code, value, blurb: jump.summary, scoringHref };
    }
    case "spin": {
      const fam = SPIN_FAMILIES.find((f) => f.code === spec.code);
      if (fam) {
        const code = spec.features ? spinCode(spec.code, spec.features) : `${spec.code}4`;
        return { title: caption, about: `the ${fam.name.toLowerCase()}`, href: `/spins/${fam.code}`, code, value, blurb: fam.description, scoringHref };
      }
      if (spec.code === "ChSp") return { title: caption, about: "the choreographic spin", href: "/choreo", code: "ChSp1", value, blurb: CHOREO_SPIN.summary, scoringHref };
      return { title: caption, about: "spins", href: "/spins", value, blurb: `${SPIN_PRESETS[spec.code]?.title ?? spec.code}: one continuous spin that shows several positions.`, scoringHref };
    }
    case "turn": {
      const t = TURN_SPECS[spec.id] ?? TURN_SPECS["three-turn"];
      return {
        title: caption,
        about: `the ${t.label.toLowerCase()}`,
        href: `/steps?turn=${spec.id}`,
        blurb: `${sentence(t.detail)} ${t.difficult ? "One of the six difficult turns and steps that raise a step sequence's level." : "Not one of the difficult turns, but part of every step sequence."}`,
        scoringHref: "/steps#levels",
      };
    }
    case "choreo": {
      const m = CHOREO[spec.id] ?? CHOREO.spiral;
      return { title: caption, about: `the ${m.label.toLowerCase()}`, href: `/choreo?move=${spec.id}`, blurb: `${sentence(m.detail)} Movements like this make up a choreographic sequence, a fixed-value element scored by the judges alone.` };
    }
    case "special": {
      const sp = SPECIALS[spec.id] ?? SPECIALS.walley;
      return { title: caption, about: `the ${sp.label.toLowerCase()}`, href: `/jumps?special=${spec.id}#not-listed`, blurb: sentence(sp.detail) };
    }
    case "pair": {
      const preset = PAIR_PRESETS[spec.id] ?? PAIR_PRESETS["3Tw"];
      const fam = PAIR_ELEMENT_BY_ID[PAIR_FAMILY[preset.id as PairId] ?? "lift"];
      return { title: caption, about: fam.name.toLowerCase(), href: `/pairs/${fam.id}`, code: preset.codes.join(" + "), value, blurb: fam.definition, scoringHref };
    }
  }
}
