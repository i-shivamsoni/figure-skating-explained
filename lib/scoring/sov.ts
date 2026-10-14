import sovJson from "@/data/sov-2026-27.json";

export interface SovEntry {
  base: number;
  /** Eleven values: index 0 = -5 ... index 5 = base value ... index 10 = +5. */
  goe: number[];
  section: string;
}

export interface SovTable {
  season: string;
  source: string;
  goeSteps: number[];
  programComponentFactors: Record<"men" | "women" | "pairs", { shortProgram: number; freeSkating: number }>;
  elements: Record<string, SovEntry>;
}

export const SOV = sovJson as SovTable;

export function hasCode(code: string): boolean {
  return code in SOV.elements;
}

export function sovEntry(code: string): SovEntry {
  const e = SOV.elements[code];
  if (!e) throw new Error(`Unknown element code in the Scale of Values: ${code}`);
  return e;
}

export function baseValueOf(code: string): number {
  return sovEntry(code).base;
}

/** Numerical value of one GOE grade (-5..+5) for an element code. Grade 0 is worth 0. */
export function goeValueOf(code: string, grade: number): number {
  const g = clampGrade(grade);
  if (g === 0) return 0;
  return sovEntry(code).goe[g + 5];
}

export function clampGrade(grade: number): number {
  return Math.max(-5, Math.min(5, Math.round(grade)));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
