import type { Category, PairCategory, Segment } from "@/data/types";
import { PCS_FACTORS } from "@/data/pcs";
import { round2 } from "./sov";
import { scoreElement, type ScoredElement } from "./value";
import { isJumpElement, type ElementSpec } from "./elements";

/** Singles and pairs categories the engine scores. */
export type ScoringCategory = Category | PairCategory;
export const isPairs = (category: ScoringCategory): category is PairCategory => category.endsWith("Pairs");

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
  category: ScoringCategory;
  elements: ProgramElementInput[];
  components: ComponentMarks;
  /** Falls (singles), or falls by one partner (pairs). */
  falls?: number;
  /** Pairs only: falls by both partners at once. */
  fallsBoth?: number;
  otherDeductions?: number;
}

export interface ProgramScore {
  elements: ScoredElement[];
  tes: number;
  pcs: { factor: number; factored: ComponentMarks; total: number };
  deductions: { falls: number; other: number; total: number };
  total: number;
}

export function pcsFactor(segment: Segment, category: ScoringCategory): number {
  const group = isPairs(category) ? "pairs" : category.endsWith("Men") ? "men" : "women";
  return PCS_FACTORS[group][segment];
}

/**
 * Rule 503: Senior singles escalate (-1, -1, -2, -2, -3…); Junior singles are -1.0 per fall;
 * pairs lose -1.0 for a fall by one partner and -2.0 for a fall by both.
 */
export function fallDeduction(category: ScoringCategory, falls: number, fallsBoth = 0): number {
  if (isPairs(category)) return Math.max(0, falls) + 2 * Math.max(0, fallsBoth);
  if (falls <= 0) return 0;
  if (category.startsWith("junior")) return falls;
  let total = 0;
  for (let i = 1; i <= falls; i++) total += i <= 2 ? 1 : i <= 4 ? 2 : 3;
  return total;
}

/** Indices of the jump elements (throws included) that receive the 1.1 factor: the last one (SP) or last three (FS) started in the second half. */
export function secondHalfIndices(segment: Segment, elements: ProgramElementInput[]): Set<number> {
  const limit = segment === "shortProgram" ? 1 : 3;
  const candidates = elements.map((e, i) => (isJumpElement(e.spec) && e.secondHalf ? i : -1)).filter((i) => i >= 0);
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
  const falls = fallDeduction(input.category, input.falls ?? 0, input.fallsBoth ?? 0);
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
