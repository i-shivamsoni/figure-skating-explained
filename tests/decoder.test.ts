import { describe, expect, it } from "vitest";
import { elementSpecFromCode, elementSpecsFromCodes } from "@/lib/decoder/parse";
import { elementCode } from "@/lib/scoring/elements";
import { scoreProgram } from "@/lib/scoring/program";
import { baseValueOf } from "@/lib/scoring/sov";

describe("elementSpecFromCode", () => {
  it("round-trips the codes a protocol shows", () => {
    for (const code of ["4Lz", "3A", "3Lz<+1Eu+3S", "4T+3T", "2A+3T+SEQ", "3F!q", "3Lze", "3Lo+REP", "CCoSp4", "FCCoSp4V", "LSp3", "StSq4", "StSqB", "ChSq1", "ChSp1"]) {
      const spec = elementSpecFromCode(code);
      expect(spec, code).toBeDefined();
      expect(elementCode(spec!)).toBe(code);
    }
  });
  it("keeps pair elements as code elements and drops what it cannot read", () => {
    expect(elementSpecFromCode("5RLi4")).toEqual({ kind: "code", code: "5RLi4" });
    expect(elementSpecFromCode("3LzTh")).toEqual({ kind: "code", code: "3LzTh" });
    expect(elementSpecFromCode("3Tw3")).toEqual({ kind: "code", code: "3Tw3" });
    expect(elementSpecFromCode("nonsense")).toBeUndefined();
    expect(elementSpecFromCode("7Lz")).toBeUndefined();
    expect(elementSpecFromCode("")).toBeUndefined();
  });
  it("scores a list from the rink as the rink does at GOE 0", () => {
    const specs = elementSpecsFromCodes("4Lz,CCoSp4,3A, StSq4 ,bogus");
    expect(specs).toHaveLength(4);
    const r = scoreProgram({ segment: "freeSkating", category: "seniorMen", elements: specs.map((spec) => ({ spec, goe: 0 })), components: { composition: 5, presentation: 5, skatingSkills: 5 }, falls: 0, otherDeductions: 0 });
    expect(r.tes).toBeCloseTo(["4Lz", "CCoSp4", "3A", "StSq4"].reduce((sum, c) => sum + baseValueOf(c), 0), 2);
  });
});
