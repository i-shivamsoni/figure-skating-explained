import type { JumpId } from "@/data/types";

export type RotationCall = "" | "q" | "<" | "<<";
export type EdgeCall = "" | "!" | "e";
export type Level = "B" | 1 | 2 | 3 | 4;

export interface JumpSpec {
  jump: JumpId;
  rotations: number;
  rotationCall?: RotationCall;
  edgeCall?: EdgeCall;
  /** Marked * by the technical panel: no value, still shown in the code. */
  noValue?: boolean;
}

export interface JumpElementSpec {
  kind: "jump";
  jumps: JumpSpec[];
  /** +SEQ at the end (jump sequence). */
  sequence?: boolean;
  /** "+COMBO" or "+SEQ" inserted after the jump at this index (missing second jump, or jumps deleted after a fall). */
  marker?: { type: "COMBO" | "SEQ"; afterIndex: number };
  /** +REP: 80% of the base value. */
  rep?: boolean;
}

export interface SpinElementSpec {
  kind: "spin";
  /** Family code such as "CCoSp", "FCSp", "LSp". */
  family: string;
  level: Level;
  v?: boolean;
  noValue?: boolean;
}

export interface StepElementSpec {
  kind: "step";
  level: Level;
  noValue?: boolean;
}

export interface ChoreoElementSpec {
  kind: "choreoSequence" | "choreoSpin";
  noValue?: boolean;
}

export type ElementSpec = JumpElementSpec | SpinElementSpec | StepElementSpec | ChoreoElementSpec;

const EDGE_SIGN_JUMPS: JumpId[] = ["F", "Lz"];

export function isListedJump(id: JumpId): boolean {
  return id !== "Eu";
}

/** The Scale of Values code for a single jump (the Euler is "Eu", shown as "1Eu" in protocols). */
export function jumpSovCode(j: JumpSpec): string {
  if (j.jump === "Eu") return "Eu";
  const edge = EDGE_SIGN_JUMPS.includes(j.jump) ? j.edgeCall ?? "" : "";
  return `${j.rotations}${j.jump}${edge}${j.rotationCall ?? ""}`;
}

export function jumpDisplayCode(j: JumpSpec): string {
  const base = j.jump === "Eu" ? "1Eu" : jumpSovCode(j);
  return base + (j.noValue ? "*" : "");
}

export function elementCode(e: ElementSpec): string {
  switch (e.kind) {
    case "jump": {
      const parts: string[] = [];
      e.jumps.forEach((j, i) => {
        parts.push(jumpDisplayCode(j));
        if (e.marker && e.marker.afterIndex === i) parts.push(e.marker.type);
      });
      if (e.sequence && !(e.marker && e.marker.type === "SEQ")) parts.push("SEQ");
      if (e.rep) parts.push("REP");
      return parts.join("+");
    }
    case "spin":
      return `${e.family}${e.level}${e.v ? "V" : ""}${e.noValue ? "*" : ""}`;
    case "step":
      return `StSq${e.level}${e.noValue ? "*" : ""}`;
    case "choreoSequence":
      return `ChSq1${e.noValue ? "*" : ""}`;
    case "choreoSpin":
      return `ChSp1${e.noValue ? "*" : ""}`;
  }
}

/** Jumps that count for value and for the repetition rules (not marked *). */
export function countedJumps(e: JumpElementSpec): JumpSpec[] {
  return e.jumps.filter((j) => !j.noValue);
}

/** Listed jumps that count toward the "up to two / three jumps" limits (Euler excluded). */
export function listedCountedJumps(e: JumpElementSpec): JumpSpec[] {
  return countedJumps(e).filter((j) => isListedJump(j.jump));
}

export function isAxelType(j: JumpSpec): boolean {
  return j.jump === "A";
}
