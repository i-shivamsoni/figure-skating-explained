/** Shared content types. All rule text is paraphrased from the ISU documents listed in data/sources.ts. */

export type Discipline = "singles" | "pairs";
export type Segment = "shortProgram" | "freeSkating";
export type Category = "seniorMen" | "seniorWomen" | "juniorMen" | "juniorWomen";
export type Edge = "outside" | "inside";
export type Direction = "forward" | "backward";
export type Foot = "left" | "right";

/** A reference back to one of the ISU documents (id matches data/sources.ts). */
export interface SourceRef {
  doc: "rules2026" | "tpSingles" | "tpPairs" | "refJudges" | "sov2786" | "comm2788" | "pcsChart" | "pcsCriteria" | "thinkingWords" | "deductionsChart";
  where?: string; // rule number, section or page
}

export type JumpId = "T" | "S" | "Lo" | "F" | "Lz" | "A" | "Eu";

export interface JumpType {
  id: JumpId;
  slug: string;
  name: string;
  aliases?: string[];
  listed: boolean;
  /** Order of difficulty as the ISU lists it (Rule 504): T < S < Lo < F < Lz < A. */
  difficultyRank: number;
  /** Described for a counter-clockwise rotating skater; clockwise skaters mirror the feet. */
  takeOff: { foot: Foot; edge: Edge; direction: Direction; toePick: boolean; toePickFoot?: Foot };
  landing: { foot: Foot; edge: Edge; direction: Direction };
  /** Axel takes off forward, so each "n-rotation" Axel has n + 0.5 revolutions. */
  extraHalfRevolution: boolean;
  /** Rotation counts that exist in the 2026-27 Scale of Values. */
  rotations: number[];
  summary: string;
  mechanics: string[];
  howToSpot: string[];
  commonErrors: string[];
  sources: SourceRef[];
}

export interface JumpSign {
  sign: "q" | "<" | "<<" | "e" | "!" | "b" | "REP" | "COMBO" | "SEQ" | "*";
  name: string;
  meaning: string;
  baseValueEffect: string;
  goeEffect: string;
  appliesTo: string;
  sources: SourceRef[];
}

export interface SpinPosition {
  id: "camel" | "sit" | "upright" | "layback" | "sideways" | "biellmann";
  name: string;
  basic: boolean;
  /** For the SOV letter in spin codes: U, L, C, S. */
  codeLetter?: "U" | "L" | "C" | "S";
  definition: string;
  notes?: string[];
}

export interface SpinVariationCategory {
  id: "CF" | "CS" | "CU" | "SF" | "SS" | "SB" | "UF" | "US" | "UB" | "UL";
  position: SpinPosition["id"];
  name: string;
  definition: string;
}

export interface LevelFeature {
  number: number;
  name: string;
  detail: string;
  countsOncePerProgram?: boolean;
  mandatoryForLevel4?: boolean;
}

export interface SpinFamily {
  code: string;
  name: string;
  description: string;
  flying: boolean;
  changeOfFoot: boolean;
  combination: boolean;
  position?: SpinPosition["codeLetter"];
  /** Which programs may use it and in what role. */
  usage: string[];
}

export interface TurnOrStep {
  id: string;
  name: string;
  kind: "turn" | "step";
  difficult: boolean;
  definition: string;
  tracing: string; // what the blade draws on the ice
}

export interface ElementRequirement {
  slot: string;
  requirement: string;
  notes?: string[];
}

export interface ProgramSpec {
  segment: Segment;
  category: Category;
  durationSeconds: number;
  elements: ElementRequirement[];
  notes: string[];
  sources: SourceRef[];
}

export interface GoeBullet {
  text: string;
  /** The first two bullets of each element type must be present for a starting GOE of +4 or +5. */
  requiredForHighGoe: boolean;
}

export interface GoeReduction {
  error: string;
  range: string; // e.g. "-1 to -3" or "-5"
  capsStartingGoeAtPlusTwo: boolean;
  note?: string;
}

export interface GoeGuideline {
  elementType: "jump" | "spin" | "step" | "choreoSequence" | "choreoSpin";
  name: string;
  positive: GoeBullet[];
  reductions: GoeReduction[];
}

export interface ProgramComponent {
  id: "composition" | "presentation" | "skatingSkills";
  name: string;
  focus: string;
  definition: string;
  criteria: { name: string; explanation: string; pairsOnly?: boolean }[];
}

export interface Deduction {
  violation: string;
  points: string;
  responsible: string;
  rule: string;
}

export interface GlossaryEntry {
  term: string;
  meaning: string;
  example?: string;
}

export interface SourceDoc {
  id: SourceRef["doc"];
  title: string;
  publisher: string;
  date: string;
  url: string;
  localFile: string;
  usedFor: string;
}
