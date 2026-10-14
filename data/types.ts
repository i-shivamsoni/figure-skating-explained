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

/* ---------------- Pair Skating (data/pairs.ts) ---------------- */

export type PairCategory = "seniorPairs" | "juniorPairs";

export type PairElementId =
  | "lift"
  | "twist"
  | "throw"
  | "deathSpiral"
  | "pairSpinCombination"
  | "pairSpin"
  | "soloSpinCombination"
  | "soloJump"
  | "stepSequence"
  | "choreoPairLift"
  | "choreoPairSpin"
  | "choreoSequence"
  | "pivotFigure";

/** An element code as printed in a protocol, how to read it, and its base value in the 2026-27 Scale of Values. */
export interface CodeExample {
  code: string;
  reading: string;
  baseValue: number;
}

/** Base values of one code family by level (B = Basic). */
export type LevelValues = { B: number; 1: number; 2: number; 3: number; 4: number };

export interface PairElementFamily {
  id: PairElementId;
  name: string;
  /** The code family as the Scale of Values prints it. */
  codeFamily: string;
  howToRead: string;
  examples: CodeExample[];
  definition: string;
  /** Where the ISU defines the element. */
  definedIn: SourceRef;
  usage: { shortProgram: string; freeSkating: string };
  sources: SourceRef[];
}

export interface LiftType {
  code: "5T" | "5S" | "5A" | "5B" | "5R";
  sovPrefix: "5TLi" | "5SLi" | "5ALi" | "5BLi" | "5RLi";
  name: string;
  /** How the technical panel identifies the type from the woman's take-off. */
  takeOff: string;
  baseValues: LevelValues;
}

export interface LiftGroup {
  group: 1 | 2 | 3 | 4 | 5;
  sovPrefix: string;
  name: string;
  hold: string;
  identification: string;
  /** Groups 1-4; Group 5 carries its values per type. */
  baseValues?: LevelValues;
  types?: LiftType[];
  sources: SourceRef[];
}

export interface LiftPosition {
  id: "upright" | "star" | "platter";
  name: string;
  definition: string;
}

export interface PairLevelFeature {
  number: number;
  name: string;
  detail: string;
  senior?: string;
  junior?: string;
  countsOncePerProgram?: boolean;
  freeSkatingOnly?: boolean;
}

export interface RuleNote {
  title: string;
  rule: string;
  sources: SourceRef[];
}

export interface DeathSpiralType {
  code: "BoDs" | "FiDs" | "BiDs" | "FoDs";
  name: string;
  manEdge: string;
  womanEdge: string;
  womanLean: string;
  baseValues: LevelValues;
  /** Season in which Rule 620 prescribes it for the Short Program, if any. */
  prescribedShortProgram?: string;
}

export interface PairProgramSpec {
  segment: Segment;
  category: PairCategory;
  season: string;
  durationSeconds: number;
  elements: ElementRequirement[];
  notes: string[];
  sources: SourceRef[];
}

export type PairGoeElementType =
  | "lift"
  | "twist"
  | "jump"
  | "throw"
  | "soloSpin"
  | "pairSpin"
  | "deathSpiral"
  | "step"
  | "choreoSequence"
  | "choreoPairLift"
  | "choreoPairSpin";

export interface PairGoeGuideline {
  elementType: PairGoeElementType;
  name: string;
  positive: GoeBullet[];
  reductions: GoeReduction[];
  notes?: string[];
  sources: SourceRef[];
}

/** One row of the "elements with no value or maximum Level" table at the end of the pairs handbook. */
export interface PairMaxLevelRow {
  section: string;
  problem: string;
  maxLevelShortProgram: string;
  maxLevelFreeSkating: string;
}
