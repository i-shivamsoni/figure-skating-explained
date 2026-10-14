import type { PairCategory, Segment } from "@/data/types";
import { PAIR_FREE_SKATING } from "@/data/pairs";
import { countedJumps, isDeathSpiralCode, isLiftCode, isThrowCode, isTwistCode, liftGroupOf, type ElementSpec, type JumpElementSpec, type JumpSpec } from "./elements";
import type { Warning } from "./validate";

export interface PairValidationInput {
  segment: Segment;
  category: PairCategory;
  elements: ElementSpec[];
}

const codeOf = (e: ElementSpec): string => (e.kind === "code" ? e.code : "");
const isPairSpinCombination = (e: ElementSpec) => e.kind === "code" && /^PCoSp/.test(e.code);
const isChoreoPairLift = (e: ElementSpec) => e.kind === "code" && /^ChPLi/.test(e.code);
const isChoreoPairSpin = (e: ElementSpec) => e.kind === "code" && /^ChPSp/.test(e.code);
/** Throw Flip and throw Lutz count as the same throw (Rule 621). */
const throwName = (code: string) => code.replace(/Th.*$/, "").replace(/^(\d)(F|Lz)$/, "$1F/Lz");
const jumpName = (j: JumpSpec) => `${j.rotations}${j.jump}`;
const bigJump = (j: JumpSpec) => j.rotations >= 3 || (j.jump === "A" && j.rotations >= 2);

/**
 * Pair Skating program checks: the Short Program boxes (Rule 620) and the Free Skating
 * well-balanced limits (Rule 621), as listed in data/pairs.ts.
 */
export function validatePairProgram(input: PairValidationInput): Warning[] {
  const w: Warning[] = [];
  const els = input.elements;
  const idx = (pred: (e: ElementSpec) => boolean) => els.map((e, i) => (pred(e) ? i : -1)).filter((i) => i >= 0);
  const lifts = idx((e) => e.kind === "code" && isLiftCode(e.code));
  const twists = idx((e) => e.kind === "code" && isTwistCode(e.code));
  const throws = idx((e) => e.kind === "code" && isThrowCode(e.code));
  const deathSpirals = idx((e) => e.kind === "code" && isDeathSpiralCode(e.code));
  const pairSpins = idx(isPairSpinCombination);
  const jumpEls = els.map((e, i) => ({ e, i })).filter((x): x is { e: JumpElementSpec; i: number } => x.e.kind === "jump");
  const soloJumps = jumpEls.filter((x) => countedJumps(x.e).length === 1 && !x.e.sequence);
  const combos = jumpEls.filter((x) => countedJumps(x.e).length > 1 || x.e.sequence);
  const steps = idx((e) => e.kind === "step");
  const choreoSeq = idx((e) => e.kind === "choreoSequence");
  const singlesSpins = idx((e) => e.kind === "spin");
  const singlesChoreoSpin = idx((e) => e.kind === "choreoSpin");
  const junior = input.category === "juniorPairs";

  for (const i of singlesSpins) w.push({ severity: "warning", elementIndex: i, message: "Pairs use the pair spin codes (PSp, PCoSp); a singles spin code only scores as a side-by-side solo spin, which the 2026-27 pair programs do not list." });
  for (const i of singlesChoreoSpin) w.push({ severity: "warning", elementIndex: i, message: "Pairs use the choreographic pair spin ChPSp1, not ChSp1." });

  if (input.segment === "shortProgram") {
    const need: [string, number[], string][] = [
      ["lift", lifts, "a Group 3 hip lift (3Li)"],
      ["twist", twists, "a double or triple twist (2Tw/3Tw)"],
      ["throw", throws, junior ? "a double or triple loop throw (2LoTh/3LoTh)" : "a double or triple throw jump"],
      ["solo jump", soloJumps.map((x) => x.i), junior ? "a side-by-side double Lutz or double Axel" : "a side-by-side double or triple jump"],
      ["pair spin combination", pairSpins, "a pair spin combination (PCoSp)"],
      ["death spiral", deathSpirals, "a forward inside death spiral (FiDs)"],
      ["step sequence", steps, "a step sequence (StSq)"],
    ];
    for (const [name, found, hint] of need) {
      if (found.length === 0) w.push({ severity: "error", message: `Short Program: missing the ${name} box: ${hint}.` });
      if (found.length > 1) found.slice(1).forEach((i) => w.push({ severity: "error", elementIndex: i, message: `Short Program: only one ${name} is allowed; this extra element has no value.` }));
    }
    for (const i of lifts) if (liftGroupOf(codeOf(els[i])) !== "3") w.push({ severity: "error", elementIndex: i, message: "Short Program 2026-27: the lift must have a hip lift take-off (Group 3); another take-off gets no value and blocks the box." });
    for (const i of twists) if (!/^[23]Tw/.test(codeOf(els[i]))) w.push({ severity: "error", elementIndex: i, message: "Short Program: the twist must be a double or a triple." });
    for (const i of throws) {
      const c = codeOf(els[i]);
      if (junior && !/^[23]LoTh/.test(c)) w.push({ severity: "error", elementIndex: i, message: "Junior Short Program 2026-27: the throw must be a double or triple loop." });
      if (!junior && !/^[23]/.test(c)) w.push({ severity: "error", elementIndex: i, message: "Short Program: the throw must be a double or a triple." });
    }
    for (const x of soloJumps) {
      const j = countedJumps(x.e)[0];
      if (!j) continue;
      if (junior && !((j.jump === "Lz" && j.rotations === 2) || (j.jump === "A" && j.rotations === 2))) w.push({ severity: "error", elementIndex: x.i, message: "Junior Short Program 2026-27: the solo jump must be a double Lutz or a double Axel." });
      if (!junior && (j.rotations < 2 || j.rotations > 3)) w.push({ severity: "error", elementIndex: x.i, message: "Short Program: the solo jump must be a double or a triple." });
    }
    for (const x of combos) w.push({ severity: "error", elementIndex: x.i, message: "Short Program: no jump combination or sequence; only a solo jump." });
    for (const i of deathSpirals) if (!/^FiDs/.test(codeOf(els[i]))) w.push({ severity: "error", elementIndex: i, message: "Short Program 2026-27: the death spiral must be a forward inside death spiral (FiDs)." });
    for (const i of choreoSeq) w.push({ severity: "error", elementIndex: i, message: "Short Program: no choreographic sequence." });
    if (els.length > 7) w.push({ severity: "error", message: `Short Program: seven elements, not ${els.length}; extra elements are not counted.` });
    return w;
  }

  const rules = junior ? PAIR_FREE_SKATING.junior : PAIR_FREE_SKATING.senior;
  const over = (found: number[], max: number, what: string) => {
    if (found.length > max) found.slice(max).forEach((i) => w.push({ severity: "error", elementIndex: i, message: `Free Skating: maximum ${max} ${what}; this one is not counted.` }));
  };
  over(lifts, rules.maxLifts, "lifts");
  over(idx(isChoreoPairLift), rules.maxChoreoPairLifts, "choreographic pair lift" + (rules.maxChoreoPairLifts === 0 ? " (none for Juniors)" : ""));
  over(twists, rules.maxTwists, "twist lift");
  over(throws, rules.maxThrows, "throw jumps");
  over(soloJumps.map((x) => x.i), rules.maxSoloJumps, "solo jump");
  over(combos.map((x) => x.i), rules.maxJumpCombinationsOrSequences, "jump combination or sequence");
  over(idx(isChoreoPairSpin), rules.maxChoreoPairSpins, "choreographic pair spin");
  over(deathSpirals, rules.maxDeathSpirals, "death spiral");
  over(pairSpins, 1, "pair spin combination");
  for (const i of steps) w.push({ severity: "warning", elementIndex: i, message: "There is no step sequence in the pair Free Skating." });
  for (const i of choreoSeq) w.push({ severity: "warning", elementIndex: i, message: "2026-27: no choreographic sequence in the Senior or Junior pair Free Skating." });
  // lifts: different codes, not both from the same group
  const seenLift = new Map<string, number>();
  const seenGroup = new Map<string, number>();
  for (const i of lifts) {
    const c = codeOf(els[i]);
    if (seenLift.has(c)) w.push({ severity: "error", elementIndex: i, message: `Lift ${c} repeats element #${seenLift.get(c)! + 1}: a second lift with the same code is not marked but blocks a lift box.` });
    const g = liftGroupOf(c).replace(/[A-Z]$/, "");
    if (seenGroup.has(g) && !seenLift.has(c)) w.push({ severity: "error", elementIndex: i, message: `Both lifts are from Group ${g}; the two lifts must come from different groups.` });
    seenLift.set(c, i);
    seenGroup.set(g, i);
  }
  // throws: two different throws, Flip and Lutz being the same throw
  const seenThrow = new Map<string, number>();
  for (const i of throws) {
    const n = throwName(codeOf(els[i]));
    if (seenThrow.has(n)) w.push({ severity: "error", elementIndex: i, message: `A repeated throw of the same name and revolutions has no value (throw Flip and throw Lutz count as the same throw).` });
    seenThrow.set(n, i);
  }
  // jumps: at most two in the combination or sequence; big jumps have different names across elements
  for (const x of combos) if (countedJumps(x.e).length > 2) w.push({ severity: "error", elementIndex: x.i, message: "The pair jump combination or sequence consists of two jumps; the extra jump is deleted." });
  const seenJump = new Map<string, number>();
  for (const x of jumpEls) {
    const names = new Set(countedJumps(x.e).filter(bigJump).map(jumpName));
    for (const n of names) {
      if (seenJump.has(n) && seenJump.get(n) !== x.i) w.push({ severity: "error", elementIndex: x.i, message: `${n} already appears in element #${seenJump.get(n)! + 1}: jumps of more than two revolutions must have different names across elements.` });
      seenJump.set(n, x.i);
    }
  }
  return w;
}
