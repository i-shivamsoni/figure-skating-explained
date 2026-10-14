import { describe, expect, it } from "vitest";
import { elementCode, type JumpElementSpec } from "@/lib/scoring/elements";
import { scoreElement, scoreJumpElement } from "@/lib/scoring/value";
import { trimmedMean, panelGoeValue } from "@/lib/scoring/panel";
import { fallDeduction, scoreProgram, secondHalfIndices } from "@/lib/scoring/program";
import { validateProgram } from "@/lib/scoring/validate";
import { decode } from "@/lib/decoder/parse";

const j = (jump: JumpElementSpec["jumps"][number]["jump"], rotations: number, extra: Partial<JumpElementSpec["jumps"][number]> = {}) => ({ jump, rotations, ...extra });
const solo = (jump: "T" | "S" | "Lo" | "F" | "Lz" | "A", rotations: number): JumpElementSpec => ({ kind: "jump", jumps: [j(jump, rotations)] });

describe("element codes", () => {
  it("builds protocol codes", () => {
    expect(elementCode({ kind: "jump", jumps: [j("Lz", 4), j("T", 3)] })).toBe("4Lz+3T");
    expect(elementCode({ kind: "jump", jumps: [j("A", 3), j("Eu", 1), j("S", 3)] })).toBe("3A+1Eu+3S");
    expect(elementCode({ kind: "jump", jumps: [j("T", 3), j("A", 2)], sequence: true })).toBe("3T+2A+SEQ");
    expect(elementCode({ kind: "jump", jumps: [j("Lz", 3, { rotationCall: "<<" }), j("T", 2, { noValue: true })], marker: { type: "COMBO", afterIndex: 0 } })).toBe("3Lz<<+COMBO+2T*");
    expect(elementCode({ kind: "jump", jumps: [j("F", 3, { edgeCall: "!", rotationCall: "q" })] })).toBe("3F!q");
    expect(elementCode({ kind: "spin", family: "FCCoSp", level: 4, v: true })).toBe("FCCoSp4V");
    expect(elementCode({ kind: "step", level: 3 })).toBe("StSq3");
  });
});

describe("element values", () => {
  it("adds base values in a combination and takes GOE from the hardest jump", () => {
    const s = scoreJumpElement({ kind: "jump", jumps: [j("Lz", 4), j("T", 3)] }, 3);
    expect(s.baseValue).toBe(15.7);
    expect(s.goeSourceCode).toBe("4Lz");
    expect(s.goeValue).toBe(3.45);
    expect(s.total).toBe(19.15);
  });
  it("uses the called code to find the hardest jump", () => {
    const s = scoreJumpElement({ kind: "jump", jumps: [j("T", 4, { rotationCall: "<" }), j("T", 3)] }, 1);
    expect(s.baseValue).toBe(11.8);
    expect(s.goeSourceCode).toBe("4T<");
    expect(s.goeValue).toBe(0.76);
  });
  it("applies the second-half factor to the base value only", () => {
    const s = scoreJumpElement(solo("T", 4), 2, { secondHalf: true });
    expect(s.factoredBase).toBe(10.45);
    expect(s.goeValue).toBe(1.9);
    expect(s.total).toBe(12.35);
  });
  it("applies +REP at 80%", () => {
    const s = scoreJumpElement({ ...solo("A", 3), rep: true }, 2);
    expect(s.factoredBase).toBe(6.4);
    expect(s.total).toBe(8.0);
  });
  it("gives the Euler no value but keeps the combination", () => {
    const s = scoreJumpElement({ kind: "jump", jumps: [j("Lz", 3), j("Eu", 1), j("S", 3)] }, 0);
    expect(s.baseValue).toBe(10.2);
    expect(s.goeSourceCode).toBe("3Lz");
  });
  it("ignores jumps marked *", () => {
    const s = scoreJumpElement({ kind: "jump", jumps: [j("Lz", 3, { rotationCall: "<<" }), j("T", 2, { noValue: true })], marker: { type: "COMBO", afterIndex: 0 } }, -5);
    expect(s.baseValue).toBe(2.1);
    expect(s.total).toBe(1.05);
  });
  it("scores spins, steps and choreographic elements", () => {
    expect(scoreElement({ kind: "spin", family: "CCoSp", level: 4, v: true }, 2).total).toBe(3.78);
    expect(scoreElement({ kind: "step", level: 4 }, 4).total).toBe(5.74);
    expect(scoreElement({ kind: "choreoSequence" }, 5).total).toBe(6.0);
    expect(scoreElement({ kind: "spin", family: "FCSp", level: 4, noValue: true }, 0).total).toBe(0);
  });
});

describe("panel maths", () => {
  it("trims the highest and lowest of five or more marks", () => {
    expect(trimmedMean([3, 3, 4, 2, 5, 3, 3, 4, 1])).toBe(3.14);
    expect(trimmedMean([2, 3, 4])).toBe(3);
  });
  it("averages numerical GOE values, not grades", () => {
    expect(panelGoeValue("4T", [3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(2.85);
    expect(panelGoeValue("4T", [5, 1, 3, 3, 3])).toBe(2.85);
  });
  it("escalates Senior fall deductions", () => {
    expect(fallDeduction("seniorMen", 0)).toBe(0);
    expect(fallDeduction("seniorMen", 2)).toBe(2);
    expect(fallDeduction("seniorMen", 3)).toBe(4);
    expect(fallDeduction("seniorMen", 5)).toBe(9);
    expect(fallDeduction("juniorWomen", 5)).toBe(5);
  });
});

describe("program scoring", () => {
  it("only the last three second-half jump elements get the Free Skating bonus", () => {
    const el = (secondHalf: boolean) => ({ spec: solo("T", 3), goe: 0, secondHalf });
    const elements = [el(false), el(true), el(true), el(true), el(true), { spec: { kind: "step" as const, level: 4 as const }, goe: 0, secondHalf: true }];
    expect([...secondHalfIndices("freeSkating", elements)]).toEqual([2, 3, 4]);
    expect([...secondHalfIndices("shortProgram", elements)]).toEqual([4]);
  });
  it("computes TES, PCS and the total for a Senior Men Free Skating", () => {
    const result = scoreProgram({
      segment: "freeSkating",
      category: "seniorMen",
      elements: [
        { spec: { kind: "jump", jumps: [j("Lz", 4), j("T", 3)] }, goe: 3 },
        { spec: solo("A", 3), goe: 2, secondHalf: true },
        { spec: { kind: "spin", family: "CCoSp", level: 4 }, goe: 3 },
      ],
      components: { composition: 9.0, presentation: 9.25, skatingSkills: 9.5 },
      falls: 1,
    });
    expect(result.elements[0].total).toBe(19.15);
    expect(result.elements[1].factoredBase).toBe(8.8);
    expect(result.elements[1].total).toBe(10.4);
    expect(result.elements[2].total).toBe(5.46);
    expect(result.tes).toBe(35.01);
    expect(result.pcs.factored).toEqual({ composition: 29.97, presentation: 30.8, skatingSkills: 31.64 });
    expect(result.pcs.total).toBe(92.41);
    expect(result.deductions.total).toBe(1);
    expect(result.total).toBe(126.42);
  });
});

describe("validation", () => {
  const spins = (fs = true) => [
    { kind: "spin" as const, family: fs ? "FCCoSp" : "CCoSp", level: 4 as const },
    { kind: "spin" as const, family: "FCSp", level: 4 as const },
  ];
  it("accepts a legal Senior Men Free Skating", () => {
    const w = validateProgram({
      segment: "freeSkating",
      category: "seniorMen",
      elements: [
        solo("Lz", 4),
        solo("S", 4),
        { kind: "jump", jumps: [j("T", 4), j("T", 3)] },
        solo("A", 3),
        { kind: "jump", jumps: [j("A", 3), j("Eu", 1), j("S", 3)] },
        solo("Lz", 3),
        ...spins(),
        { kind: "choreoSpin" },
        { kind: "step", level: 4 },
        { kind: "choreoSequence" },
      ],
    });
    expect(w.filter((x) => x.severity === "error")).toEqual([]);
  });
  it("flags the repetition rules", () => {
    const w = validateProgram({
      segment: "freeSkating",
      category: "seniorMen",
      elements: [solo("Lz", 4), solo("Lz", 4), solo("T", 4), { kind: "jump", jumps: [j("T", 4), j("T", 3)] }, solo("A", 3), solo("A", 3), ...spins(), { kind: "choreoSpin" }, { kind: "step", level: 4 }, { kind: "choreoSequence" }],
    });
    const msgs = w.map((x) => x.message).join("\n");
    expect(msgs).toMatch(/Only one quad or quint may be repeated/);
    expect(msgs).toMatch(/Only two triples, quads or quints may be repeated/);
    expect(msgs).toMatch(/triple Axel is repeated as a solo jump/);
  });
  it("flags too many jump elements, no Axel and bad combination structure", () => {
    const w = validateProgram({
      segment: "freeSkating",
      category: "juniorWomen",
      elements: [
        solo("Lz", 3), solo("F", 3), solo("Lo", 3), solo("S", 3), solo("T", 3), solo("T", 2), solo("T", 2),
        { kind: "jump", jumps: [j("Lz", 3), j("Eu", 1), j("S", 3)] },
        { kind: "jump", jumps: [j("T", 3), j("A", 2)], sequence: true },
        { kind: "jump", jumps: [j("Lo", 3), j("Eu", 1), j("F", 2)] },
        ...spins(), { kind: "choreoSpin" }, { kind: "step", level: 2 }, { kind: "choreoSequence" },
      ],
    });
    const msgs = w.map((x) => x.message).join("\n");
    expect(msgs).toMatch(/Maximum six jump elements/);
    expect(msgs).toMatch(/An Euler may be used only once/);
    expect(msgs).toMatch(/With a jump sequence, the combination may not use an Euler/);
    expect(msgs).toMatch(/At most two jump combinations/);
    expect(msgs).toMatch(/no step sequence in the Junior Free Skating/);
    expect(msgs).toMatch(/Toe loop: the same type of jump may appear at most three times/);
  });
  it("checks Short Program requirements", () => {
    const ok = validateProgram({
      segment: "shortProgram",
      category: "seniorMen",
      elements: [solo("A", 3), solo("Lz", 4), { kind: "jump", jumps: [j("T", 4), j("T", 3)] }, { kind: "spin", family: "FCSp", level: 4 }, { kind: "spin", family: "CSSp", level: 4 }, { kind: "spin", family: "CCoSp", level: 4 }, { kind: "step", level: 4 }],
    });
    expect(ok.filter((x) => x.severity === "error")).toEqual([]);
    const bad = validateProgram({
      segment: "shortProgram",
      category: "seniorWomen",
      elements: [solo("A", 2), solo("Lz", 3), { kind: "jump", jumps: [j("Lz", 3), j("T", 3)] }, { kind: "spin", family: "FCSp", level: 4 }, { kind: "spin", family: "CSp", level: 4 }, { kind: "spin", family: "FCCoSp", level: 4 }],
    });
    const msgs = bad.map((x) => x.message).join("\n");
    expect(msgs).toMatch(/needs one step sequence/);
    expect(msgs).toMatch(/appears both as the solo jump and in the combination/);
    expect(msgs).toMatch(/landing position must differ/);
    expect(msgs).toMatch(/no flying entry \(CCoSp\)/);
    const quad = validateProgram({ segment: "shortProgram", category: "seniorWomen", elements: [solo("A", 2), solo("T", 4), { kind: "jump", jumps: [j("Lz", 3), j("T", 3)] }, { kind: "spin", family: "FCSp", level: 4 }, { kind: "spin", family: "LSp", level: 4 }, { kind: "spin", family: "CCoSp", level: 4 }, { kind: "step", level: 4 }] });
    expect(quad.map((x) => x.message).join("\n")).toMatch(/Solo jump must be any triple jump/);
  });
});

describe("decoder", () => {
  it("decodes jump combinations", () => {
    const d = decode("4Lz+3T");
    expect(d.baseValue).toBe(15.7);
    expect(d.summary).toMatch(/quadruple Lutz \+ triple Toe loop/);
    expect(d.errors).toEqual([]);
  });
  it("decodes signs", () => {
    const d = decode("3F!q");
    expect(d.baseValue).toBe(5.3);
    expect(d.parts[0].description).toMatch(/unclear take-off edge/);
    expect(d.parts[0].description).toMatch(/quarter short/);
    expect(decode("3Lz<").baseValue).toBe(4.72);
    expect(decode("3A").parts[0].description).toMatch(/3.5 revolutions/);
  });
  it("decodes Euler combinations, sequences, REP and COMBO", () => {
    expect(decode("2A+1Eu+3S").baseValue).toBe(7.6);
    expect(decode("3T+2A+SEQ").baseValue).toBe(7.5);
    expect(decode("3A+REP").baseValue).toBe(6.4);
    expect(decode("3Lz<<+COMBO+2T*").baseValue).toBe(2.1);
  });
  it("decodes spins, steps and choreographic elements", () => {
    const s = decode("FCCoSp4V");
    expect(s.baseValue).toBe(3.15);
    expect(s.summary).toMatch(/Flying change-foot combination spin level 4 with reduced value/);
    expect(decode("StSq3").baseValue).toBe(3.5);
    expect(decode("ChSq1").baseValue).toBe(3.5);
    expect(decode("LSp4").summary).toMatch(/Layback spin level 4/);
  });
  it("reports unknown codes", () => {
    expect(decode("5A").errors.length).toBeGreaterThan(0);
    expect(decode("hello").errors.length).toBeGreaterThan(0);
  });
});

describe("pairs", () => {
  const pairCode = (code: string) => ({ kind: "code" as const, code });
  it("values the pair codes from the Scale of Values and takes the second-half bonus on throws only", () => {
    expect(scoreElement(pairCode("5RLi4"), 0).baseValue).toBe(7.0);
    expect(scoreElement(pairCode("3Tw3"), 0).baseValue).toBe(5.7);
    expect(scoreElement(pairCode("3LzTh"), 2).total).toBeCloseTo(5.3 + 1.06, 2);
    expect(scoreElement(pairCode("3LzTh"), 0, { secondHalf: true }).factoredBase).toBeCloseTo(5.83, 2);
    expect(scoreElement(pairCode("5RLi4"), 0, { secondHalf: true }).factoredBase).toBe(7.0);
    expect(elementCode({ kind: "code", code: "FiDs4", noValue: true })).toBe("FiDs4*");
    expect(() => scoreElement(pairCode("9Li4"), 0)).toThrow();
  });
  it("uses the pairs component factors and the pairs fall rule", () => {
    const res = scoreProgram({
      segment: "freeSkating",
      category: "seniorPairs",
      elements: [
        { spec: pairCode("3Tw3"), goe: 0 },
        { spec: pairCode("3LoTh"), goe: 0, secondHalf: true },
        { spec: { kind: "jump", jumps: [{ jump: "S", rotations: 3 }] }, goe: 0, secondHalf: true },
      ],
      components: { composition: 8, presentation: 8, skatingSkills: 8 },
      falls: 1,
      fallsBoth: 1,
    });
    expect(res.pcs.factor).toBe(2.67);
    expect(res.pcs.total).toBeCloseTo(3 * 8 * 2.67, 2);
    expect(res.deductions.falls).toBe(3);
    expect(res.elements[1].secondHalf).toBe(true);
    expect(res.elements[2].secondHalf).toBe(true);
    expect(fallDeduction("juniorPairs", 2, 0)).toBe(2);
    expect(fallDeduction("seniorPairs", 0, 2)).toBe(4);
    expect(scoreProgram({ segment: "shortProgram", category: "juniorPairs", elements: [], components: { composition: 5, presentation: 5, skatingSkills: 5 } }).pcs.factor).toBe(1.33);
  });
  it("checks the pair Short Program boxes and the Free Skating limits", () => {
    const sp = validateProgram({
      segment: "shortProgram",
      category: "seniorPairs",
      elements: [pairCode("4Li4"), pairCode("3Tw3"), pairCode("3LoTh"), { kind: "jump", jumps: [{ jump: "T", rotations: 3 }] }, pairCode("PCoSp4"), pairCode("BoDs4"), { kind: "step", level: 3 }],
    });
    expect(sp.some((w) => /Group 3/.test(w.message))).toBe(true);
    expect(sp.some((w) => /forward inside death spiral/.test(w.message))).toBe(true);
    expect(sp.some((w) => /missing/.test(w.message))).toBe(false);
    const missing = validateProgram({ segment: "shortProgram", category: "seniorPairs", elements: [pairCode("3Li4")] });
    expect(missing.filter((w) => /missing/.test(w.message)).length).toBe(6);
    const fs = validateProgram({
      segment: "freeSkating",
      category: "seniorPairs",
      elements: [pairCode("5RLi4"), pairCode("5ALi4"), pairCode("3LzTh"), pairCode("3FTh"), { kind: "jump", jumps: [{ jump: "T", rotations: 3 }, { jump: "T", rotations: 2 }, { jump: "Lo", rotations: 2 }] }, { kind: "jump", jumps: [{ jump: "T", rotations: 3 }] }, { kind: "choreoSequence" }],
    });
    expect(fs.some((w) => /Group 5/.test(w.message))).toBe(true);
    expect(fs.some((w) => /same throw/.test(w.message))).toBe(true);
    expect(fs.some((w) => /two jumps/.test(w.message))).toBe(true);
    expect(fs.some((w) => /different names/.test(w.message))).toBe(true);
    expect(fs.some((w) => /no choreographic sequence/.test(w.message))).toBe(true);
    const clean = validateProgram({
      segment: "freeSkating",
      category: "seniorPairs",
      elements: [pairCode("5RLi4"), pairCode("3Li4"), pairCode("ChPLi1"), pairCode("3Tw3"), pairCode("3LzTh"), pairCode("3LoTh"), { kind: "jump", jumps: [{ jump: "S", rotations: 3 }] }, { kind: "jump", jumps: [{ jump: "T", rotations: 3 }, { jump: "T", rotations: 2 }] }, pairCode("PCoSp4"), pairCode("FiDs4"), pairCode("ChPSp1")],
    });
    expect(clean).toEqual([]);
  });
});
