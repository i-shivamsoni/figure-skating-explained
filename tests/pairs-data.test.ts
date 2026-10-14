import { describe, expect, it } from "vitest";
import { SOV, baseValueOf, hasCode } from "@/lib/scoring/sov";
import {
  CHOREO_PAIR_LIFT,
  CHOREO_PAIR_SPIN,
  DEATH_SPIRALS,
  LIFT_CLARIFICATIONS,
  LIFT_GROUPS,
  LIFT_LEVEL_FEATURES,
  LIFT_POSITIONS,
  PAIR_DURATIONS,
  PAIR_ELEMENT_FAMILIES,
  PAIR_FREE_SKATING,
  PAIR_GOE_GUIDELINES,
  PAIR_MAX_LEVEL_TABLE,
  PAIR_PCS_FACTORS,
  PAIR_SHORT_PROGRAMS,
  PAIR_SHORT_PROGRAM_ROTATION,
  PAIR_SPIN_COMBINATION,
  PIVOT_FIGURE,
  SIDE_BY_SIDE,
  SOLO_SPIN_COMBINATION,
  THROW_JUMPS,
  TWIST_LIFT,
} from "@/data/pairs";
import type { LevelValues } from "@/data/types";

const LEVELS: (keyof LevelValues)[] = ["B", 1, 2, 3, 4];

function expectFamily(prefix: string, values: LevelValues, suffix = "") {
  for (const level of LEVELS) {
    const code = `${prefix}${level}${suffix}`;
    expect(hasCode(code), code).toBe(true);
    expect(baseValueOf(code), code).toBe(values[level]);
  }
}

describe("Pair Skating data against the 2026-27 Scale of Values", () => {
  it("cites element codes that exist, with the printed base values", () => {
    const examples = PAIR_ELEMENT_FAMILIES.flatMap((f) => f.examples);
    expect(examples.length).toBeGreaterThan(30);
    for (const { code, baseValue } of examples) {
      expect(hasCode(code), code).toBe(true);
      expect(baseValueOf(code), code).toBe(baseValue);
    }
    for (const code of ["5RLi4", "3Tw4", "3LzTh", "FiDs4", "PCoSp4V", "ChPLi1"]) expect(hasCode(code), code).toBe(true);
  });

  it("covers every lift group and Group 5 type at every level", () => {
    expect(LIFT_GROUPS.map((g) => g.group)).toEqual([1, 2, 3, 4, 5]);
    for (const group of LIFT_GROUPS) {
      if (group.baseValues) expectFamily(group.sovPrefix, group.baseValues);
      for (const type of group.types ?? []) expectFamily(type.sovPrefix, type.baseValues);
    }
    const group5 = LIFT_GROUPS[4];
    expect(group5.types?.map((t) => t.code)).toEqual(["5T", "5S", "5A", "5B", "5R"]);
    expect(baseValueOf("5RLi4")).toBe(7.0);
    expect(baseValueOf("3Li4")).toBe(5.1);
    expect(LIFT_POSITIONS.map((p) => p.id)).toEqual(["upright", "star", "platter"]);
  });

  it("covers the twist families, with the << rows valued one revolution lower", () => {
    const families = ["1Tw", "2Tw", "3Tw", "4Tw"] as const;
    for (const family of families) expectFamily(family, TWIST_LIFT.baseValues[family]);
    for (const level of LEVELS) {
      expect(baseValueOf(`1Tw${level}<<`)).toBe(0);
      expect(baseValueOf(`2Tw${level}<<`)).toBe(TWIST_LIFT.baseValues["1Tw"][level]);
      expect(baseValueOf(`3Tw${level}<<`)).toBe(TWIST_LIFT.baseValues["2Tw"][level]);
      expect(baseValueOf(`4Tw${level}<<`)).toBe(TWIST_LIFT.baseValues["3Tw"][level]);
    }
  });

  it("covers every throw with its q, < and << rows", () => {
    for (const [code, base] of Object.entries(THROW_JUMPS.baseValues)) {
      expect(baseValueOf(code), code).toBe(base);
      expect(baseValueOf(`${code}q`), `${code}q`).toBe(base);
      expect(baseValueOf(`${code}<`), `${code}<`).toBeCloseTo(base * THROW_JUMPS.underRotatedFactor, 1); // the SOV rounds 3.975 up to 3.98
      expect(hasCode(`${code}<<`), `${code}<<`).toBe(true);
    }
    expect(baseValueOf("3LzTh<<")).toBe(baseValueOf("2LzTh"));
    expect(baseValueOf("3FTh")).toBe(baseValueOf("3LzTh"));
    expect(baseValueOf("1ATh<<")).toBe(0);
  });

  it("covers the four death spirals, the Advanced Novice bonus rows and the pivot figure", () => {
    expect(DEATH_SPIRALS.types.map((t) => t.code)).toEqual(["BoDs", "FiDs", "BiDs", "FoDs"]);
    for (const type of DEATH_SPIRALS.types) {
      expectFamily(type.code, type.baseValues);
      for (const level of [2, 3]) expect(hasCode(`${type.code}${level}b`), `${type.code}${level}b`).toBe(true);
    }
    expect(DEATH_SPIRALS.types.find((t) => t.prescribedShortProgram === "2026-27")?.code).toBe("FiDs");
    expect(hasCode(PIVOT_FIGURE.code)).toBe(true);
    expect(baseValueOf(PIVOT_FIGURE.code)).toBe(PIVOT_FIGURE.baseValue);
  });

  it("covers the pair spin, pair spin combination (with V) and the choreographic elements", () => {
    expectFamily("PCoSp", PAIR_SPIN_COMBINATION.baseValues.full);
    expectFamily("PCoSp", PAIR_SPIN_COMBINATION.baseValues.v, "V");
    expectFamily(PAIR_SPIN_COMBINATION.novicePairSpin.code, PAIR_SPIN_COMBINATION.novicePairSpin.baseValues);
    expect(baseValueOf(CHOREO_PAIR_LIFT.code)).toBe(CHOREO_PAIR_LIFT.baseValue);
    expect(baseValueOf(CHOREO_PAIR_SPIN.code)).toBe(CHOREO_PAIR_SPIN.baseValue);
    expect(baseValueOf("ChPLi1")).toBe(4.5);
    expect(baseValueOf("ChPSp1")).toBe(3.5);
    expect(SOLO_SPIN_COMBINATION.levelFeatures).toHaveLength(11);
  });

  it("matches the pair program component factors", () => {
    expect(SOV.programComponentFactors.pairs).toEqual({ shortProgram: PAIR_PCS_FACTORS.shortProgram, freeSkating: PAIR_PCS_FACTORS.freeSkating });
  });
});

describe("Pair Skating programs", () => {
  it("has exactly seven elements in each 2026-27 Short Program", () => {
    expect(PAIR_SHORT_PROGRAMS.map((p) => p.category)).toEqual(["seniorPairs", "juniorPairs"]);
    for (const program of PAIR_SHORT_PROGRAMS) {
      expect(program.elements, program.category).toHaveLength(7);
      expect(program.season).toBe("2026-27");
      expect(program.durationSeconds).toBe(PAIR_DURATIONS.shortProgram);
      expect(program.sources.length).toBeGreaterThan(0);
      expect(program.elements.map((e) => e.slot)).toEqual(["Lift", "Twist lift", "Throw jump", "Solo jump", "Pair spin combination", "Death spiral", "Step sequence"]);
    }
    for (const season of PAIR_SHORT_PROGRAM_ROTATION.seasons) {
      expect(season.senior, season.season).toHaveLength(7);
      expect(season.junior, season.season).toHaveLength(7);
    }
  });

  it("states the well-balanced Free Skating limits and durations", () => {
    expect(PAIR_FREE_SKATING.senior.durationSeconds).toBe(PAIR_DURATIONS.freeSkating.senior);
    expect(PAIR_FREE_SKATING.junior.durationSeconds).toBe(PAIR_DURATIONS.freeSkating.junior);
    expect(PAIR_FREE_SKATING.senior.limits).toHaveLength(8);
    expect(PAIR_FREE_SKATING.junior.limits).toHaveLength(7);
    expect(PAIR_FREE_SKATING.senior.maxChoreoPairLifts).toBe(1);
    expect(PAIR_FREE_SKATING.junior.maxChoreoPairLifts).toBe(0);
  });
});

describe("Pair Skating rule blocks", () => {
  it("lists the level features the ISU prints", () => {
    expect(LIFT_LEVEL_FEATURES.map((f) => f.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(LIFT_LEVEL_FEATURES.filter((f) => f.senior && f.junior).map((f) => f.number)).toEqual([1, 4]);
    expect(TWIST_LIFT.levelFeatures).toHaveLength(5);
    expect(DEATH_SPIRALS.levelFeatures).toHaveLength(3);
    expect(PAIR_SPIN_COMBINATION.levelFeatures).toHaveLength(6);
  });

  it("gives every GOE guideline six positive bullets, the first two required for +4 and +5, and a fall at -5", () => {
    expect(PAIR_GOE_GUIDELINES.map((g) => g.elementType)).toEqual(["lift", "twist", "jump", "throw", "soloSpin", "pairSpin", "deathSpiral", "step", "choreoSequence", "choreoPairLift", "choreoPairSpin"]);
    for (const g of PAIR_GOE_GUIDELINES) {
      expect(g.positive, g.name).toHaveLength(6);
      expect(g.positive.map((b) => b.requiredForHighGoe), g.name).toEqual([true, true, false, false, false, false]);
      expect(g.reductions.find((r) => r.error === "Fall")?.range, g.name).toBe("-5");
      expect(g.sources.length, g.name).toBeGreaterThan(0);
    }
  });

  it("carries source references on every block", () => {
    for (const f of PAIR_ELEMENT_FAMILIES) expect(f.sources.length, f.id).toBeGreaterThan(0);
    for (const g of LIFT_GROUPS) expect(g.sources.length, `group ${g.group}`).toBeGreaterThan(0);
    for (const c of LIFT_CLARIFICATIONS) expect(c.sources.length, c.title).toBeGreaterThan(0);
    for (const c of SIDE_BY_SIDE.calling) expect(c.sources.length, c.title).toBeGreaterThan(0);
    for (const s of THROW_JUMPS.signs) expect(s.sources.length, s.sign).toBeGreaterThan(0);
    for (const block of [TWIST_LIFT, THROW_JUMPS, DEATH_SPIRALS, PAIR_SPIN_COMBINATION, SOLO_SPIN_COMBINATION, CHOREO_PAIR_LIFT, CHOREO_PAIR_SPIN, PAIR_FREE_SKATING, SIDE_BY_SIDE, PIVOT_FIGURE]) {
      expect(block.sources.length).toBeGreaterThan(0);
    }
  });

  it("transcribes the no-value and maximum-level table", () => {
    expect(PAIR_MAX_LEVEL_TABLE).toHaveLength(25);
    const wrongTakeOff = PAIR_MAX_LEVEL_TABLE.find((r) => r.problem === "Wrong take-off");
    expect(wrongTakeOff).toEqual({ section: "Lifts", problem: "Wrong take-off", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" });
    const lowPosition = PAIR_MAX_LEVEL_TABLE.find((r) => r.section === "Death spiral" && r.maxLevelShortProgram === "1");
    expect(lowPosition?.maxLevelFreeSkating).toBe("1");
    expect(new Set(PAIR_MAX_LEVEL_TABLE.map((r) => r.section)).size).toBe(7);
  });
});
