import { baseValueOf, goeValueOf, hasCode, round2 } from "./sov";
import { countedJumps, elementCode, jumpSovCode, type ElementSpec, type JumpElementSpec } from "./elements";

export interface ScoredElement {
  code: string;
  kind: ElementSpec["kind"];
  /** Sum of the base values of the called codes before any factor. */
  baseValue: number;
  /** After +REP (80%) and the second-half factor (1.1), rounded to two decimals. */
  factoredBase: number;
  rep: boolean;
  secondHalf: boolean;
  goeGrade: number;
  goeValue: number;
  total: number;
  /** For jump elements: the code whose GOE values are used (highest base value). */
  goeSourceCode: string;
  info: string[];
}

export interface ScoreOptions {
  secondHalf?: boolean;
}

export const REP_FACTOR = 0.8;
export const SECOND_HALF_FACTOR = 1.1;

export function scoreJumpElement(e: JumpElementSpec, goeGrade: number, opts: ScoreOptions = {}): ScoredElement {
  const info: string[] = [];
  const counted = countedJumps(e);
  const codes = counted.map(jumpSovCode);
  for (const c of codes) if (!hasCode(c)) throw new Error(`Unknown jump code ${c}`);
  const bases = codes.map(baseValueOf);
  const baseValue = round2(bases.reduce((a, b) => a + b, 0));
  let goeSourceCode = codes[0] ?? "";
  let best = -1;
  codes.forEach((c, i) => {
    if (bases[i] > best) {
      best = bases[i];
      goeSourceCode = c;
    }
  });
  if (codes.length > 1) info.push(`GOE taken from ${goeSourceCode}, the most difficult jump`);
  let factored = baseValue;
  if (e.rep) {
    factored = round2(factored * REP_FACTOR);
    info.push("+REP: 80% of the base value");
  }
  if (opts.secondHalf) {
    factored = round2(factored * SECOND_HALF_FACTOR);
    info.push("Second-half bonus: base value × 1.1");
  }
  const goeValue = goeSourceCode ? goeValueOf(goeSourceCode, goeGrade) : 0;
  return {
    code: elementCode(e),
    kind: "jump",
    baseValue,
    factoredBase: factored,
    rep: Boolean(e.rep),
    secondHalf: Boolean(opts.secondHalf),
    goeGrade,
    goeValue,
    total: round2(factored + goeValue),
    goeSourceCode,
    info,
  };
}

export function scoreElement(e: ElementSpec, goeGrade: number, opts: ScoreOptions = {}): ScoredElement {
  if (e.kind === "jump") return scoreJumpElement(e, goeGrade, opts);
  const code = elementCode(e);
  const sovCode = code.replace("*", "");
  const noValue = Boolean(e.noValue);
  if (!noValue && !hasCode(sovCode)) throw new Error(`Unknown element code ${sovCode}`);
  const baseValue = noValue ? 0 : baseValueOf(sovCode);
  const goeValue = noValue ? 0 : goeValueOf(sovCode, goeGrade);
  return {
    code,
    kind: e.kind,
    baseValue,
    factoredBase: baseValue,
    rep: false,
    secondHalf: false,
    goeGrade,
    goeValue,
    total: round2(baseValue + goeValue),
    goeSourceCode: sovCode,
    info: noValue ? ["No value (*)"] : [],
  };
}
