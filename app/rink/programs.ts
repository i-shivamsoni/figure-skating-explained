import type { ViewerSpec } from "@/three/animation/catalog";

export interface MiniProgram {
  id: string;
  title: string;
  blurb: string;
  specs: ViewerSpec[];
}

/** Short sets the rink can perform in one go, so a visitor sees a protocol fill up and a total add up. */
export const MINI_PROGRAMS: MiniProgram[] = [
  {
    id: "short",
    title: "A short program, in miniature",
    blurb: "An Axel, a flying camel, a Lutz, a twizzle and a combination spin: five of the boxes a Senior short program must fill.",
    specs: [
      { kind: "jump", slug: "axel", rotations: 2 },
      { kind: "spin", code: "FCSp", features: { level: 4 } },
      { kind: "jump", slug: "lutz", rotations: 3 },
      { kind: "turn", id: "twizzle" },
      { kind: "spin", code: "CCoSp", features: { level: 4 } },
    ],
  },
  {
    id: "quads",
    title: "Four quads",
    blurb: "Toe loop, Salchow, flip and Lutz, all quadruple: the base values climb with the difficulty of the take-off.",
    specs: [
      { kind: "jump", slug: "toe-loop", rotations: 4 },
      { kind: "jump", slug: "salchow", rotations: 4 },
      { kind: "jump", slug: "flip", rotations: 4 },
      { kind: "jump", slug: "lutz", rotations: 4 },
    ],
  },
  {
    id: "pairs",
    title: "A pairs program",
    blurb: "The partner joins: a triple twist, a throw triple Lutz, a reverse lasso lift, a death spiral and a pair spin.",
    specs: [
      { kind: "pair", id: "3Tw" },
      { kind: "pair", id: "3LzTh" },
      { kind: "pair", id: "5RLi" },
      { kind: "pair", id: "FiDs" },
      { kind: "pair", id: "PCoSp" },
    ],
  },
];

/** Codes the hero's quick strip offers (every one resolves through specFromCode). */
export const QUICK_CODES = ["3A", "4Lz", "3F", "FCSp4", "CCoSp4", "twizzle", "5RLi"];
