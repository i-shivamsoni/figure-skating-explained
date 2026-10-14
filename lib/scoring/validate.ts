import type { Segment } from "@/data/types";
import { isPairs, type ScoringCategory } from "./program";
import { validatePairProgram } from "./validatePairs";
import { JUMP_BY_ID, ROTATION_SHORT } from "@/data/jumps";
import { countedJumps, elementCode, isListedJump, jumpDisplayCode, listedCountedJumps, type ElementSpec, type JumpElementSpec, type JumpSpec, type SpinElementSpec } from "./elements";

export interface Warning {
  severity: "error" | "warning" | "info";
  message: string;
  elementIndex?: number;
}

export interface ValidationInput {
  segment: Segment;
  category: ScoringCategory;
  elements: ElementSpec[];
}

const jumpName = (j: JumpSpec) => `${ROTATION_SHORT[j.rotations] ?? j.rotations} ${JUMP_BY_ID[j.jump].name}`;
const keyOf = (j: JumpSpec) => `${j.rotations}${j.jump}`;

const isFlyingSpin = (s: SpinElementSpec) => /^F(U|L|C|S)Sp$/.test(s.family);
const isCombinationSpin = (s: SpinElementSpec) => s.family.endsWith("CoSp");
const spinPosition = (s: SpinElementSpec) => s.family.replace(/^F?C?/, "").replace(/Sp$/, "");

export function validateProgram(input: ValidationInput): Warning[] {
  if (isPairs(input.category)) return validatePairProgram({ segment: input.segment, category: input.category, elements: input.elements });
  const w: Warning[] = [];
  const jumpElements = input.elements.map((e, i) => ({ e, i })).filter((x): x is { e: JumpElementSpec; i: number } => x.e.kind === "jump");
  const spins = input.elements.map((e, i) => ({ e, i })).filter((x): x is { e: SpinElementSpec; i: number } => x.e.kind === "spin");
  const steps = input.elements.filter((e) => e.kind === "step").length;
  const chSq = input.elements.filter((e) => e.kind === "choreoSequence").length;
  const chSp = input.elements.filter((e) => e.kind === "choreoSpin").length;

  // Rules that apply to both segments
  for (const { e, i } of jumpElements) {
    const counted = countedJumps(e);
    counted.forEach((j) => {
      if (j.rotations === 5 && (input.segment === "shortProgram" || listedCountedJumps(e).length > 1)) {
        w.push({ severity: "error", elementIndex: i, message: `${jumpName(j)}: quints are only allowed as solo jumps in the Free Skating.` });
      }
      if (j.jump === "Eu" && input.segment === "shortProgram") {
        w.push({ severity: "error", elementIndex: i, message: "An Euler is not allowed in the Short Program combination." });
      }
    });
    const eulers = counted.filter((j) => j.jump === "Eu");
    if (eulers.length > 1) w.push({ severity: "error", elementIndex: i, message: "Only one Euler may be used in a jump element; the jumps after the second one receive no value." });
    const eulerIndex = e.jumps.findIndex((j) => j.jump === "Eu");
    if (eulerIndex === 0 || eulerIndex === e.jumps.length - 1) w.push({ severity: "error", elementIndex: i, message: "An Euler only counts between two listed jumps." });
    if (eulerIndex > 0 && e.jumps[eulerIndex + 1] && !["S", "F"].includes(e.jumps[eulerIndex + 1].jump)) {
      w.push({ severity: "warning", elementIndex: i, message: "An Euler lands on the back inside edge of the other foot, so it is normally followed by a Salchow or Flip." });
    }
  }

  if (input.segment === "shortProgram") validateShortProgram(input, jumpElements, spins, steps, chSq, chSp, w);
  else validateFreeSkating(input, jumpElements, spins, steps, chSq, chSp, w);
  return w;
}

function validateShortProgram(
  input: ValidationInput,
  jumpElements: { e: JumpElementSpec; i: number }[],
  spins: { e: SpinElementSpec; i: number }[],
  steps: number,
  chSq: number,
  chSp: number,
  w: Warning[],
) {
  const { category } = input;
  if (jumpElements.length !== 3) w.push({ severity: "error", message: `The Short Program needs exactly three jump elements (Axel, solo jump, combination); found ${jumpElements.length}.` });
  if (spins.length !== 3) w.push({ severity: "error", message: `The Short Program needs exactly three spins (flying spin, spin in one position, spin combination); found ${spins.length}.` });
  if (steps !== 1) w.push({ severity: "error", message: `The Short Program needs one step sequence; found ${steps}.` });
  if (chSq || chSp) w.push({ severity: "error", message: "Choreographic elements belong to the Free Skating only." });

  const solos = jumpElements.filter(({ e }) => listedCountedJumps(e).length === 1 && !e.sequence);
  const combos = jumpElements.filter(({ e }) => listedCountedJumps(e).length >= 2);
  const axelOk = (j: JumpSpec) => j.jump === "A" && (category === "juniorWomen" ? j.rotations === 2 : j.rotations === 2 || j.rotations === 3);
  const axel = solos.find(({ e }) => axelOk(listedCountedJumps(e)[0]));
  if (!axel) w.push({ severity: "error", message: category === "juniorWomen" ? "A double Axel is required." : "A double or triple Axel is required." });

  const soloCandidates = solos.filter((s) => s !== axel);
  const solo = soloCandidates[0];
  if (!solo) w.push({ severity: "error", message: "A solo jump is required in addition to the Axel." });
  else {
    const j = listedCountedJumps(solo.e)[0];
    const ok =
      category === "seniorMen" ? [3, 4].includes(j.rotations) :
      category === "seniorWomen" ? j.rotations === 3 :
      j.jump === "Lz" && [2, 3].includes(j.rotations);
    if (!ok) {
      const need = category === "seniorMen" ? "any triple or quadruple jump" : category === "seniorWomen" ? "any triple jump" : "a double or triple Lutz (prescribed for 2026-27)";
      w.push({ severity: "error", elementIndex: solo.i, message: `Solo jump must be ${need}; ${jumpName(j)} does not qualify.` });
    }
    if (axel && j.jump === "A" && j.rotations === 3 && listedCountedJumps(axel.e)[0].rotations === 3) {
      w.push({ severity: "error", elementIndex: solo.i, message: "A triple Axel used as the Axel element cannot be repeated as the solo jump." });
    }
  }
  for (const extra of soloCandidates.slice(1)) w.push({ severity: "error", elementIndex: extra.i, message: "Extra solo jump: it has no value and blocks a jump box." });

  const combo = combos[0];
  if (!combo) w.push({ severity: "error", message: "A jump combination of two jumps is required." });
  else {
    const js = listedCountedJumps(combo.e);
    if (js.length > 2) w.push({ severity: "error", elementIndex: combo.i, message: "Only two jumps count in a Short Program combination; the third receives no value." });
    const rots = js.slice(0, 2).map((j) => j.rotations).sort((a, b) => a - b).join("+");
    const allowed =
      category === "seniorMen" ? ["2+3", "3+3", "2+4", "3+4"] :
      category === "juniorWomen" ? ["2+2", "2+3", "3+3"] : ["2+3", "3+3"];
    if (!allowed.includes(rots)) w.push({ severity: "error", elementIndex: combo.i, message: `Combination ${elementCode(combo.e)} is not an allowed rotation mix for ${category} (allowed: ${allowed.join(", ")}).` });
    if (solo) {
      const sj = listedCountedJumps(solo.e)[0];
      if (js.some((j) => keyOf(j) === keyOf(sj))) w.push({ severity: "error", elementIndex: combo.i, message: `${jumpName(sj)} appears both as the solo jump and in the combination; the repeated jump receives no value.` });
    }
    if (axel) {
      const aj = listedCountedJumps(axel.e)[0];
      if (aj.rotations === 3 && js.some((j) => keyOf(j) === "3A")) w.push({ severity: "error", elementIndex: combo.i, message: "A triple Axel used as the Axel element cannot be repeated in the combination." });
    }
  }
  for (const extra of combos.slice(1)) w.push({ severity: "error", elementIndex: extra.i, message: "Only one jump combination is allowed in the Short Program." });
  for (const { e, i } of jumpElements) if (e.sequence) w.push({ severity: "error", elementIndex: i, message: "Jump sequences are not allowed in the Short Program." });

  const flying = spins.filter(({ e }) => isFlyingSpin(e));
  const combinations = spins.filter(({ e }) => isCombinationSpin(e));
  const onePos = spins.filter(({ e }) => !isFlyingSpin(e) && !isCombinationSpin(e));
  if (flying.length !== 1) w.push({ severity: "error", message: "One flying spin (FUSp, FLSp, FCSp or FSSp) is required." });
  else if (category.startsWith("junior") && flying[0].e.family !== "FCSp") w.push({ severity: "error", elementIndex: flying[0].i, message: "Juniors must perform the prescribed flying camel spin (FCSp) in 2026-27." });
  if (combinations.length !== 1) w.push({ severity: "error", message: "One spin combination is required." });
  else if (combinations[0].e.family !== "CCoSp") w.push({ severity: "error", elementIndex: combinations[0].i, message: "The Short Program spin combination must have exactly one change of foot and no flying entry (CCoSp)." });
  if (onePos.length !== 1) w.push({ severity: "error", message: "One spin in one position is required." });
  else {
    const s = onePos[0].e;
    const allowed =
      category === "seniorMen" ? ["CCSp", "CSSp"] :
      category === "juniorMen" ? ["CSSp"] :
      category === "seniorWomen" ? ["LSp", "SSp", "CSp"] : ["LSp", "SSp"];
    if (!allowed.includes(s.family)) w.push({ severity: "error", elementIndex: onePos[0].i, message: `Spin in one position must be one of ${allowed.join(", ")} for ${category}.` });
    if (flying.length === 1 && category.startsWith("senior") && spinPosition(flying[0].e) === spinPosition(s)) {
      w.push({ severity: "error", elementIndex: onePos[0].i, message: "The flying spin's landing position must differ from the spin in one position; the later spin is not counted." });
    }
  }
  const families = spins.map(({ e }) => e.family);
  if (new Set(families).size !== families.length) w.push({ severity: "error", message: "All spins must have different abbreviations." });
}

function validateFreeSkating(
  input: ValidationInput,
  jumpElements: { e: JumpElementSpec; i: number }[],
  spins: { e: SpinElementSpec; i: number }[],
  steps: number,
  chSq: number,
  chSp: number,
  w: Warning[],
) {
  const senior = input.category.startsWith("senior");
  if (jumpElements.length > 6) w.push({ severity: "error", message: `Maximum six jump elements; the ${jumpElements.length - 6} extra receive no value.` });
  if (!jumpElements.some(({ e }) => countedJumps(e).some((j) => j.jump === "A"))) {
    w.push({ severity: "error", message: "No Axel-type jump: the last jump element receives no value (*)." });
  }
  if (spins.length > 3) w.push({ severity: "error", message: "Maximum three spins; extra spins are not counted." });
  if (!spins.some(({ e }) => isCombinationSpin(e))) w.push({ severity: "warning", message: "The well-balanced program includes one spin combination." });
  if (!spins.some(({ e }) => isFlyingSpin(e))) w.push({ severity: "warning", message: "The well-balanced program includes one flying spin with no change of foot or position." });
  if (chSp !== 1) w.push({ severity: "warning", message: "The well-balanced program includes one choreographic spin." });
  if (spins.length + chSp > 3) w.push({ severity: "error", message: "Spins plus the choreographic spin exceed the three spin boxes." });
  const families = spins.map(({ e }) => e.family);
  if (new Set(families).size !== families.length) w.push({ severity: "error", message: "Two spins have the same abbreviation; the second is not counted but fills a box." });
  if (senior && steps !== 1) w.push({ severity: steps > 1 ? "error" : "warning", message: `The Senior Free Skating has one step sequence; found ${steps}.` });
  if (!senior && steps > 0) w.push({ severity: "error", message: "There is no step sequence in the Junior Free Skating." });
  if (chSq !== 1) w.push({ severity: chSq > 1 ? "error" : "warning", message: `The Free Skating has one choreographic sequence; found ${chSq}.` });

  // Combinations and sequences
  const multi = jumpElements.filter(({ e }) => listedCountedJumps(e).length >= 2 || e.sequence);
  const sequences = multi.filter(({ e }) => e.sequence);
  const combosWithEuler = multi.filter(({ e }) => !e.sequence && countedJumps(e).some((j) => j.jump === "Eu"));
  if (multi.length > 2) w.push({ severity: "error", message: "At most two jump combinations, or one combination and one jump sequence; the first jump of each extra unit counts with +REP." });
  if (sequences.length > 1) w.push({ severity: "error", message: "Only one jump sequence is allowed." });
  if (sequences.length === 1 && combosWithEuler.length > 0) w.push({ severity: "error", message: "With a jump sequence, the combination may not use an Euler." });
  const threes = multi.filter(({ e }) => listedCountedJumps(e).length >= 3);
  if (threes.length > 1) w.push({ severity: "error", message: "Only one combination or sequence may have three jumps; the other is limited to two." });
  for (const { e, i } of multi) if (listedCountedJumps(e).length > 3) w.push({ severity: "error", elementIndex: i, message: "No jump element may contain more than three listed jumps." });
  const eulerUnits = jumpElements.filter(({ e }) => countedJumps(e).some((j) => j.jump === "Eu"));
  if (eulerUnits.length > 1) w.push({ severity: "error", message: "An Euler may be used only once in the Free Skating." });
  for (const { e, i } of sequences) {
    const js = listedCountedJumps(e);
    if (!js.slice(1).some((j) => j.jump === "A")) w.push({ severity: "error", elementIndex: i, message: "In a jump sequence the second or third jump must be an Axel-type jump." });
  }

  // Repetition rules (Rule 612)
  const occurrences: { j: JumpSpec; solo: boolean; elementIndex: number }[] = [];
  for (const { e, i } of jumpElements) {
    const listed = listedCountedJumps(e);
    const solo = listed.length === 1 && !e.sequence;
    for (const j of listed) occurrences.push({ j, solo, elementIndex: i });
  }
  const byType = new Map<string, number>();
  const byKey = new Map<string, typeof occurrences>();
  for (const o of occurrences) {
    byType.set(o.j.jump, (byType.get(o.j.jump) ?? 0) + 1);
    const k = keyOf(o.j);
    byKey.set(k, [...(byKey.get(k) ?? []), o]);
  }
  for (const [type, n] of byType) if (n > 3) w.push({ severity: "error", message: `${JUMP_BY_ID[type as JumpSpec["jump"]].name}: the same type of jump may appear at most three times whatever the rotations (${n} found).` });
  const repeatedHard: string[] = [];
  for (const [k, list] of byKey) {
    const j = list[0].j;
    if (!isListedJump(j.jump)) continue;
    if (j.rotations === 2 && list.length > 2) w.push({ severity: "error", message: `${jumpName(j)} may appear at most twice; the ${list.length - 2} extra receive no value.` });
    if (j.rotations >= 3) {
      if (list.length > 2) w.push({ severity: "error", message: `${jumpName(j)} may be attempted at most twice; further attempts receive no value.` });
      if (list.length >= 2) {
        repeatedHard.push(k);
        if (list[0].solo && list[1].solo) {
          w.push({ severity: "info", elementIndex: list[1].elementIndex, message: `${jumpName(j)} is repeated as a solo jump: the second one is marked +REP and gets 80% of its base value.` });
        }
      }
    }
  }
  if (repeatedHard.length > 2) w.push({ severity: "error", message: `Only two triples, quads or quints may be repeated; ${repeatedHard.map((k) => jumpName(byKey.get(k)![0].j)).join(", ")} are all repeated.` });
  const repeatedQuads = repeatedHard.filter((k) => byKey.get(k)![0].j.rotations >= 4);
  if (repeatedQuads.length > 1) w.push({ severity: "error", message: `Only one quad or quint may be repeated; ${repeatedQuads.map((k) => jumpName(byKey.get(k)![0].j)).join(" and ")} are both repeated.` });
  for (const { e, i } of jumpElements) {
    const dup = e.jumps.filter((j) => j.noValue).map(jumpDisplayCode);
    if (dup.length) w.push({ severity: "info", elementIndex: i, message: `${dup.join(", ")} marked * (no value).` });
  }
}
