import type { Category, ProgramSpec } from "./types";

export const CATEGORY_LABELS: Record<Category, string> = {
  seniorMen: "Senior Men",
  seniorWomen: "Senior Women",
  juniorMen: "Junior Men",
  juniorWomen: "Junior Women",
};

/** Rule 502. Seconds; ±10 s is allowed before time deductions start. */
export const DURATIONS = {
  shortProgram: 160,
  freeSkating: { senior: 240, junior: 210 },
};

export function durationFor(segment: "shortProgram" | "freeSkating", category: Category): number {
  if (segment === "shortProgram") return DURATIONS.shortProgram;
  return category.startsWith("senior") ? DURATIONS.freeSkating.senior : DURATIONS.freeSkating.junior;
}

/** Rule 611, season 2026-27 (the Junior groups rotate every July). */
export const SHORT_PROGRAMS: ProgramSpec[] = [
  {
    segment: "shortProgram",
    category: "seniorMen",
    durationSeconds: 160,
    elements: [
      { slot: "Axel", requirement: "Double or triple Axel" },
      { slot: "Solo jump", requirement: "Any triple or quadruple jump", notes: ["If a quad is used here, a different quad may be in the combination.", "A triple Axel used as the Axel cannot be repeated as the solo jump or in the combination."] },
      { slot: "Jump combination", requirement: "Two jumps: double + triple, triple + triple, or quadruple + double or triple", notes: ["May repeat the same jump twice (3T+3T) but must not contain the solo jump.", "No Euler and no quint in the Short Program."] },
      { slot: "Flying spin", requirement: "Any flying spin, landing position different from the spin in one position; 8 revolutions in the landing position" },
      { slot: "Spin in one position", requirement: "Camel or sit spin with only one change of foot, 6 revolutions on each foot" },
      { slot: "Spin combination", requirement: "Only one change of foot, 6 revolutions on each foot, at least two basic positions (all three for full value)" },
      { slot: "Step sequence", requirement: "Fully utilising the ice surface" },
    ],
    notes: ["Seven elements in any order.", "An element that does not meet the requirements has no value but still fills its box."],
    sources: [{ doc: "rules2026", where: "Rule 611" }],
  },
  {
    segment: "shortProgram",
    category: "seniorWomen",
    durationSeconds: 160,
    elements: [
      { slot: "Axel", requirement: "Double or triple Axel" },
      { slot: "Solo jump", requirement: "Any triple jump", notes: ["A triple Axel used as the Axel cannot be repeated."] },
      { slot: "Jump combination", requirement: "Two jumps: double + triple or triple + triple", notes: ["Must not contain the solo jump; no Euler."] },
      { slot: "Flying spin", requirement: "Any flying spin, landing position different from the spin in one position; 8 revolutions" },
      { slot: "Spin in one position", requirement: "Layback or sideways leaning spin, or sit or camel spin, without change of foot; 8 revolutions" },
      { slot: "Spin combination", requirement: "Only one change of foot, 6 revolutions on each foot" },
      { slot: "Step sequence", requirement: "Fully utilising the ice surface" },
    ],
    notes: ["Seven elements in any order.", "In the layback the Biellmann position may only be taken after eight revolutions."],
    sources: [{ doc: "rules2026", where: "Rule 611" }],
  },
  {
    segment: "shortProgram",
    category: "juniorMen",
    durationSeconds: 160,
    elements: [
      { slot: "Axel", requirement: "Double or triple Axel" },
      { slot: "Solo jump", requirement: "Double or triple Lutz (prescribed for 2026-27; Flip in 2027-28, Loop in 2028-29)" },
      { slot: "Jump combination", requirement: "Two jumps: double + triple or triple + triple", notes: ["Must not contain the solo jump."] },
      { slot: "Flying spin", requirement: "Flying camel spin (prescribed for 2026-27), 8 revolutions" },
      { slot: "Spin in one position", requirement: "Sit spin with only one change of foot, 6 revolutions on each foot" },
      { slot: "Spin combination", requirement: "Only one change of foot, 6 revolutions on each foot" },
      { slot: "Step sequence", requirement: "Fully utilising the ice surface" },
    ],
    notes: ["A different jump than the prescribed one receives no value and blocks the box."],
    sources: [{ doc: "rules2026", where: "Rule 611" }],
  },
  {
    segment: "shortProgram",
    category: "juniorWomen",
    durationSeconds: 160,
    elements: [
      { slot: "Axel", requirement: "Double Axel" },
      { slot: "Solo jump", requirement: "Double or triple Lutz (prescribed for 2026-27)" },
      { slot: "Jump combination", requirement: "Two jumps: two doubles, double + triple, or triple + triple", notes: ["Must not contain the solo jump."] },
      { slot: "Flying spin", requirement: "Flying camel spin (prescribed for 2026-27), 8 revolutions" },
      { slot: "Spin in one position", requirement: "Layback or sideways leaning spin, or sit spin, without change of foot; 8 revolutions" },
      { slot: "Spin combination", requirement: "Only one change of foot, 6 revolutions on each foot" },
      { slot: "Step sequence", requirement: "Fully utilising the ice surface" },
    ],
    notes: [],
    sources: [{ doc: "rules2026", where: "Rule 611" }],
  },
];

/** Rule 612 and Technical Panel Handbook, Jump Elements (Free Skating). */
export const FREE_SKATING_RULES = {
  senior: {
    durationSeconds: 240,
    maxJumpElements: 6,
    maxSpins: 3,
    stepSequences: 1,
    choreoSequences: 1,
    summary: [
      "Maximum six jump elements, one of which must be an Axel-type jump.",
      "Maximum three spins: one spin combination, one flying spin, one choreographic spin, all of different character.",
      "One step sequence fully utilising the ice surface.",
      "One choreographic sequence.",
    ],
  },
  junior: {
    durationSeconds: 210,
    maxJumpElements: 6,
    maxSpins: 3,
    stepSequences: 0,
    choreoSequences: 1,
    summary: [
      "Maximum six jump elements, one of which must be an Axel-type jump.",
      "Maximum three spins: one spin combination, one flying spin, one choreographic spin.",
      "One choreographic sequence. No step sequence in the Junior Free Skating.",
    ],
  },
};

export const REPETITION_RULES = [
  "The same type of jump, whatever the number of revolutions, may appear at most three times in the program.",
  "Any double jump, including the double Axel, may appear at most twice (solo or inside a combination or sequence).",
  "Of all triples, quads and quints only two may be executed twice, and only one of those two may be a quad or quint. Jumps with the same name but different revolutions count as different jumps (3T and 4T are two jumps).",
  "If a triple, quad or quint is repeated and both executions are solo jumps, the second is marked +REP and gets 80% of its base value. If one of them is inside a combination or sequence, both get full value.",
  "A third attempt of a triple, quad or quint, or a third double of the same kind, has no value (*) but still fills a jump box.",
  "Up to two jump combinations, or one combination without an Euler plus one jump sequence. One of them may have three jumps, the other at most two.",
  "An Euler may be used once, between two listed jumps, and only in the Free Skating.",
  "Quints are only allowed as solo jumps, never in a combination or sequence, and never in the Short Program.",
  "Without any Axel-type jump the last jump element is deleted (*).",
];

export const SECOND_HALF_BONUS = {
  factor: 1.1,
  shortProgramElements: 1,
  freeSkatingElements: 3,
  summary:
    "Base values (not GOE) of jump elements started in the second half of the program are multiplied by 1.1: only the last jump element in the Short Program and the last three in the Free Skating. The second half starts at the midpoint of the required time, ignoring the ten-second allowance.",
};
