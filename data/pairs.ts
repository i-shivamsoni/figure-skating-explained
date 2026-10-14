import type {
  DeathSpiralType,
  LevelValues,
  LiftGroup,
  LiftPosition,
  PairCategory,
  PairElementFamily,
  PairGoeGuideline,
  PairLevelFeature,
  PairMaxLevelRow,
  PairProgramSpec,
  RuleNote,
  SourceRef,
} from "./types";

/**
 * Pair Skating for the 2026-27 season. Rule text is paraphrased from Rules 619-621 of the ISU Special
 * Regulations & Technical Rules 2026, the Technical Panel Handbook Pair Skating 2026-27 and ISU
 * Communication 2788; base values are copied from Communication 2786 (data/sov-2026-27.json).
 * "Man" and "woman" follow the wording of the rules: the man lifts, throws and pivots.
 */

const tp = (where: string): SourceRef => ({ doc: "tpPairs", where });
const rule = (where: string): SourceRef => ({ doc: "rules2026", where });
const comm = (where: string): SourceRef => ({ doc: "comm2788", where });
const sov: SourceRef = { doc: "sov2786" };

export const PAIR_CATEGORY_LABELS: Record<PairCategory, string> = {
  seniorPairs: "Senior Pairs",
  juniorPairs: "Junior Pairs",
};

/** Rule 502: seconds, with ±10 s allowed before time deductions start. */
export const PAIR_DURATIONS = {
  shortProgram: 160,
  freeSkating: { senior: 240, junior: 210 },
  sources: [rule("Rule 502")],
};

/** Communication 2786, program component factors for Pairs. */
export const PAIR_PCS_FACTORS = { shortProgram: 1.33, freeSkating: 2.67, sources: [sov] };

/** Communication 2788, Levels of Difficulty, Pair Skating: the same scale for every levelled pair element. */
export const PAIR_LEVEL_SCALE = {
  rule: "One feature gives Level 1, two Level 2, three Level 3, four Level 4; no feature is Basic. The pair receives the lower level achieved by the two partners.",
  sources: [comm("I, Levels of Difficulty, Pair Skating"), tp("Elements with no value or maximum Level")],
};

/* ------------------------------------------------------------------ */
/* 1. Element families and how their codes are read                     */
/* ------------------------------------------------------------------ */

export const PAIR_ELEMENT_FAMILIES: PairElementFamily[] = [
  {
    id: "lift",
    name: "Lift (Groups 1 to 5)",
    codeFamily: "1Li, 2Li, 3Li, 4Li, 5TLi, 5SLi, 5ALi, 5BLi, 5RLi + level B/1-4",
    howToRead:
      "Group number, a take-off letter for Group 5 only (T toe, S step, A Axel, B backward, R reverse), 'Li', then the level: 5RLi4 is a Group 5 reverse lasso lift at Level 4 and 3Li2 a Group 3 hip lift at Level 2.",
    examples: [
      { code: "5RLi4", reading: "Group 5 reverse lasso lift, Level 4", baseValue: 7.0 },
      { code: "5ALi3", reading: "Group 5 Axel lasso lift, Level 3", baseValue: 6.6 },
      { code: "5TLi4", reading: "Group 5 toe lasso lift, Level 4", baseValue: 6.2 },
      { code: "3Li4", reading: "Group 3 hip lift, Level 4 (the 2026-27 Short Program lift)", baseValue: 5.1 },
      { code: "4LiB", reading: "Group 4 hand-to-hand press lift, Basic level", baseValue: 3.5 },
    ],
    definition:
      "An overhead lift: the man raises the woman with fully extended arm(s) (mandatory in Groups 3 to 5) and turns at least one revolution. Partners may assist each other only hand to hand, hand to arm, hand to body or hand to the upper part of the leg above the knee. The group is decided by the hold at the moment the woman passes the top of the man's head.",
    definedIn: rule("Rule 619, Lifts"),
    usage: {
      shortProgram: "One lift with the prescribed take-off: any hip lift take-off (Group 3) in 2026-27. It may include a carry.",
      freeSkating:
        "Senior: at most two levelled lifts, not both from the same group, plus one choreographic pair lift. Junior: at most two lifts, not both from the same group. All lifts must have different codes.",
    },
    sources: [rule("Rules 619-621"), tp("Lifts"), sov],
  },
  {
    id: "twist",
    name: "Twist lift",
    codeFamily: "1Tw to 4Tw + level B/1-4, each with a << row",
    howToRead:
      "The number of revolutions the woman turns freely in the air, 'Tw', then the level: 3Tw3 is a triple twist at Level 3. A landing cheated by half a revolution or more adds << and the twist is paid as one revolution less (3Tw3<< is worth 2Tw3).",
    examples: [
      { code: "3Tw3", reading: "Triple twist, Level 3", baseValue: 5.7 },
      { code: "3Tw4", reading: "Triple twist, Level 4", baseValue: 6.0 },
      { code: "4Tw4", reading: "Quadruple twist, Level 4", baseValue: 8.0 },
      { code: "2Tw2", reading: "Double twist, Level 2", baseValue: 3.0 },
      { code: "3Tw3<<", reading: "Triple twist attempt downgraded: paid as a double twist at Level 3", baseValue: 3.2 },
    ],
    definition:
      "The man throws the woman straight up, she rotates freely in the air, and he must catch her at the waist before she lands and assist her to a smooth landing on one foot.",
    definedIn: rule("Rule 619, Twist lifts"),
    usage: {
      shortProgram: "One twist lift, double or triple, with a Lutz or Flip take-off by the woman.",
      freeSkating: "One twist lift; any number of revolutions and a Lutz, Flip, toe loop or Axel take-off.",
    },
    sources: [rule("Rules 619-621"), tp("Twist Lift"), sov],
  },
  {
    id: "throw",
    name: "Throw jump",
    codeFamily: "1TTh to 4LzTh and 1ATh to 3ATh, each with q, < and << rows",
    howToRead: "Revolutions, the jump name, then 'Th': 3LzTh is a throw triple Lutz. The signs q, < and << follow the code exactly as for solo jumps.",
    examples: [
      { code: "3LzTh", reading: "Throw triple Lutz", baseValue: 5.3 },
      { code: "3FTh", reading: "Throw triple Flip (same value as the Lutz, and the same throw for repetition purposes)", baseValue: 5.3 },
      { code: "3LoTh", reading: "Throw triple loop (the 2026-27 Junior Short Program throw, double or triple)", baseValue: 5.0 },
      { code: "4STh", reading: "Throw quadruple Salchow", baseValue: 6.5 },
      { code: "3ATh", reading: "Throw triple Axel", baseValue: 6.0 },
      { code: "3LzTh<", reading: "Throw triple Lutz under-rotated: the '<' row is 75% of the clean throw", baseValue: 3.98 },
      { code: "3LzTh<<", reading: "Throw triple Lutz downgraded: paid as the throw double Lutz", baseValue: 3.0 },
    ],
    definition: "A partner-assisted jump: the man throws the woman into the air on the take-off and she lands on a backward outside edge without his help.",
    definedIn: rule("Rule 619, Throw jumps"),
    usage: {
      shortProgram: "One throw jump: Senior any double or triple; Junior a double or triple loop in 2026-27.",
      freeSkating: "At most two different throw jumps (different name and/or number of revolutions); throw Flip and throw Lutz count as the same throw.",
    },
    sources: [rule("Rules 619-621"), tp("Throw Jumps"), sov],
  },
  {
    id: "deathSpiral",
    name: "Death spiral",
    codeFamily: "BoDs, FiDs, BiDs, FoDs + level B/1-4 (Advanced Novice bonus rows carry a b)",
    howToRead: "The woman's edge: B or F for backward or forward, o or i for outside or inside, then 'Ds' and the level: FiDs3 is a forward inside death spiral at Level 3.",
    examples: [
      { code: "FiDs3", reading: "Forward inside death spiral, Level 3 (the 2026-27 Short Program death spiral)", baseValue: 3.5 },
      { code: "FiDs4", reading: "Forward inside death spiral, Level 4", baseValue: 3.8 },
      { code: "BoDs4", reading: "Backward outside death spiral, Level 4", baseValue: 4.8 },
      { code: "BiDs4", reading: "Backward inside death spiral, Level 4", baseValue: 4.0 },
      { code: "FoDs4", reading: "Forward outside death spiral, Level 4 (the highest valued)", baseValue: 5.1 },
    ],
    definition:
      "The man anchors a toe pick in the ice and pivots with both knees clearly bent and his holding arm fully extended; the woman circles around him on one clean edge, stretched toward the ice with her head close to the surface, supported only by the force of her edge and his hand. Both hold the position for at least one revolution.",
    definedIn: rule("Rule 619, Death Spirals"),
    usage: {
      shortProgram: "Only the prescribed death spiral: forward inside in 2026-27, with the man in the traditional backward outside pivot.",
      freeSkating: "One death spiral; for Seniors a different type from the Short Program one. Arm holds and a forward or backward pivot may vary.",
    },
    sources: [rule("Rules 619-621"), tp("Death Spiral"), sov],
  },
  {
    id: "pairSpinCombination",
    name: "Pair spin combination",
    codeFamily: "PCoSp + level B/1-4, with V rows",
    howToRead: "PCoSp then the level; V marks a combination with only two basic positions, or a change of foot without three revolutions on one side: PCoSp4V.",
    examples: [
      { code: "PCoSp4", reading: "Pair spin combination, Level 4", baseValue: 5.0 },
      { code: "PCoSp4V", reading: "Pair spin combination, Level 4, reduced value", baseValue: 3.75 },
      { code: "PCoSpB", reading: "Pair spin combination, Basic level", baseValue: 2.8 },
    ],
    definition:
      "Both partners spin in hold around a common axis with at least one change of foot and one change of position by each partner, and at least two different basic positions held for two revolutions by both (all three for full value).",
    definedIn: rule("Rule 620, paragraph 4 f)"),
    usage: {
      shortProgram: "Required in 2026-27 (and again in 2028-29); minimum eight revolutions counted from entry to exit.",
      freeSkating: "Not part of the 2026-27 Senior or Junior well-balanced program; the only Free Skating spin is the choreographic pair spin.",
    },
    sources: [rule("Rule 620"), tp("Pair Spin Combination"), sov],
  },
  {
    id: "pairSpin",
    name: "Pair spin (Novice)",
    codeFamily: "PSp + level B/1-4",
    howToRead: "PSp then the level: PSp3.",
    examples: [{ code: "PSp4", reading: "Pair spin, Level 4", baseValue: 3.9 }],
    definition: "The Novice pair spin: a pair spin without the change of foot and change of position that a pair spin combination requires. It shares the combination's level features.",
    definedIn: tp("Pair Spin Combination / Pair Spin (Novice)"),
    usage: {
      shortProgram: "Not a Senior or Junior element; in the Senior and Junior Short Program a pair spin combination without a change of foot or position has no value.",
      freeSkating: "Not a Senior or Junior element.",
    },
    sources: [tp("Pair Spin Combination"), rule("Rule 620, paragraph 4 f)"), sov],
  },
  {
    id: "soloSpinCombination",
    name: "Solo spin combination (side by side)",
    codeFamily: "CoSp, CCoSp, FCoSp, FCCoSp + level B/1-4, with V rows (the singles codes)",
    howToRead: "Read exactly as a singles spin: CCoSp3 is a side-by-side combination spin with change of foot at Level 3; the pair receives the lower level of the two partners.",
    examples: [
      { code: "CCoSp4", reading: "Side-by-side combination spin with change of foot, Level 4", baseValue: 4.2 },
      { code: "CCoSp3V", reading: "Side-by-side combination spin with only two basic positions, Level 3", baseValue: 2.7 },
    ],
    definition:
      "Both partners perform the same spin combination at the same time: at least two different basic positions with two revolutions each by both partners, all three for full value. Every level feature must be done by both skaters at the same moment.",
    definedIn: rule("Rule 620, paragraph 4 e)"),
    usage: {
      shortProgram: "Not in the 2026-27 Short Program; prescribed for 2027-28 with only one change of foot and at least five revolutions on each foot by both partners.",
      freeSkating: "Not in the Senior or Junior well-balanced program.",
    },
    sources: [rule("Rule 620"), tp("Solo Spin Combination"), sov],
  },
  {
    id: "soloJump",
    name: "Solo jump, jump combination and jump sequence (side by side)",
    codeFamily: "The singles jump codes (3T, 3S, 3Lo, 3F, 3Lz, 2A, 3A ...) with q, <, <<, e, !, +COMBO, +SEQ and +REP",
    howToRead:
      "The same code as in singles, called once for the pair. With unequal revolutions the jump with fewer revolutions is called; 3T+2T is a two-jump combination and 3T+2A+SEQ a jump sequence.",
    examples: [
      { code: "3T", reading: "Side-by-side triple toe loop", baseValue: 4.2 },
      { code: "2A", reading: "Side-by-side double Axel (one of the two 2026-27 Junior Short Program options)", baseValue: 3.3 },
      { code: "2Lz", reading: "Side-by-side double Lutz (the other 2026-27 Junior Short Program option)", baseValue: 2.1 },
      { code: "3S<", reading: "Side-by-side triple Salchow under-rotated (80% of the clean jump)", baseValue: 3.44 },
    ],
    definition: "Both partners jump the same jump side by side; the technical panel calls one element for the pair and both partners must meet the singles jump requirements.",
    definedIn: rule("Rule 619, Solo jumps, jump combinations and jump sequences"),
    usage: {
      shortProgram: "One solo jump: Senior any double or triple; Junior a double Lutz or double Axel in 2026-27.",
      freeSkating: "At most one solo jump and one jump combination or jump sequence of two jumps.",
    },
    sources: [rule("Rules 619-621"), tp("Jump Elements"), comm("I, Jump elements"), sov],
  },
  {
    id: "stepSequence",
    name: "Step sequence",
    codeFamily: "StSq + level B/1-4",
    howToRead: "StSq then the level: StSq3. One call for the pair, at the lower level of the two partners.",
    examples: [
      { code: "StSq4", reading: "Step sequence, Level 4", baseValue: 4.1 },
      { code: "StSqB", reading: "Step sequence, Basic level", baseValue: 1.6 },
    ],
    definition:
      "Steps and turns skated together or close together, fully using the ice surface, with the workload shared evenly; changing places or holds and difficult skating moves done together are credited. Unlisted jumps may be included and short stops to the music are allowed.",
    definedIn: rule("Rule 619, Step sequences"),
    usage: { shortProgram: "Required every season.", freeSkating: "There is no step sequence in the pair Free Skating." },
    sources: [rule("Rules 619-620"), tp("Step Sequence"), sov],
  },
  {
    id: "choreoPairLift",
    name: "Choreographic pair lift",
    codeFamily: "ChPLi1",
    howToRead: "A fixed code with a fixed base value; the judges score it in GOE with steps of 0.50.",
    examples: [{ code: "ChPLi1", reading: "Choreographic pair lift, confirmed", baseValue: 4.5 }],
    definition:
      "A lift that enhances the choreography: ascending and descending while travelling across the ice, at least one rotation, any hold, with the lifting partner's arm(s) straight or almost straight above the head at some point.",
    definedIn: rule("Rule 621, Choreographic Pair lift"),
    usage: {
      shortProgram: "Not in the Short Program.",
      freeSkating: "Senior Free Skating only, at most one. If the panel cannot identify it, the third lift performed becomes the choreographic pair lift.",
    },
    sources: [rule("Rule 621"), tp("Choreographic Pair Lift"), comm("I, Choreographic Elements"), sov],
  },
  {
    id: "choreoPairSpin",
    name: "Choreographic pair spin",
    codeFamily: "ChPSp1",
    howToRead: "A fixed code with a fixed base value; the judges score it in GOE with steps of 0.50.",
    examples: [{ code: "ChPSp1", reading: "Choreographic pair spin, confirmed", baseValue: 3.5 }],
    definition:
      "A spin that enhances the choreography: at least three consecutive revolutions on one or two blades by at least one partner, in any basic or non-basic position, with optional changes of foot and optional lifting of a partner no higher than shoulder level on extended arms.",
    definedIn: rule("Rule 621, Choreographic Pair Spin"),
    usage: { shortProgram: "Not in the Short Program.", freeSkating: "Senior and Junior Free Skating, at most one; it is the only spin of the 2026-27 well-balanced program." },
    sources: [rule("Rule 621"), tp("Choreographic Pair Spin"), sov],
  },
  {
    id: "choreoSequence",
    name: "Choreographic sequence",
    codeFamily: "ChSq1",
    howToRead: "A fixed code with a fixed base value.",
    examples: [{ code: "ChSq1", reading: "Choreographic sequence, confirmed", baseValue: 3.5 }],
    definition:
      "At least two different skating movements by both partners (spirals, spread eagles, Ina Bauers, hydroblading, jumps of up to two revolutions, spins, small lifts) linked by steps and turns.",
    definedIn: rule("Rule 621, Choreographic Sequences"),
    usage: { shortProgram: "Not in the Short Program.", freeSkating: "Not included in the Junior or Senior Free Skating in 2026-27." },
    sources: [rule("Rule 621"), tp("Choreographic Sequence"), sov],
  },
  {
    id: "pivotFigure",
    name: "Pivot figure (Novice)",
    codeFamily: "PiF1",
    howToRead: "A single code with one value.",
    examples: [{ code: "PiF1", reading: "Pivot figure", baseValue: 2.2 }],
    definition: "The man pivots while holding the woman hand to hand; she follows him in a spiral, spread eagle or extended-leg position. The Novice forerunner of the death spiral.",
    definedIn: tp("Death Spiral / Pivot Figure (Novice)"),
    usage: { shortProgram: "Novice only.", freeSkating: "Novice only." },
    sources: [tp("Death Spiral / Pivot Figure (Novice)"), sov],
  },
];

export const PAIR_ELEMENT_BY_ID = Object.fromEntries(PAIR_ELEMENT_FAMILIES.map((f) => [f.id, f])) as Record<PairElementFamily["id"], PairElementFamily>;

/* ------------------------------------------------------------------ */
/* 2. Lifts                                                             */
/* ------------------------------------------------------------------ */

const GROUP_5_LOW: LevelValues = { B: 4.6, 1: 5.0, 2: 5.4, 3: 5.8, 4: 6.2 };
const GROUP_5_HIGH: LevelValues = { B: 5.4, 1: 5.8, 2: 6.2, 3: 6.6, 4: 7.0 };

/** Rule 619 and the Technical Panel Handbook, Lifts: Identifying the lift Group. */
export const LIFT_GROUPS: LiftGroup[] = [
  {
    group: 1,
    sovPrefix: "1Li",
    name: "Armpit hold",
    hold: "Hand to armpit, hand to arm, hand to waist or hand to hand, with the woman's head up and her body lower than the man's shoulder.",
    identification:
      "Full arm extension is not required, so the group is not read at the top of the man's head: it is the lift in which the woman's head stays up and she stays below his shoulder. At Junior and Senior level Group 1 lifts done without full extension are choreography and are not called.",
    baseValues: { B: 1.4, 1: 1.5, 2: 1.7, 3: 1.9, 4: 2.1 },
    sources: [rule("Rule 619, Lifts"), tp("Lifts: Group 1 Lift"), sov],
  },
  {
    group: 2,
    sovPrefix: "2Li",
    name: "Waist hold",
    hold: "Hand to waist.",
    identification:
      "A waist hold with the woman vertical, head up, facing either direction and no other variation. Any other position of the woman from a waist take-off makes it a Group 3 lift. Group 2 lifts without full extension are likewise not called at Junior and Senior level.",
    baseValues: { B: 1.5, 1: 1.9, 2: 2.3, 3: 2.7, 4: 3.1 },
    sources: [rule("Rule 619, Lifts"), tp("Lifts: Group 2 Lift"), sov],
  },
  {
    group: 3,
    sovPrefix: "3Li",
    name: "Hip lift",
    hold: "Hand to hip or to the upper part of the leg including the buttocks, above the knee.",
    identification: "Read from the hold at the moment the woman passes the top of the man's head; full extension of the lifting arm(s) is mandatory. The prescribed Short Program take-off for 2026-27.",
    baseValues: { B: 3.5, 1: 3.9, 2: 4.3, 3: 4.7, 4: 5.1 },
    sources: [rule("Rule 619, Lifts"), tp("Lifts: Group 3 Lifts"), sov],
  },
  {
    group: 4,
    sovPrefix: "4Li",
    name: "Hand-to-hand press lift",
    hold: "Hand to hand or hand to arm.",
    identification:
      "A hand-to-hand lift in which the woman does not rotate around the man during the lifting process; she can only rotate together with him. A lasso in which the man's hand drops below his shoulders while lifting is also called Group 4.",
    baseValues: { B: 3.5, 1: 3.9, 2: 4.3, 3: 4.7, 4: 5.1 },
    sources: [rule("Rule 619, Lifts"), tp("Lifts: Group 4 Lift"), sov],
  },
  {
    group: 5,
    sovPrefix: "5TLi, 5SLi, 5ALi, 5BLi, 5RLi",
    name: "Lasso lift",
    hold: "Hand to hand.",
    identification:
      "The woman rotates around the man, visibly through her shoulders and/or hips, between the take-off and the fully extended position, and one of his hands stays clearly above his shoulders throughout the lifting process. The type is read from her take-off, the partners' relative position at that moment and the hand grip.",
    types: [
      {
        code: "5T",
        sovPrefix: "5TLi",
        name: "Toe lasso",
        takeOff: "Partners face to face, the man skating forward and the woman backward; he holds her left hand in his left and her right in his right; she jumps from her toe pick.",
        baseValues: GROUP_5_LOW,
      },
      {
        code: "5S",
        sovPrefix: "5SLi",
        name: "Step lasso",
        takeOff: "Partners face to face, the man skating backward and the woman forward, same-hand grip (left to left, right to right); she jumps from a forward edge.",
        baseValues: GROUP_5_LOW,
      },
      {
        code: "5A",
        sovPrefix: "5ALi",
        name: "Axel lasso",
        takeOff: "The woman is at the man's side; he skates forward, sometimes in a spread eagle; same-hand grip; she jumps from a forward edge like an Axel.",
        baseValues: GROUP_5_HIGH,
      },
      {
        code: "5B",
        sovPrefix: "5BLi",
        name: "Backward lasso",
        takeOff: "Both partners skate backward with the same-arm hold (her right hand in his right, her left in his left); she takes off backward from the blade or the toe pick.",
        baseValues: GROUP_5_HIGH,
      },
      {
        code: "5R",
        sovPrefix: "5RLi",
        name: "Reverse lasso",
        takeOff:
          "Both partners skate in the same direction, backward or forward, with the opposite hand hold (right to left, left to right) and the woman's hand behind her back, not between her legs; she takes off from the blade or the toe pick. Both partners taking off forward is a difficult variation of the take-off.",
        baseValues: GROUP_5_HIGH,
      },
    ],
    sources: [rule("Rule 619, Lifts"), tp("Lifts: Group 5 (Lasso) Lifts"), comm("I, Lifts"), sov],
  },
];

/** Rule 619: the three classified positions of the woman. */
export const LIFT_POSITIONS: LiftPosition[] = [
  { id: "upright", name: "Upright", definition: "The woman's upper body is vertical, head up or head down." },
  { id: "star", name: "Star", definition: "The woman is sideways with her upper body parallel to the ice." },
  { id: "platter", name: "Platter", definition: "The woman is flat, facing up or down, with her upper body parallel to the ice." },
];

/** Communication 2788 and the Technical Panel Handbook, Lifts: Level features. */
export const LIFT_LEVEL_FEATURES: PairLevelFeature[] = [
  {
    number: 1,
    name: "Difficult take-off and/or difficult landing variety",
    detail:
      "Difficult take-offs include a somersault, a dance lift flowing straight into the pair lift without the woman touching the ice, a one-hand take-off, or a spread eagle, Ina Bauer or spiral as the entry curve; they must happen before the arms are fully extended. Difficult landings include somersaults, a change of hold, position or direction on the way down, a one-hand landing, or a spread eagle by the man held from the moment he starts bending his arms until the woman is on the ice.",
    senior: "Both a difficult variation of the take-off and a difficult landing variety are needed.",
    junior: "A difficult take-off or a difficult landing variety is enough; the former simple variations no longer count.",
  },
  {
    number: 2,
    name: "Change of hold and/or of the woman's position",
    detail: "One full revolution of the man before and after the change; counts twice if repeated. A change of hold and a change of position done at the same moment give one feature only.",
  },
  {
    number: 3,
    name: "Difficult variation of the woman",
    detail: "Held for one full revolution and awarded once per lift; only a variation that significantly affects her balance or needs specific strength or flexibility counts.",
  },
  {
    number: 4,
    name: "One-hand hold of the man",
    detail: "Two full revolutions in total on one hand, not counting any part shorter than one revolution.",
    senior:
      "Must be a difficult one-hand hold: a single point of contact with the woman balancing without supporting herself on him, or a second point of contact that is not used for support, with most of her weight clearly off the axis of his body.",
    junior: "Any one-hand hold in which the woman uses no arm or only one arm for support; not awarded if both of her arms touch the man.",
  },
  {
    number: 5,
    name: "Additional revolutions on one hand",
    detail: "Revolutions of the man with a one-hand hold beyond the two of feature 4. Free Skating only, and only in one lift (the first time it is done).",
    freeSkatingOnly: true,
    countsOncePerProgram: true,
  },
  {
    number: 6,
    name: "Change of rotational direction by the man",
    detail: "One revolution before and after the change; counts once per program, the first time it is attempted.",
    countsOncePerProgram: true,
  },
];

export const LIFT_LEVEL_RULES = {
  rules: [
    "Features 1 to 4 must be significantly different from lift to lift; a similar execution counts only the first time it is attempted.",
    "All features count only if executed within the first 4 revolutions of the man.",
    "Except the take-off and landing, features are counted from the moment the man's arm(s) are fully extended until the moment he starts bending them.",
    "The same two holds or positions repeated in the same order are 'similar'; any other change, including the same two in a different order, is significantly different.",
  ],
  sources: [comm("I, Lifts"), tp("Lifts: Level features, Identifying the Level features")],
};

/** Technical Panel Handbook, Lifts: Clarifications, plus Rule 619 and Rule 621 remarks. */
export const LIFT_CLARIFICATIONS: RuleNote[] = [
  {
    title: "Illegal grip",
    rule: "Any hold is allowed except the man holding the woman below her knee (calf, ankle, boot or blade). An illegal grip caps the level at Basic and brings the illegal-element deduction of 2.0; a lift with a wrong hold is the one illegal element listed in Rule 610 (the choreographic pair lift excepted).",
    sources: [tp("Lifts: Illegal Lift"), rule("Rule 610, Illegal Elements; Rule 504")],
  },
  {
    title: "Carry lifts",
    rule: "A lift that is just a carry has no rotation (at most half a revolution of the man on the take-off and/or exit), any hold, and may carry the partner on the back, shoulders or knees. Carries are not counted among the lifts, have no value, are unlimited in number and are judged in Composition. A levelled lift with at least one revolution may include a carry, but 'difficult carry' is no longer a feature, and a change of hold, position or direction interrupted by a carry does not count.",
    sources: [rule("Rule 619, Carry Lifts"), tp("Lifts: Difficult Carry feature, Changes interrupted by carry")],
  },
  {
    title: "Change of hold",
    rule: "The man's hands move from one lift-group grip to another, or from one hand to the other in a one-hand hold, with one full revolution before and after. A change held for less than one revolution is not a change, and going from two hands to one hand or back is not counted as a change of hold.",
    sources: [rule("Rule 619, Lifts"), tp("Lifts: Change of hold")],
  },
  {
    title: "Change of position",
    rule: "Going from one of upright, star and platter to another, with one full revolution in each. Turning from upright head-up to upright head-down, or platter to platter or star to star with half a rotation of the woman, also counts as a change of position.",
    sources: [rule("Rule 619, Lifts"), tp("Lifts: Basic holds, positions")],
  },
  {
    title: "One-hand hold",
    rule: "Two full revolutions on one hand in total make the feature; parts shorter than one revolution are ignored. A third revolution on one hand is not an extra feature in the Short Program and counts as feature 5 only in one Free Skating lift. A one-hand hold on the dismount counts only when the man uses one hand, the woman one hand or none and she does not touch him with any part of her upper body; it can be a difficult landing variety once per program.",
    sources: [tp("Lifts: One-hand-hold of the Man, One hand hold in the dismount"), comm("I, Lifts")],
  },
  {
    title: "Small lift",
    rule: "Any lift with a sustained, stabilised position of the woman in which the man's hands stay no higher than his shoulder line, with or without rotation. Small lifts are permitted anywhere (Rule 619 b) and are not called as lifts.",
    sources: [tp("Lifts: Definition of a small lift"), rule("Rule 619, paragraph b)")],
  },
  {
    title: "Counting the man's revolutions",
    rule: "From the moment the woman leaves the ice until the man's arm(s) begin to bend after full extension. If he is in a spread eagle or another sideways position at her take-off, his rotation is read from his front foot.",
    sources: [tp("Lifts: Identifying the number of revolutions")],
  },
  {
    title: "When the lift ends",
    rule: "When the man begins to bend his arms after full extension the lift is over (except while changing hold or position); anything done after a new extension is ignored for features and revolutions. The judges still evaluate the whole lift from take-off to landing.",
    sources: [tp("Lifts: Man starts bending the arm(s)"), rule("Rule 619, Lifts")],
  },
  {
    title: "Wrong take-off in the Short Program",
    rule: "A take-off of a different nature from the prescribed one gives the lift no value and blocks the box (the handbook clarification says 'no Level'; its no-value table says 'No value').",
    sources: [tp("Lifts: Wrong take-off (Short Program); Elements with no value table"), rule("Rule 620, paragraph 4 a)")],
  },
  {
    title: "Different lifts in the Free Skating",
    rule: "All lifts must have different codes. A second lift with the same code (the take-off not different) is not marked but blocks a lift box; if every lift is from Group 5, the second Group 5 lift is deleted. A take-off may be the same as the choreographic pair lift's without invalidating either.",
    sources: [rule("Rule 621, Lifts"), tp("Lifts: All lifts of Group 5; Choreographic Pair Lift")],
  },
  {
    title: "No value",
    rule: "Fewer than one revolution of the man, or arms never fully extended in Groups 3 to 5, gives no value in both programs.",
    sources: [tp("Elements with no value or maximum Level")],
  },
];

/* ------------------------------------------------------------------ */
/* 3. Twist lift                                                        */
/* ------------------------------------------------------------------ */

export const TWIST_LIFT = {
  codeFamily: "1Tw to 4Tw + level B/1-4, with << rows",
  definition:
    "The man throws the woman upward, she rotates freely in the air and he must catch her at the waist before she lands and assist her to a smooth landing on one foot. A split position before she rotates is not mandatory, but it is one of the level features.",
  baseValues: {
    "1Tw": { B: 0.9, 1: 1.1, 2: 1.3, 3: 1.5, 4: 1.7 },
    "2Tw": { B: 2.6, 1: 2.8, 2: 3.0, 3: 3.2, 4: 3.4 },
    "3Tw": { B: 4.8, 1: 5.1, 2: 5.4, 3: 5.7, 4: 6.0 },
    "4Tw": { B: 6.4, 1: 6.8, 2: 7.2, 3: 7.6, 4: 8.0 },
  } as Record<"1Tw" | "2Tw" | "3Tw" | "4Tw", LevelValues>,
  shortProgram: [
    "One twist lift; the woman's take-off is limited to a Lutz or Flip take-off.",
    "The woman rotates freely in the air two or three times, for Seniors and Juniors alike.",
    "A twist that does not meet the requirements, including the wrong number of revolutions, has no value and blocks the box.",
  ],
  freeSkating: ["One twist lift in the well-balanced program.", "The take-off may be Lutz, Flip, toe loop or Axel and the number of revolutions is not limited."],
  levelFeatures: [
    { number: 1, name: "Woman's split position", detail: "Each leg at least 45 degrees from her body axis, legs straight or almost straight, before she rotates." },
    {
      number: 2,
      name: "Catch at the side of the waist",
      detail: "Both of the man's hands on the sides of her waist, and the woman not touching him with her hands, arms or any part of her upper body at any point of the landing. Collapsing on him, or even brushing him on landing, cancels the feature.",
    },
    { number: 3, name: "Arm(s) above the head in the air", detail: "The woman's position in the air with one or both arms above the head for at least one full revolution." },
    {
      number: 4,
      name: "Difficult take-off or difficult exit",
      detail: "Turns, steps, movements or small lifts immediately before the take-off with continuous flow (a break cancels it), or a difficult exit done before the woman's landing or immediately after it with continuous flow.",
    },
    {
      number: 5,
      name: "Man's arms sideways after the release",
      detail: "After releasing the woman his arms go out to the side, straight or almost straight, at least as low as his shoulders, before he catches her. Not awarded if she is not caught in the air; awarded for any catch in the air, not only at the waist.",
    },
  ] as PairLevelFeature[],
  downgrade: {
    sign: "<<",
    rule: "A twist whose landing lacks half a revolution or more of the intended rotation is downgraded: it is called as the attempted twist with << and paid with the values of the twist one revolution lower (3Tw3<< is worth 2Tw3).",
    example: "In a triple twist the man already carries most of the woman's weight when her upper body has turned only 2.5 revolutions: called 3Tw<<, valued as a double.",
  },
  clarifications: [
    { title: "Camera angle", rule: "When deciding on a cheated twist the panel considers the camera angle, especially when the twist is at the far end of the rink.", sources: [tp("Twist Lift: Cheating on landing")] },
    { title: "Catch elsewhere", rule: "Catching the woman by one or both hands on any other part of the body is a different catching position: feature 2 is not given, but feature 5 (arms sideways) still can be.", sources: [tp("Twist Lift: Catching the Woman")] },
  ] as RuleNote[],
  sources: [rule("Rule 619, Twist lifts; Rule 620, paragraph 4 b); Rule 621, Twist lift"), tp("Twist Lift"), comm("I, Twist lifts"), sov],
};

/* ------------------------------------------------------------------ */
/* 4. Throw jumps                                                       */
/* ------------------------------------------------------------------ */

export const THROW_JUMPS = {
  definition: "A partner-assisted jump in which the woman is thrown into the air by the man on the take-off and lands without his assistance on a backward outside edge.",
  /** Clean codes; every one also has q, < and << rows in the Scale of Values. */
  baseValues: {
    "1TTh": 1.1, "1STh": 1.1, "1LoTh": 1.4, "1FTh": 1.4, "1LzTh": 1.4, "1ATh": 2.2,
    "2TTh": 2.5, "2STh": 2.5, "2LoTh": 2.8, "2FTh": 3.0, "2LzTh": 3.0, "2ATh": 4.0,
    "3TTh": 4.4, "3STh": 4.4, "3LoTh": 5.0, "3FTh": 5.3, "3LzTh": 5.3, "3ATh": 6.0,
    "4TTh": 6.5, "4STh": 6.5, "4LoTh": 7.0, "4FTh": 7.5, "4LzTh": 7.5,
  } as Record<string, number>,
  underRotatedFactor: 0.75,
  shortProgram: [
    "One throw jump: Seniors any double or triple; Juniors only the prescribed throw (double or triple loop in 2026-27).",
    "A throw that does not meet the requirements, including the wrong number of revolutions, has no value and blocks the box if one is empty.",
  ],
  freeSkating: [
    "At most two different throw jumps: different name and/or different number of revolutions.",
    "A repeated throw of the same name and number of revolutions occupies a throw box with no value.",
    "Throw Flip and throw Lutz are the same throw for the well-balanced program (they share a base value): a second one with the same number of revolutions has no value.",
  ],
  signs: [
    { sign: "q", meaning: "Landed on the quarter: a quarter revolution missing. Full base value, GOE reduced (-2).", sources: [tp("Throw Jumps: Landed on the quarter"), comm("I, Jumps and Throw Jumps")] },
    {
      sign: "<",
      meaning: "Under-rotated: more than a quarter but less than half a revolution missing. The '<' row of the Scale of Values applies, which for throws is 75% of the clean value (3LzTh< = 3.98), and GOE is reduced (-2 to -3).",
      sources: [tp("Throw Jumps: Under-rotated throw jumps"), sov],
    },
    {
      sign: "<<",
      meaning: "Downgraded: half a revolution or more missing. Valued with the row of the throw one rotation less (a downgraded triple is paid as the double); GOE -3 to -4 and the starting GOE capped at +2.",
      sources: [tp("Throw Jumps: Downgraded throw jumps"), comm("III-IV")],
    },
    {
      sign: "over-rotation",
      meaning: "A throw over-rotated by more than a quarter is called as the next throw up and downgraded: 2TTh with an extra quarter and more becomes 3TTh<<.",
      sources: [tp("Throw Jumps: Over-rotated throw jumps")],
    },
  ],
  rules: [
    {
      title: "Called as attempted",
      rule: "The panel calls the attempted throw even when it is clearly on the quarter, under-rotated or downgraded, and it counts as the intended throw for the well-balanced program. The quarter and half marks of the landing are the borderlines, and doubtful cases go to the skater's benefit.",
      sources: [tp("Throw Jumps: Calling quarter, under-rotated and downgraded jumps")],
    },
    {
      title: "Man's position at the take-off",
      rule: "A poor position of the man at the take-off is a GOE reduction of -1 to -2 on the throw; the woman's air position, height and distance are judged as for a jump.",
      sources: [comm("III, Jump elements, throw jumps")],
    },
  ] as RuleNote[],
  sources: [rule("Rule 619, Throw jumps; Rule 620, paragraph 4 c); Rule 621"), tp("Throw Jumps"), sov],
};

/* ------------------------------------------------------------------ */
/* 5. Death spirals and the pivot figure                                */
/* ------------------------------------------------------------------ */

export const DEATH_SPIRALS = {
  definition:
    "In the final position the man pivots on an anchored toe pick with both knees clearly bent and his holding arm fully extended, centred, while the woman circles around him on one clean edge with her head close to the ice; she must not touch the ice with her head or help herself with her free hand or any other part of the body, and one of her skates must stay on the ice throughout. Her weight is carried by the force of her spiralling edge and his hold. Both must hold this for at least one revolution.",
  types: [
    {
      code: "BoDs",
      name: "Backward outside death spiral",
      manEdge: "Backward outside edge pivot, holding her hand with the arm on the same side as his skating foot, fully extended.",
      womanEdge: "Backward outside edge.",
      womanLean: "Leaning backward toward the ice, arm fully extended.",
      baseValues: { B: 3.2, 1: 3.6, 2: 4.0, 3: 4.4, 4: 4.8 },
      prescribedShortProgram: "2027-28",
    },
    {
      code: "FiDs",
      name: "Forward inside death spiral",
      manEdge: "Backward outside edge pivot, holding her hand with the arm on the same side as his skating foot, fully extended.",
      womanEdge: "Forward inside edge.",
      womanLean: "Leaning sideways toward the ice, arm fully extended.",
      baseValues: { B: 2.6, 1: 2.9, 2: 3.2, 3: 3.5, 4: 3.8 },
      prescribedShortProgram: "2026-27",
    },
    {
      code: "BiDs",
      name: "Backward inside death spiral",
      manEdge: "As for the backward outside death spiral.",
      womanEdge: "A firm backward inside edge.",
      womanLean: "Leaning backward or forward toward the ice, arm fully extended.",
      baseValues: { B: 2.8, 1: 3.1, 2: 3.4, 3: 3.7, 4: 4.0 },
      prescribedShortProgram: "2028-29",
    },
    {
      code: "FoDs",
      name: "Forward outside death spiral",
      manEdge: "As for the forward inside death spiral.",
      womanEdge: "A firm forward outside edge.",
      womanLean: "Leaning sideways toward the ice, arm fully extended.",
      baseValues: { B: 3.5, 1: 3.9, 2: 4.3, 3: 4.7, 4: 5.1 },
    },
  ] as DeathSpiralType[],
  pivot: {
    shortProgram:
      "Only the traditional pivot: the man on a backward outside edge, holding the woman's hand with a fully extended arm on the side of his skating foot, both knees clearly bent, in full pivot position. Variations of his body position are allowed as long as the pivot stays as described; a variation of the pivot itself gives no value. His opposite handhold is not allowed in the Short Program; hers is allowed but is not a feature.",
    freeSkating: "Both a backward and a forward pivot of the man are allowed, and so are variations of arm holds. Changing the pivot position ends the death spiral: only the part in the correct pivot counts toward the level.",
    changeOfArmHold: "Changes of arm hold by either partner are allowed at any moment in both programs but are no longer a level feature.",
  },
  lowPositions: {
    womanInside: "Inside death spirals: the lowest hip or buttock and the head are no higher than her skating knee.",
    womanOutside: "Outside death spirals: the head is no higher than her skating knee.",
    man: "Buttocks no higher than the knee of his anchored (pivot) foot.",
  },
  timing: {
    entryStarts: "At the beginning of the entry curve, when one partner is on one foot on the death spiral edge and the other is on one foot or in a position such as a spread eagle or shoot-the-duck.",
    revolutionsStart: "When the man's pivot toe is anchored and stationary on the ice.",
    revolutionsEnd: "When the man's pivot ends or the woman begins to rise to exit, whichever comes first.",
    exit: "From the moment the man starts bending his holding arm at the elbow until the woman reaches the vertical position.",
  },
  levelFeatures: [
    {
      number: 1,
      name: "Difficult entry",
      detail: "Immediately before the death spiral, a position by one or both partners that affects the body core and balance, held while at least one partner is on the entry curve, moving directly and without delay into the death spiral. Awarded only if both reach the low position within the first revolution after the man's toe is anchored.",
    },
    {
      number: 2,
      name: "Difficult exit",
      detail: "Immediately out of the death spiral, a movement with a significant impact on balance and control, for example the woman flowing straight into a lift (dance or other) or a jump. Entry and exit are two separate features and both can count in the same death spiral.",
    },
    {
      number: 3,
      name: "Full revolution(s) of the woman in the low positions",
      detail: "Each full revolution of the woman while both partners are in their low positions; counts as many times as performed. Counting starts only when both are low and stops if the low position is lost, so revolutions must be continuous. Only the woman's revolutions are counted; the man may turn less if she passes behind him with a change of hold.",
    },
  ] as PairLevelFeature[],
  levelRules: [
    "A death spiral has a level and a value only if both partners complete at least one revolution in the death spiral position: the man's knees clearly bent, toe anchored and arm fully extended, and the woman's head reaching, at least briefly, the level of her skating knee.",
    "Without one full revolution with both partners simultaneously in the low positions the level cannot be higher than 1.",
    "If the woman's head (any death spiral) or lowest hip (inside death spirals) stays higher than her skating knee, the level cannot be higher than 1.",
  ],
  noValue: [
    "The man never reaches the pivot, or does not stay in it for one revolution, or his knee is not clearly bent or his arm not fully extended for one revolution.",
    "The lowest part of the woman's head never reaches the level of her skating knee.",
    "Short Program: the woman skates a different edge or direction from the prescribed death spiral (the box is blocked), or the man varies the traditional pivot.",
    "The woman loses her edge and goes onto the boot or knee: the death spiral ends there and the panel decides whether it was a fall.",
  ],
  sources: [rule("Rule 619, Death Spirals; Rule 620, paragraph 4 g); Rule 621, Death Spiral"), tp("Death Spiral"), comm("I, Death spirals"), sov],
};

export const PIVOT_FIGURE = {
  code: "PiF1",
  baseValue: 2.2,
  definition: "The man performs a pivot holding the woman hand to hand; she follows him in a spiral, spread eagle or extended-leg position.",
  usage: "A Novice element only; it has a single code and value in the Scale of Values and is called by the technical panel like a death spiral.",
  sources: [tp("Death Spiral / Pivot Figure (Novice)"), sov],
};

/* ------------------------------------------------------------------ */
/* 6. Spins and choreographic elements                                  */
/* ------------------------------------------------------------------ */

export const PAIR_SPIN_COMBINATION = {
  code: "PCoSp",
  baseValues: {
    full: { B: 2.8, 1: 3.3, 2: 3.9, 3: 4.4, 4: 5.0 },
    v: { B: 2.1, 1: 2.48, 2: 2.93, 3: 3.3, 4: 3.75 },
  } as Record<"full" | "v", LevelValues>,
  novicePairSpin: { code: "PSp", baseValues: { B: 1.9, 1: 2.2, 2: 2.8, 3: 3.3, 4: 3.9 } as LevelValues },
  general: [
    "At least one change of foot and one change of position (sit, camel, upright or a variation) by both partners.",
    "At least two different basic positions with two revolutions each by both partners anywhere in the spin; all three basic positions by both for full value, otherwise V.",
    "Fewer than two revolutions in every basic position: no level and no value. Fewer than three rotations in total is a skating movement, not a spin.",
    "The rotation must be continuous; the only stop allowed is a short one when changing direction together with the change of foot. A stop on the toe or blade ends the spin.",
    "If one or both partners fall entering the spin, a spin or spinning movement right after it is allowed to fill time and is not counted as an element.",
    "In a pair sit spin where the woman's free leg is behind and the man's in front, her sit position is reached when her skating knee is bent 90 degrees or more.",
  ],
  shortProgram: [
    "The Senior and Junior Short Program of 2026-27 must contain one pair spin combination.",
    "At least one change of foot by both partners (more are allowed), not necessarily at the same moment; the spin may start with a fly.",
    "At least one change of position by both partners; with no change of foot or no change of position the element has no value.",
    "Minimum eight revolutions, counted from the entry to the exit; the judges reflect a shortfall in the GOE.",
  ],
  levelFeatures: [
    {
      number: 1,
      name: "Three difficult variations of the partners' positions",
      detail: "Each variation of each partner counts separately, held for at least two revolutions; two of the three may be in a non-basic position, and each partner must contribute at least one. All three by one partner: no feature.",
    },
    { number: 2, name: "Difficult entrance or any flying entrance", detail: "A fly or jump by one or both partners (the other may enter in any position), or a difficult entrance executed by both partners, including a clean backward outside or backward inside edge entry with the first two revolutions of each partner on that edge and no turns or free-leg help." },
    { number: 3, name: "Difficult exit", detail: "Exiting into a lift or spinning movement, or an innovative move that makes the exit significantly harder, with a significant impact on balance and control." },
    { number: 4, name: "Both directions immediately following each other", detail: "Clockwise and counter-clockwise with at least three revolutions in each direction; it is still one spin." },
    { number: 5, name: "At least 6 revolutions without changes", detail: "Six revolutions done simultaneously by both partners without any change of position, variation or foot, in camel, sit or a difficult upright position." },
    {
      number: 6,
      name: "Lifting the woman while the man is on one foot",
      detail: "At least two revolutions with the woman lifted in a fixed position while the man spins on one foot. Her basic position in the air counts if held two revolutions (upright is judged by the torso, not the legs; parallel to the ice is non-basic), a difficult position counts as a difficult variation, and held six revolutions it can also give feature 5. Lifted revolutions count in the total.",
    },
  ] as PairLevelFeature[],
  levelRules: [
    "All features count only once per program.",
    "If both the lift of the woman and a difficult exit are used, she must be set down on her blade before the exit.",
  ],
  vCases: [
    "Only two basic positions with two revolutions by one or both partners.",
    "A change of foot without three continuous revolutions before or after it by one or both partners.",
  ],
  noValueCases: [
    "One or both partners without two continuous revolutions in two basic positions.",
    "Fewer than three continuous revolutions on both feet by one or both partners.",
    "No change of foot or no change of position by one or both partners (the 'Pair Spin Combination No Value' call).",
  ],
  sources: [rule("Rule 620, paragraph 4 f)"), tp("Pair Spin Combination"), comm("I, Pair Spin Combination; III, Solo and Pair Spins"), sov],
};

export const SOLO_SPIN_COMBINATION = {
  codes: "CoSp, CCoSp, FCoSp, FCCoSp (+V), the singles codes",
  status: "Not a Junior or Senior element in 2026-27; it returns as the prescribed Short Program spin in 2027-28.",
  requirements: [
    "At least two different basic positions with two revolutions each by both partners; all three for full value, otherwise V.",
    "Both partners must be in the same basic position at the same time for it to count, and every feature must be performed by both at the same moment.",
    "The change of foot may be a step-over or a jump, at the same time as the change of position or separately; the spin may start with a jump.",
    "Short Program (2027-28): only one change of foot, with not less than five revolutions on each foot by both partners.",
    "A second change of foot in the Short Program is a wrong element (no value); spinning centres too far apart also mean no value in the Short Program.",
  ],
  levelFeatures: [
    { number: 1, name: "Difficult variations", detail: "Count as many times as performed, within the ten variation categories; each category once per program." },
    { number: 2, name: "Change of foot executed by jump", detail: "Only into a camel or sit position reached within two revolutions.", countsOncePerProgram: true },
    { number: 3, name: "Jump within a spin without changing feet", detail: "", countsOncePerProgram: true },
    { number: 4, name: "Difficult change of position on the same foot", detail: "", countsOncePerProgram: true },
    { number: 5, name: "Difficult entrance or difficult exit", detail: "Only one of the two can count.", countsOncePerProgram: true },
    { number: 6, name: "Clear change of edge", detail: "In sit (only backward inside to forward outside), camel, layback, Biellmann or a difficult upright variation.", countsOncePerProgram: true },
    { number: 7, name: "Both directions immediately following each other", detail: "In sit, camel, layback or a difficult upright variation, at least three revolutions each way.", countsOncePerProgram: true },
    { number: 8, name: "Clear increase of speed", detail: "In camel, sit, layback, Biellmann or a difficult upright variation, not in a crossfoot spin.", countsOncePerProgram: true },
    { number: 9, name: "At least 6 revolutions without changes", detail: "Six, not the eight of single skating, in camel, layback or a difficult variation of any basic position; if done on both feet the panel takes the one in the pair's favour.", countsOncePerProgram: true },
    { number: 10, name: "Difficult blade feature", detail: "In camel, sit, layback, Biellmann or a difficult upright variation.", countsOncePerProgram: true },
    { number: 11, name: "Windmills (three in a row)", detail: "Each reaching close to a split (at least 135 degrees).", countsOncePerProgram: true },
  ] as PairLevelFeature[],
  levelRules: ["Features 2 to 11 and each variation category count once per program, the first time attempted.", "In a spin with change of foot at most two features count on one foot."],
  sources: [rule("Rule 620, paragraph 4 e)"), tp("Solo Spin Combination"), comm("I, Solo Spins")],
};

export const CHOREO_PAIR_SPIN = {
  code: "ChPSp1",
  baseValue: 3.5,
  summary: "A spin that enhances the choreography and matches the music, with at least three consecutive revolutions on one or two blades by at least one partner in any basic or non-basic position.",
  rules: [
    "In the Senior and Junior Free Skating as the only spin of the 2026-27 well-balanced program; fixed base value, judged in GOE only.",
    "The pair must spin together. Changes of foot are optional and may be repeated; spinning on other parts of the body before, during or after the three revolutions and intentional travelling are allowed.",
    "The three consecutive revolutions may come in any part of the spin but must be on the same foot (one or two blades); changing feet during them makes the spin no value.",
    "Lifting a partner is optional, but a lift with fully extended arm(s) above shoulder level makes the element no value; a partner may be above the lifter's head as long as the arms are not fully extended.",
    "Confirmed once the three consecutive revolutions are complete; the whole spin is in the video clip for the GOE.",
  ],
  sources: [rule("Rule 621, Choreographic Pair Spin"), tp("Choreographic Pair Spin"), comm("I, Choreographic Elements"), sov],
};

export const CHOREO_PAIR_LIFT = {
  code: "ChPLi1",
  baseValue: 4.5,
  summary: "A lift that enhances the choreography and matches the music: ascending and descending while moving across the ice, with at least one rotation and no limitation on the hold.",
  rules: [
    "Senior Free Skating only (at most one); fixed base value, judged in GOE only.",
    "The lifting partner must have straight or almost straight arm(s) above the head at some point, and at least one rotation must be executed while the arms are up; this can be in any part of the lift.",
    "If the panel cannot identify a choreographic pair lift, the third lift performed is taken as it.",
    "Positions and features used here do not count as used in the other lifts, and the take-off may be the same as another lift's without invalidating it.",
    "The lifted partner must be set down on the ice at the exit unless the lift is the last element of the program; spinning on the spot is only allowed at the very end of a lift that is the last element.",
    "Confirmed after one revolution with the arms straight or almost straight above the head; the whole lift is in the video clip for the GOE.",
  ],
  sources: [rule("Rule 621, Choreographic Pair lift"), tp("Choreographic Pair Lift"), comm("I, Choreographic Elements"), sov],
};

export const PAIR_SPINS = {
  pairSpinCombination: PAIR_SPIN_COMBINATION,
  soloSpinCombination: SOLO_SPIN_COMBINATION,
  choreographicPairSpin: CHOREO_PAIR_SPIN,
  choreographicPairLift: CHOREO_PAIR_LIFT,
};

/* ------------------------------------------------------------------ */
/* 7. Side-by-side elements                                             */
/* ------------------------------------------------------------------ */

export const SIDE_BY_SIDE = {
  soloJump: {
    shortProgram: [
      "One solo jump: any double or triple for Seniors; a double Lutz or double Axel for Juniors in 2026-27.",
      "A jump that does not meet the requirements, including the wrong number of revolutions or a different Junior jump, has no value but blocks the jump box.",
    ],
    freeSkating: [
      "At most one solo jump and at most one jump combination or jump sequence, of two jumps.",
      "All jumps of more than two revolutions (double Axel, triples and quads) must be of a different name; the combination or sequence may however contain two of the same jump.",
      "A repeated jump of more than two revolutions with the same name and number of revolutions occupies a jump box with no value; only the offending jump is deleted, in order of execution.",
      "If both partners jump two solo jumps, the second is marked +REP and gets 80% of its base value.",
      "Quarter, under-rotated and downgraded jumps count as the intended jump for the well-balanced program.",
    ],
    sources: [rule("Rule 620, paragraph 4 d); Rule 621"), tp("Jump Elements")],
  },
  jumpCombinationAndSequence: {
    rules: [
      "A jump combination or sequence consists of two jumps.",
      "Combination: the landing foot of one jump is the take-off foot of the next; one full revolution on the ice between them, with the free foot allowed to touch but no weight transfer, keeps it a combination. More than one full revolution: the jumps before it are called plus COMBO.",
      "Sequence: the second jump is an Axel-type jump entered with a direct step from the landing curve of the first.",
      "An Euler is a non-listed jump with no value between two listed jumps and is not counted in the number of jumps; after an Euler no change of foot is allowed before the next jump.",
      "A waltz jump that only serves as preparation for the next jump is not called, and a single jump that is more a hop after a bad landing may be left uncalled.",
    ],
    sources: [rule("Rule 610, Jump Combinations and Jump Sequences; Rule 621"), tp("Jump Elements: Jump Combination, Jump Sequence"), comm("I, Jump elements")],
  },
  calling: [
    {
      title: "Unequal revolutions",
      rule: "When the partners turn different numbers of revolutions in a solo jump or in a jump of a combination or sequence, the jump is called with the lesser number. The GOE reduction is -1 to -2 for one jump and -3 to -4 for two, and the starting GOE is capped at +2.",
      sources: [rule("Rule 619, Solo jumps"), tp("Jump Elements: Unequal number of revolutions"), comm("III-IV")],
    },
    {
      title: "Different jumps",
      rule: "If the partners clearly perform different jumps the element has no value: it is named as the jump of lesser value without signs, and only that jump is blocked from repetition (3T by one and 3S by the other gives 3T*).",
      sources: [tp("Jump Elements: Different Jumps performed")],
    },
    {
      title: "One partner falls or steps out",
      rule: "If one partner falls or steps out and the other completes the combination, the call is the executed jump(s) plus COMBO (2F+COMBO); with an Axel-type second jump the sequence marker and a starred Axel follow (3T+SEQ+A*).",
      sources: [tp("Jump Elements: Fall/Touch down with free foot with weight transfer")],
    },
    {
      title: "Combination versus sequence",
      rule: "If one partner does a combination and the other a sequence, the element of lesser value is called: 3T+2T against 3T+2A+SEQ gives 3T+2T.",
      sources: [tp("Jump Elements: One partner with combo, the other one with sequence")],
    },
    {
      title: "Non-listed first or second jump",
      rule: "If one jump of a two-jump combination turns into a non-listed jump by one or both partners, the unit is still a combination and only the listed jump receives value.",
      sources: [tp("Jump Elements: Jump Combination: first/second jump is a non-listed jump")],
    },
    {
      title: "Signs are the singles signs",
      rule: "Both partners must meet the singles requirements; q, <, <<, e, !, over-rotation, cheated take-off, popped jumps, attempts and non-listed jumps are judged exactly as in single skating, for either partner.",
      sources: [comm("I, Jump elements"), tp("Jump Elements: Clarifications")],
    },
  ] as RuleNote[],
  soloSpins: {
    rules: [
      "Side-by-side spins are the solo spin combination (singles codes), prescribed in the Short Program of 2027-28; there are none in the 2026-27 Senior and Junior programs.",
      "The first positive GOE bullet is very good unison; a big distance between partners or a lack of unison costs -1 to -3.",
    ],
    sources: [rule("Rule 620"), comm("II-III, Solo Spins")],
  },
  sources: [rule("Rules 619-621"), tp("Jump Elements"), comm("I-III")],
};

/* ------------------------------------------------------------------ */
/* 8. Short Programs                                                    */
/* ------------------------------------------------------------------ */

const SP_COMMON_NOTES = [
  "Seven required elements in any order, skated to music of the pair's choice; vocal music with lyrics is permitted.",
  "An unprescribed or additional element performed instead of a required one blocks that box with no value; unlisted or additional jumps, spins, steps or repetitions, even of failed elements, are not marked and do not block another box.",
  "Program component factor 1.33; duration 2 minutes 40 seconds, ±10 seconds.",
];

/** Rule 620, groups effective 1 July 2026. */
export const PAIR_SHORT_PROGRAMS: PairProgramSpec[] = [
  {
    segment: "shortProgram",
    category: "seniorPairs",
    season: "2026-27",
    durationSeconds: 160,
    elements: [
      {
        slot: "Lift",
        requirement: "Any hip lift take-off (Group 3), with full extension of the man's arm(s) and at least one revolution",
        notes: ["Only the prescribed overhead take-off is allowed; a take-off of a different nature gets no value and blocks the box.", "The lift may include a carry.", "A third revolution on one hand is not an extra feature in the Short Program."],
      },
      {
        slot: "Twist lift",
        requirement: "Double or triple twist with a Lutz or Flip take-off by the woman",
        notes: ["Wrong number of revolutions: no value, box blocked.", "A landing cheated by half a revolution or more is downgraded (<<) and paid as the lower twist."],
      },
      { slot: "Throw jump", requirement: "Any double or triple throw jump", notes: ["Wrong number of revolutions: no value, box blocked."] },
      {
        slot: "Solo jump",
        requirement: "Any double or triple jump, side by side",
        notes: ["Unequal revolutions are called as the lesser jump; a jump that does not meet the requirements has no value and blocks the box."],
      },
      {
        slot: "Pair spin combination",
        requirement: "At least one change of foot and one change of position by both partners; two basic positions with two revolutions each by both (all three for full value); minimum eight revolutions",
        notes: ["The changes of foot need not be simultaneous and the spin may start with a fly.", "No change of foot or no change of position: no value."],
      },
      {
        slot: "Death spiral",
        requirement: "Forward inside death spiral: the man in the traditional backward outside pivot, the woman on a forward inside edge",
        notes: ["A different edge or direction by the woman gives no value but blocks the box.", "Only the traditional pivot is allowed; the man's opposite handhold is not."],
      },
      { slot: "Step sequence", requirement: "Fully utilising the ice surface, skated together or close together", notes: ["May include unlisted jumps; short stops in accordance with the music are permitted."] },
    ],
    notes: SP_COMMON_NOTES,
    sources: [rule("Rule 620, paragraphs 1, 2 and 4"), rule("Rule 502"), sov],
  },
  {
    segment: "shortProgram",
    category: "juniorPairs",
    season: "2026-27",
    durationSeconds: 160,
    elements: [
      {
        slot: "Lift",
        requirement: "Any hip lift take-off (Group 3), with full extension of the man's arm(s) and at least one revolution",
        notes: ["Only the prescribed overhead take-off is allowed; a different take-off gets no value and blocks the box.", "The lift may include a carry.", "Juniors need a difficult take-off or a difficult landing for feature 1, and any one-hand hold with at most one of the woman's arms for support for feature 4."],
      },
      {
        slot: "Twist lift",
        requirement: "Double or triple twist with a Lutz or Flip take-off by the woman",
        notes: ["Wrong number of revolutions: no value, box blocked."],
      },
      { slot: "Throw jump", requirement: "Double or triple loop throw jump", notes: ["Only the prescribed throw is permitted; a different throw or wrong number of revolutions has no value and blocks the box."] },
      { slot: "Solo jump", requirement: "Double Lutz or double Axel, side by side", notes: ["Only the prescribed jump is permitted; a different jump receives no value but blocks the jump box."] },
      {
        slot: "Pair spin combination",
        requirement: "At least one change of foot and one change of position by both partners; two basic positions with two revolutions each by both (all three for full value); minimum eight revolutions",
        notes: ["The changes of foot need not be simultaneous and the spin may start with a fly.", "No change of foot or no change of position: no value."],
      },
      {
        slot: "Death spiral",
        requirement: "Forward inside death spiral: the man in the traditional backward outside pivot, the woman on a forward inside edge",
        notes: ["A different edge or direction by the woman gives no value but blocks the box."],
      },
      { slot: "Step sequence", requirement: "Fully utilising the ice surface, skated together or close together", notes: ["May include unlisted jumps; short stops in accordance with the music are permitted."] },
    ],
    notes: SP_COMMON_NOTES,
    sources: [rule("Rule 620, paragraphs 1, 3 and 4"), rule("Rule 502"), sov],
  },
];

/** Rule 620: the groups rotate on 1 July each year. */
export const PAIR_SHORT_PROGRAM_ROTATION = {
  summary: "The lift group, the spin and the death spiral rotate through three seasons; the twist is always double or triple and the Junior throw and solo jump are prescribed each year.",
  seasons: [
    {
      season: "2027-28",
      senior: ["Any hand-to-hand lift take-off (Group 4)", "Twist lift (double or triple)", "Throw jump (double or triple)", "Solo jump (double or triple)", "Solo spin combination with only one change of foot", "Death spiral backward outside", "Step sequence fully utilising the ice surface"],
      junior: ["Any hand-to-hand lift take-off (Group 4)", "Twist lift (double or triple)", "Double or triple Salchow throw jump", "Double Flip or double Axel solo jump", "Solo spin combination with only one change of foot", "Death spiral backward outside", "Step sequence fully utilising the ice surface"],
    },
    {
      season: "2028-29",
      senior: ["Any lasso lift take-off (Group 5)", "Twist lift (double or triple)", "Throw jump (double or triple)", "Solo jump (double or triple)", "Pair spin combination", "Death spiral backward inside", "Step sequence fully utilising the ice surface"],
      junior: ["Any lasso lift take-off (Group 5)", "Twist lift (double or triple)", "Double or triple toe loop or Flip/Lutz throw jump", "Double loop or double Axel solo jump", "Pair spin combination", "Death spiral backward inside", "Step sequence fully utilising the ice surface"],
    },
  ],
  sources: [rule("Rule 620, paragraphs 2-3")],
};

/* ------------------------------------------------------------------ */
/* 9. Free Skating                                                      */
/* ------------------------------------------------------------------ */

/** Rule 621, the well-balanced program, with the handbook's remarks. */
export const PAIR_FREE_SKATING = {
  senior: {
    durationSeconds: 240,
    maxLifts: 2,
    maxChoreoPairLifts: 1,
    maxTwists: 1,
    maxThrows: 2,
    maxSoloJumps: 1,
    maxJumpCombinationsOrSequences: 1,
    maxChoreoPairSpins: 1,
    maxDeathSpirals: 1,
    limits: [
      "Maximum two lifts, not both from the same group, with full extension of the lifting arm(s).",
      "Maximum one choreographic pair lift.",
      "Maximum one twist lift.",
      "Maximum two different throw jumps.",
      "Maximum one solo jump.",
      "Maximum one jump combination or jump sequence.",
      "Maximum one choreographic pair spin.",
      "Maximum one death spiral, of a different type from the Short Program death spiral.",
    ],
  },
  junior: {
    durationSeconds: 210,
    maxLifts: 2,
    maxChoreoPairLifts: 0,
    maxTwists: 1,
    maxThrows: 2,
    maxSoloJumps: 1,
    maxJumpCombinationsOrSequences: 1,
    maxChoreoPairSpins: 1,
    maxDeathSpirals: 1,
    limits: [
      "Maximum two lifts, not both from the same group, with full extension of the lifting arm(s).",
      "Maximum one twist lift.",
      "Maximum two different throw jumps.",
      "Maximum one solo jump.",
      "Maximum one jump combination or sequence.",
      "Maximum one choreographic pair spin.",
      "Maximum one death spiral (any type).",
    ],
  },
  remarks: [
    "Any element beyond the prescribed numbers is not counted; only the first attempt, or the allowed number of attempts, counts.",
    "All lifts must have different codes; a second lift with the same code is not marked but blocks a lift box. If every lift is from Group 5, the second Group 5 lift is deleted.",
    "The twist may have any number of revolutions and a Lutz, Flip, toe loop or Axel take-off.",
    "The jump combination or sequence consists of two jumps. All jumps of more than two revolutions (double Axel, triples, quads) must have different names, but the combination or sequence may include two of the same; an extra jump deletes only the jump that breaks the rule, in order of execution.",
    "Two different throws only: throw Flip and throw Lutz are the same throw, and a repeated throw of the same name and revolutions has no value.",
    "Arm holds and the man's pivot (backward or forward) may vary in the death spiral; Seniors must use a different type from their Short Program.",
    "There is no step sequence and, in 2026-27, no choreographic sequence in the Senior or Junior pair Free Skating.",
    "Program component factor 2.67; Senior 4 minutes, Junior 3 minutes 30 seconds, ±10 seconds.",
  ],
  sources: [rule("Rule 621"), rule("Rule 502"), tp("Lifts; Twist Lift; Throw Jumps; Jump Elements; Death Spiral; Choreographic Sequence"), sov],
};

/* ------------------------------------------------------------------ */
/* 10. GOE guidelines (Communication 2788, sections II-IV)              */
/* ------------------------------------------------------------------ */

const FALL = { error: "Fall", range: "-5", capsStartingGoeAtPlusTwo: true };
const NO_MUSIC = { error: "Element executed fully or partly when the music is not playing", range: "-1 to -4", capsStartingGoeAtPlusTwo: false };

export const PAIR_GOE_GUIDELINES: PairGoeGuideline[] = [
  {
    elementType: "lift",
    name: "Lifts",
    positive: [
      { text: "very good take-off and landing", requiredForHighGoe: true },
      { text: "good speed, flow and ice coverage", requiredForHighGoe: true },
      { text: "effortless throughout, including the rotation and any change of position", requiredForHighGoe: false },
      { text: "very good air positions", requiredForHighGoe: false },
      { text: "smooth footwork of the man", requiredForHighGoe: false },
      { text: "element matches the music", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Serious problems in the descent of the lift", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Serious problems in the lifting process", range: "-3", capsStartingGoeAtPlusTwo: true },
      { error: "Woman starts or lands on two feet", range: "-2", capsStartingGoeAtPlusTwo: false, note: "No reduction when a two-foot take-off is part of a difficult entry; the quality of the take-off is still judged." },
      { error: "Slight problems in the descent of the lift", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Slight problems in the lifting process", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Touch down with the free foot", range: "-1", capsStartingGoeAtPlusTwo: false },
      { error: "Long preparation, poor take-off", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Too long getting into position or variation", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor, awkward position in the air or on landing", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor speed and/or ice coverage", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor turns by the man and/or stops in rotation", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Weak landing", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
    ],
    sources: [comm("II, Pair Skating, Lifts; III, Reductions for errors Pair Skating; IV, Lifts")],
  },
  {
    elementType: "twist",
    name: "Twist lifts",
    positive: [
      { text: "good height of the woman in the air position", requiredForHighGoe: true },
      { text: "clean catch", requiredForHighGoe: true },
      { text: "effortless throughout", requiredForHighGoe: false },
      { text: "good take-off and exit", requiredForHighGoe: false },
      { text: "very good speed and flow", requiredForHighGoe: false },
      { text: "element matches the music", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Serious problems on the catch", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Downgraded (<<)", range: "-2 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Woman lands on two feet", range: "-2 to -3", capsStartingGoeAtPlusTwo: true },
      { error: "Touch down with the free foot", range: "-1", capsStartingGoeAtPlusTwo: false },
      { error: "Poor take-off (scratching, poor speed, no toe pick)", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor height or distance", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Long preparation", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Slight problems on the catch", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Weak landing (poor speed, bad positions)", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
    ],
    sources: [comm("II, Pair Skating, Twist Lifts; III, Reductions for errors Pair Skating")],
  },
  {
    elementType: "jump",
    name: "Jump elements (side by side)",
    positive: [
      { text: "very good unison", requiredForHighGoe: true },
      { text: "good take-off and landing", requiredForHighGoe: true },
      { text: "effortless throughout, including rhythm in a combination or sequence", requiredForHighGoe: false },
      { text: "steps before the jump, unexpected or creative entry or exit", requiredForHighGoe: false },
      { text: "very good height and very good length (of all jumps in a combination or sequence)", requiredForHighGoe: false },
      { text: "element matches the music", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Downgraded (<<)", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Multiple q signs in a combination or sequence", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Landing on two feet", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Stepping out of the landing", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Unequal number of revolutions by the partners in two jumps", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Two three turns between jumps", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Wrong edge take-off on Flip or Lutz (e)", range: "-2 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Poor take-off", range: "-2 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Unequal number of revolutions by the partners in one jump", range: "-1 to -2", capsStartingGoeAtPlusTwo: true },
      { error: "Under-rotated (<)", range: "-2 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Touch down with both hands", range: "-2 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Euler executed as a step-over", range: "-2 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Free Skating: jump with no value inside a combination or sequence (not with *)", range: "-2 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor speed, height, distance or air position", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Big distance between the partners (solo jumps)", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Lack of unison", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Loss of flow, direction or rhythm between jumps", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Weak landing, scratching or wrong edge in the landing", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Long preparation", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Landed on the quarter (q)", range: "-2", capsStartingGoeAtPlusTwo: false },
      { error: "Change of edge between jumps", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Touch down with one hand or the free foot", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Unclear edge take-off on Flip or Lutz (!)", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Less than a quarter missing, no sign", range: "-1", capsStartingGoeAtPlusTwo: false },
      { error: "Unclear edge take-off on Flip or Lutz, no sign", range: "-1", capsStartingGoeAtPlusTwo: false },
    ],
    notes: ["Short Program: a jump element with * or not according to the requirements (wrong revolutions, repeated jump, +COMBO) must have a final GOE of -5."],
    sources: [comm("II, Pair Skating, Jump Elements; III, Jump elements, throw jumps; IV, Jumps")],
  },
  {
    elementType: "throw",
    name: "Throw jumps",
    positive: [
      { text: "very good height and very good distance", requiredForHighGoe: true },
      { text: "good speed, flow and control on the release and the landing", requiredForHighGoe: true },
      { text: "effortless throughout", requiredForHighGoe: false },
      { text: "difficult, unexpected or creative entry or exit by the woman or the man", requiredForHighGoe: false },
      { text: "very good air position", requiredForHighGoe: false },
      { text: "element matches the music", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Downgraded (<<)", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Landing on two feet", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Stepping out of the landing", range: "-3 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Wrong edge take-off on a throw Flip or Lutz (e)", range: "-2 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Poor take-off", range: "-2 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Under-rotated (<)", range: "-2 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Touch down with both hands", range: "-2 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor speed, height, distance or air position", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Weak landing, scratching or wrong edge in the landing", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Long preparation", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Landed on the quarter (q)", range: "-2", capsStartingGoeAtPlusTwo: false },
      { error: "Touch down with one hand or the free foot", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Unclear edge take-off on a throw Flip or Lutz (!)", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Man's poor position at the take-off", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Less than a quarter missing, no sign", range: "-1", capsStartingGoeAtPlusTwo: false },
      { error: "Unclear edge, no sign", range: "-1", capsStartingGoeAtPlusTwo: false },
    ],
    notes: ["Communication 2788 prints one reduction table for jump elements and throw jumps; the combination-only rows (unequal revolutions in two jumps, multiple q, two three turns, Euler, change of edge between jumps) do not arise in a throw."],
    sources: [comm("II, Pair Skating, Throw Jumps; III, Jump elements, throw jumps")],
  },
  {
    elementType: "soloSpin",
    name: "Solo spins (side by side)",
    positive: [
      { text: "very good unison", requiredForHighGoe: true },
      { text: "good controlled, clear positions (including height and air or landing position in a flying spin)", requiredForHighGoe: true },
      { text: "effortless throughout", requiredForHighGoe: false },
      { text: "good speed and/or acceleration during the spin", requiredForHighGoe: false },
      { text: "creativity", requiredForHighGoe: false },
      { text: "element matches the music", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Missing three or more revolutions", range: "-3 to -4", capsStartingGoeAtPlusTwo: true, note: "The cap applies to missing revolutions in the Short Program." },
      { error: "Change of foot poorly done", range: "-2 to -3", capsStartingGoeAtPlusTwo: true },
      { error: "Poor fly or incorrect take-off or landing", range: "-2 to -3", capsStartingGoeAtPlusTwo: true },
      { error: "Missing one or two revolutions", range: "-1 to -2", capsStartingGoeAtPlusTwo: true, note: "The cap applies to missing revolutions in the Short Program." },
      { error: "Touch down with the free foot or hand(s)", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Travelling", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Slow or reduction of speed", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Does not correspond to the music", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor, weak or awkward positions", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Loss of balance", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor exit", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Big distance between the partners", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Lack of unison", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
    ],
    sources: [comm("II, Pair Skating, Solo Spins; III, Solo and Pair Spins")],
  },
  {
    elementType: "pairSpin",
    name: "Pair spins",
    positive: [
      { text: "good control throughout by both partners", requiredForHighGoe: true },
      { text: "good speed and/or acceleration during the spin", requiredForHighGoe: true },
      { text: "effortless throughout", requiredForHighGoe: false },
      { text: "good control and balance on the entry and the exit", requiredForHighGoe: false },
      { text: "creativity", requiredForHighGoe: false },
      { text: "element matches the music", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Missing three or more revolutions", range: "-3 to -4", capsStartingGoeAtPlusTwo: true, note: "The cap applies to missing revolutions in the Short Program." },
      { error: "Change of foot poorly done", range: "-2 to -3", capsStartingGoeAtPlusTwo: true },
      { error: "Poor fly or incorrect take-off or landing", range: "-2 to -3", capsStartingGoeAtPlusTwo: true },
      { error: "Missing one or two revolutions", range: "-1 to -2", capsStartingGoeAtPlusTwo: true, note: "The cap applies to missing revolutions in the Short Program." },
      { error: "Touch down with the free foot or hand(s)", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Stop or lack of continuous movement during the pair spin (except when changing direction)", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Travelling", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Slow or reduction of speed", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Does not correspond to the music", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor, weak or awkward positions", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Loss of balance", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor exit", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Lack of unison", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
    ],
    notes: ["Revolutions executed while the woman is lifted count toward the total number of revolutions.", "A poor exit from the pair spin combination is -1 to -3."],
    sources: [comm("II, Pair Skating, Pair Spins; III, Solo and Pair Spins; IV, Pair Spin Combination")],
  },
  {
    elementType: "deathSpiral",
    name: "Death spirals",
    positive: [
      { text: "very good positions of both partners", requiredForHighGoe: true },
      { text: "good flow and speed throughout, including the entry and the exit", requiredForHighGoe: true },
      { text: "effortless throughout", requiredForHighGoe: false },
      { text: "good controlled transition into the required positions and on the exit", requiredForHighGoe: false },
      { text: "good, continuous edges demonstrated by the man and the woman", requiredForHighGoe: false },
      { text: "element matches the music", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Poor pivot position (losing the toe pick and similar)", range: "-2 to -4", capsStartingGoeAtPlusTwo: false },
      { error: "Any part of the woman's body (not her hair) touching the ice", range: "-1 to -2", capsStartingGoeAtPlusTwo: false },
      { error: "Poor, weak or awkward positions", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Man's or woman's position too high, or less than one revolution in the low position", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Weak edge quality", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Slow or reduction of speed", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor entry or exit", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
    ],
    sources: [comm("II, Pair Skating, Death Spirals; III, Death Spirals; IV, Death Spiral")],
  },
  {
    elementType: "step",
    name: "Step sequence",
    positive: [
      { text: "deep edges, clean steps and turns, control of the whole body", requiredForHighGoe: true },
      { text: "element matches the music", requiredForHighGoe: true },
      { text: "effortless throughout with good energy, flow and execution", requiredForHighGoe: false },
      { text: "good unison and distance between the partners", requiredForHighGoe: false },
      { text: "creativity of body movements including variations of the free foot", requiredForHighGoe: false },
      { text: "good ice coverage or interesting pattern", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Partly or fully does not correspond to the music", range: "-1 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Poor quality of steps and turns", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor quality of body positions", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Lack of flow and energy", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Stumble", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Lack of unison and spatial awareness", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
    ],
    sources: [comm("II, Pair Skating, Step Sequence; III, Steps")],
  },
  {
    elementType: "choreoSequence",
    name: "Choreographic sequence",
    positive: [
      { text: "element matches the music and reflects the concept or character of the program", requiredForHighGoe: true },
      { text: "creativity", requiredForHighGoe: true },
      { text: "effortless throughout with good energy, flow and execution", requiredForHighGoe: false },
      { text: "varied directions and pattern", requiredForHighGoe: false },
      { text: "oneness", requiredForHighGoe: false },
      { text: "excellent commitment and control of the whole body", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Partly or fully does not correspond to the music", range: "-1 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Lack of connection between movements", range: "-2 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Does not highlight the choreography", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor quality of movements or positions", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Loss of control, stumble", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Lack of energy", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Weak execution", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Small pattern", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
    ],
    notes: ["Not part of the Senior or Junior Free Skating in 2026-27."],
    sources: [comm("II, Pair Skating, Choreographic Sequence; III, Choreographic Elements")],
  },
  {
    elementType: "choreoPairLift",
    name: "Choreographic pair lift",
    positive: [
      { text: "element matches the music and reflects the concept or character of the program", requiredForHighGoe: true },
      { text: "creativity", requiredForHighGoe: true },
      { text: "effortless throughout", requiredForHighGoe: false },
      { text: "a highlight of the program", requiredForHighGoe: false },
      { text: "good controlled positions matching the music", requiredForHighGoe: false },
      { text: "intentional use of speed matching the music", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Partly or fully does not correspond to the music", range: "-1 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Does not highlight the choreography", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor quality of movements or positions", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Loss of control, stumble", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Lack of energy", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Weak execution", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
    ],
    notes: ["Each GOE grade is worth a fixed 0.50 (base value 4.50)."],
    sources: [comm("II, Pair Skating, Choreographic Pair Lift; III, Choreographic Elements"), sov],
  },
  {
    elementType: "choreoPairSpin",
    name: "Choreographic pair spin",
    positive: [
      { text: "element matches the music and reflects the concept or character of the program", requiredForHighGoe: true },
      { text: "creativity", requiredForHighGoe: true },
      { text: "effortless throughout", requiredForHighGoe: false },
      { text: "a highlight of the program", requiredForHighGoe: false },
      { text: "good controlled positions matching the music", requiredForHighGoe: false },
      { text: "intentional use of speed matching the music", requiredForHighGoe: false },
    ],
    reductions: [
      FALL,
      NO_MUSIC,
      { error: "Partly or fully does not correspond to the music", range: "-1 to -4", capsStartingGoeAtPlusTwo: true },
      { error: "Does not highlight the choreography", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Poor quality of movements or positions", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Loss of control, stumble (unintentional travelling)", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Lack of energy", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
      { error: "Weak execution", range: "-1 to -3", capsStartingGoeAtPlusTwo: false },
    ],
    notes: ["Each GOE grade is worth a fixed 0.50 (base value 3.50)."],
    sources: [comm("II, Pair Skating, Choreographic Pair Spin; III, Choreographic Elements"), sov],
  },
];

export const PAIR_GOE_NOTES = {
  partners: "Reductions for different errors add up, but a mistake by one partner, or the same mistake by both partners, is reduced once.",
  startingGoe: "As in singles: one positive bullet for +1 up to five or more for +5, with the first two bullets required for +4 and +5; any error that needs a reduction caps the starting GOE at +4.",
  capAtPlusTwo: [
    "Fall",
    "Landing on two feet",
    "Stepping out of the landing",
    "Wrong edge (e)",
    "Downgraded (<<)",
    "Poor take-off",
    "Two three turns between jumps",
    "Unequal number of revolutions by the partners in one or more jumps",
    "Serious problems during the lift",
    "Serious problems on the catch of the twist",
    "Spins with missing revolutions in the Short Program",
    "Spins with a poor change of foot",
    "Spins with a poor fly and/or incorrect take-off or landing",
    "Step sequences and choreographic sequences partly or fully not to the music",
    "Multiple errors in any element",
  ],
  clarifications: [
    { title: "Two-foot take-off in a lift", rule: "When a two-foot take-off is part of a difficult entry there is no reduction for starting on two feet, but the quality of the take-off is still evaluated.", sources: [comm("IV, Lifts")] },
    { title: "Lifted revolutions in the pair spin", rule: "Revolutions turned while the woman is lifted count toward the total; a poor exit from the pair spin combination costs -1 to -3.", sources: [comm("IV, Pair Spin Combination")] },
    { title: "Short low position in the death spiral", rule: "If the woman or the man has less than one revolution in the low position the reduction is -1 to -3.", sources: [comm("IV, Death Spiral")] },
    { title: "Short Program jump element with *", rule: "A Short Program jump element with * or not according to the requirements must receive a final GOE of -5.", sources: [comm("IV, Jumps")] },
  ] as RuleNote[],
  sources: [comm("II-IV")],
};

/* ------------------------------------------------------------------ */
/* 11. Elements with no value or a maximum level                        */
/* ------------------------------------------------------------------ */

/** The table at the end of the Technical Panel Handbook, Pair Skating 2026-27 (SP and FS columns as printed; N/A where the element is not in the 2026-27 Free Skating). */
export const PAIR_MAX_LEVEL_TABLE: PairMaxLevelRow[] = [
  { section: "All elements with levels", problem: "Wrong element", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" },
  { section: "All elements with levels", problem: "Illegal element or movement, if the Basic level requirements are met (the technical panel applies the illegal-element deduction)", maxLevelShortProgram: "Basic + deduction", maxLevelFreeSkating: "Basic + deduction" },
  { section: "Step sequence", problem: "Not fully utilising the ice surface", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" },
  { section: "Step sequence", problem: "No basic variety of steps and turns throughout the sequence", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" },
  { section: "Step sequence", problem: "No minimum variety of steps and turns throughout the sequence", maxLevelShortProgram: "Basic", maxLevelFreeSkating: "N/A" },
  { section: "Step sequence", problem: "Only minimum variety of steps and turns throughout the sequence", maxLevelShortProgram: "1", maxLevelFreeSkating: "N/A" },
  { section: "Step sequence", problem: "Only simple variety of steps and turns throughout the sequence", maxLevelShortProgram: "2", maxLevelFreeSkating: "N/A" },
  { section: "Step sequence", problem: "Steps and turns not balanced in their distribution through the sequence", maxLevelShortProgram: "Basic", maxLevelFreeSkating: "N/A" },
  { section: "Step sequence", problem: "Workload between the partners not even", maxLevelShortProgram: "Basic", maxLevelFreeSkating: "N/A" },
  { section: "Solo spin combination (Novice)", problem: "Not at least two continuous revolutions in two basic positions", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" },
  { section: "Solo spin combination with change of foot", problem: "Fewer than two basic positions with two revolutions", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" },
  { section: "Solo spin combination with change of foot", problem: "Two basic positions with two revolutions", maxLevelShortProgram: "Any, V", maxLevelFreeSkating: "N/A" },
  { section: "Solo spin combination with change of foot", problem: "Change of foot with fewer than three revolutions before or after", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" },
  { section: "Pair spin combination", problem: "One or both partners without at least two continuous revolutions in two basic positions", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" },
  { section: "Pair spin combination", problem: "Fewer than three continuous revolutions on both feet by one or both partners", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" },
  { section: "Pair spin combination", problem: "Change of foot with fewer than three continuous revolutions on one foot before or after, by one or both partners", maxLevelShortProgram: "Any, V", maxLevelFreeSkating: "N/A" },
  { section: "Pair spin combination", problem: "All difficult variations executed by the woman, or all by the man (feature 1)", maxLevelShortProgram: "Any, no feature 1", maxLevelFreeSkating: "N/A" },
  { section: "Pair spin combination", problem: "Fewer than three basic positions with two revolutions", maxLevelShortProgram: "Any, V", maxLevelFreeSkating: "N/A" },
  { section: "Lifts", problem: "Illegal hold", maxLevelShortProgram: "Basic + deduction", maxLevelFreeSkating: "Basic + deduction" },
  { section: "Lifts", problem: "Fewer than the minimum one revolution by the man", maxLevelShortProgram: "No value", maxLevelFreeSkating: "No value" },
  { section: "Lifts", problem: "Man's arms never extended (Groups 3, 4 and 5)", maxLevelShortProgram: "No value", maxLevelFreeSkating: "No value" },
  { section: "Lifts", problem: "Wrong take-off", maxLevelShortProgram: "No value", maxLevelFreeSkating: "N/A" },
  { section: "Death spiral", problem: "Man does not stay in the pivot with knee clearly bent and arm extended for one revolution", maxLevelShortProgram: "No value", maxLevelFreeSkating: "No value" },
  { section: "Death spiral", problem: "Man and woman do not stay simultaneously in the low position for one revolution", maxLevelShortProgram: "1", maxLevelFreeSkating: "1" },
  { section: "Death spiral", problem: "Woman's head never reaches the level of her skating knee", maxLevelShortProgram: "No value", maxLevelFreeSkating: "No value" },
];

export const PAIR_MAX_LEVEL_TABLE_NOTE = {
  note: "The pair is awarded the lower level achieved by the two partners. N/A marks elements that are not in the 2026-27 Senior and Junior Free Skating.",
  sources: [tp("Elements with no value or maximum Level B/1/2/3 in Pairs SP & FS 2026-2027")],
};
