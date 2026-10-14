import { goeValueOf, round2 } from "./sov";

/** Rule 353.1 d): drop the highest and lowest values when there are at least five judges, then average. */
export function trimmedMean(values: number[]): number {
  if (values.length === 0) return 0;
  let v = [...values];
  if (v.length >= 5) {
    v.sort((a, b) => a - b);
    v = v.slice(1, -1);
  }
  return round2(v.reduce((a, b) => a + b, 0) / v.length);
}

/** Panel GOE for one element from each judge's grade: the trimmed mean of the numerical GOE values. */
export function panelGoeValue(code: string, grades: number[]): number {
  return trimmedMean(grades.map((g) => goeValueOf(code, g)));
}
