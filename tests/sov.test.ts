import { describe, expect, it } from "vitest";
import { SOV, baseValueOf, goeValueOf, hasCode } from "@/lib/scoring/sov";

describe("Scale of Values 2026-27", () => {
  it("has the base values printed in ISU Communication 2786", () => {
    const expected: Record<string, number> = {
      "1T": 0.4, "1A": 1.1, "2A": 3.3, "3T": 4.2, "3S": 4.3, "3Lo": 4.9, "3F": 5.3, "3Lz": 5.9, "3A": 8.0,
      "4T": 9.5, "4S": 9.7, "4Lo": 10.5, "4F": 11.0, "4Lz": 11.5, "4A": 12.5, "5T": 14.0, "5Lz": 14.0,
      "3Lz<": 4.72, "3Lz<<": 2.1, "3F!q": 5.3, "3Fe": 4.24, "3Fe<": 3.18, "4Lze<<": 4.72, "3Aq": 8.0, "3A<": 6.4,
      "CCoSp4": 4.2, "CCoSp4V": 3.15, "FCCoSp4": 4.2, "FSSp4": 3.6, "FCSp4": 3.8, "LSp4": 3.2, "CCSp4": 3.8, "USpB": 1.2,
      "StSqB": 1.6, "StSq4": 4.1, "ChSq1": 3.5, "ChSp1": 3.5, "Eu": 0,
    };
    for (const [code, base] of Object.entries(expected)) expect(baseValueOf(code), code).toBe(base);
  });

  it("values GOE at 10% of the base value per grade", () => {
    expect(goeValueOf("4T", 5)).toBe(4.75);
    expect(goeValueOf("4T", -5)).toBe(-4.75);
    expect(goeValueOf("4T", 1)).toBe(0.95);
    expect(goeValueOf("4T", 0)).toBe(0);
    expect(goeValueOf("ChSq1", 3)).toBe(1.5);
    expect(goeValueOf("ChSq1", -2)).toBe(-1.0);
  });

  it("covers every spin family at every level", () => {
    const families = ["USp", "LSp", "CSp", "SSp", "FUSp", "FLSp", "FCSp", "FSSp", "CUSp", "CLSp", "CCSp", "CSSp", "FCUSp", "FCLSp", "FCCSp", "FCSSp", "CoSp", "FCoSp", "CCoSp", "FCCoSp"];
    for (const f of families) for (const l of ["B", 1, 2, 3, 4]) expect(hasCode(`${f}${l}`), `${f}${l}`).toBe(true);
  });

  it("carries the program component factors", () => {
    expect(SOV.programComponentFactors.men).toEqual({ shortProgram: 1.67, freeSkating: 3.33 });
    expect(SOV.programComponentFactors.women).toEqual({ shortProgram: 1.33, freeSkating: 2.67 });
  });
});
