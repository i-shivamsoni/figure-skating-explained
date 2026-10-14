import type { Category, Segment } from "@/data/types";
import { PCS_FACTORS } from "@/data/pcs";
import { round2 } from "./sov";
import { scoreElement, type ScoredElement } from "./value";
import type { ElementSpec } from "./elements";

export interface ProgramElementInput {
  spec: ElementSpec;
  goe: number;
  /** The element started after the midpoint of the program. */
  secondHalf?: boolean;
}

export interface ComponentMarks {
  composition: number;
  presentation: number;
  skatingSkills: number;
}

export interface ProgramInput {
  segment: Segment;
  category: Category;
  elements: ProgramElementInput[];
  components: ComponentMarks;
  falls?: number;
  otherDeductions?: number;
}

export interface ProgramScore {
  elements: ScoredElement[];
  tes: number;
  pcs: { factor: number; factored: ComponentMarks; total: number };
  deductions: { falls: number; other: number; total: number };
  total: number;
}

export function pcsFactor(segment: Segment, category: Category): number {
  const group = category.endsWith("Men") ? "men" : "women";
  return PCS_FACTORS[group][segment];
}

/** Rule 353.1 n): Senior singles escalate; Junior singles are -1.0 per fall. */
export function fallDeduction(category: Category, falls: number): number {
  if (falls <= 0) return 0;
  if (category.startsWith("junior")) return falls;
  let total = 0;
  for (let i = 1; i <= falls; i++) total += i <= 2 ? 1 : i <= 4 ? 2 : 3;
  return total;
}

/** Indices of the jump elements that receive the 1.1 factor: the last one (SP) or last three (FS) started in the second half. */
export function secondHalfIndices(segment: Segment, elements: ProgramElementInput[]): Set<number> {
  const limit = segment === "shortProgram" ? 1 : 3;
  const candidates = elements.map((e, i) => (e.spec.kind === "jump" && e.secondHalf ? i : -1)).filter((i) => i >= 0);
  return new Set(candidates.slice(-limit));
}

export function scoreProgram(input: ProgramInput): ProgramScore {
  const bonus = secondHalfIndices(input.segment, input.elements);
  const elements = input.elements.map((e, i) => scoreElement(e.spec, e.goe, { secondHalf: bonus.has(i) }));
  const tes = round2(elements.reduce((a, e) => a + e.total, 0));
  const factor = pcsFactor(input.segment, input.category);
  const factored: ComponentMarks = {
    composition: round2(input.components.composition * factor),
    presentation: round2(input.components.presentation * factor),
    skatingSkills: round2(input.components.skatingSkills * factor),
  };
  const pcsTotal = round2(factored.composition + factored.presentation + factored.skatingSkills);
  const falls = fallDeduction(input.category, input.falls ?? 0);
  const other = input.otherDeductions ?? 0;
  const deductions = round2(falls + other);
  return {
    elements,
    tes,
    pcs: { factor, factored, total: pcsTotal },
    deductions: { falls, other, total: deductions },
    total: round2(tes + pcsTotal - deductions),
  };
}
