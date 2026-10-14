import type { JumpType, JumpSign } from "./types";

/**
 * The six listed jumps plus the Euler. Feet are given for a counter-clockwise skater
 * (the large majority); a clockwise skater mirrors every foot. Definitions follow
 * Rule 504 (difficulty order), Rule 610-612 and the Technical Panel Handbook, Jump Elements.
 */
export const JUMPS: JumpType[] = [
  {
    id: "T",
    slug: "toe-loop",
    name: "Toe loop",
    aliases: ["Toe", "Toeloop", "Toe Walley (called as a toe loop)"],
    listed: true,
    difficultyRank: 1,
    takeOff: { foot: "right", edge: "outside", direction: "backward", toePick: true, toePickFoot: "left" },
    landing: { foot: "right", edge: "outside", direction: "backward" },
    extraHalfRevolution: false,
    rotations: [1, 2, 3, 4, 5],
    summary:
      "The easiest listed jump and the most common second jump in a combination: a back outside edge on the right foot, vaulted with the left toe pick.",
    mechanics: [
      "Skater glides backward on the right outside edge, reaches back with the left leg and plants the toe pick.",
      "The pick acts as a pole-vault point; the skater turns and lifts off the right foot as the left toe stays in the ice.",
      "Lands backward on the right outside edge, the same foot and edge it took off from, which is why it chains so easily after other jumps.",
    ],
    howToSpot: [
      "Look for the toe pick planted behind the skater just before the jump and a landing on the same foot.",
      "It almost always appears after a plus sign in a protocol (4T+3T, 3Lz+3T).",
    ],
    commonErrors: [
      "Toe Axel: the skater turns forward on the ice before leaving it. A clear forward take-off is a downgrade (<<).",
      "Taking off from the whole blade instead of the toe pick is a poor take-off (GOE -2 to -4, starting GOE capped at +2).",
    ],
    sources: [{ doc: "tpSingles", where: "Jump Elements: Cheated take-off, Non-listed jumps" }, { doc: "comm2788", where: "IV, Jumps" }],
  },
  {
    id: "S",
    slug: "salchow",
    name: "Salchow",
    aliases: ["Sal"],
    listed: true,
    difficultyRank: 2,
    takeOff: { foot: "left", edge: "inside", direction: "backward", toePick: false },
    landing: { foot: "right", edge: "outside", direction: "backward" },
    extraHalfRevolution: false,
    rotations: [1, 2, 3, 4, 5],
    summary:
      "An edge jump from the back inside edge of the left foot, with a sweeping free leg; named after Ulrich Salchow, who first landed it in 1909.",
    mechanics: [
      "Usually entered from a forward outside three turn onto the left back inside edge.",
      "The free (right) leg swings forward and around; the skater springs from the deeply bent left knee without any toe pick.",
      "Lands backward on the right outside edge.",
    ],
    howToSpot: [
      "No toe pick: the take-off is a scoop from a curving edge, and the free leg visibly swings through.",
      "Often follows an Euler in a three-jump combination (for example 3Lz+1Eu+3S) because the Euler lands on the back inside edge the Salchow needs.",
    ],
    commonErrors: [
      "Assisting the take-off with the free foot on the ice counts as a poor take-off (GOE -2 to -4, starting GOE capped at +2).",
      "Excessive rotation on the ice before leaving it is also a poor take-off.",
    ],
    sources: [{ doc: "comm2788", where: "IV, Jumps: Poor take-off" }, { doc: "tpSingles", where: "Jump Elements" }],
  },
  {
    id: "Lo",
    slug: "loop",
    name: "Loop",
    aliases: ["Rittberger"],
    listed: true,
    difficultyRank: 3,
    takeOff: { foot: "right", edge: "outside", direction: "backward", toePick: false },
    landing: { foot: "right", edge: "outside", direction: "backward" },
    extraHalfRevolution: false,
    rotations: [1, 2, 3, 4, 5],
    summary:
      "An edge jump that takes off and lands on the same back outside edge of the right foot, so the skater rotates from a crossed, sitting-back position.",
    mechanics: [
      "Skater glides backward on the right outside edge with the left foot crossed in front.",
      "Springs straight from the edge, with no toe assist and no swinging free leg to help.",
      "Lands backward on the right outside edge, the same edge it left.",
    ],
    howToSpot: [
      "Both feet are close together and crossed before take-off; nothing is planted in the ice.",
      "Because it starts from the landing edge of every other jump, it is the natural third jump of a combination (3Lz+3Lo).",
    ],
    commonErrors: [
      "Under-rotation is common because there is no toe or free-leg assistance; watch for q, < and << calls.",
      "A two-footed take-off, with the left foot pushing, is a poor take-off.",
    ],
    sources: [{ doc: "rules2026", where: "Rule 504" }, { doc: "tpSingles", where: "Jump Elements" }],
  },
  {
    id: "F",
    slug: "flip",
    name: "Flip",
    listed: true,
    difficultyRank: 4,
    takeOff: { foot: "left", edge: "inside", direction: "backward", toePick: true, toePickFoot: "right" },
    landing: { foot: "right", edge: "outside", direction: "backward" },
    extraHalfRevolution: false,
    rotations: [1, 2, 3, 4, 5],
    summary:
      "A toe jump from the back inside edge of the left foot, picked with the right toe. The edge is what the technical panel checks: an outside edge makes it a 'lip'.",
    mechanics: [
      "Typically entered from a forward outside three turn, leaving the skater on a back inside edge.",
      "The right toe pick is planted behind; the skater vaults and rotates in the natural direction of the curve.",
      "Lands backward on the right outside edge.",
    ],
    howToSpot: [
      "Toe pick behind plus a take-off foot that is leaning inward (inside edge). A three turn entry just before is the usual tell.",
      "Protocol code F; 3F! or 3Fe means the panel questioned or rejected the take-off edge.",
    ],
    commonErrors: [
      "Wrong edge (e): the take-off edge rolls to the outside. The base value drops to the 'e' row of the Scale of Values and GOE is reduced -2 to -4.",
      "Unclear edge (!): the edge is flat or ambiguous. Base value stays, GOE is reduced.",
    ],
    sources: [{ doc: "tpSingles", where: "Taking off from wrong edge (Flip/Lutz)" }, { doc: "comm2788", where: "IV, Jumps" }],
  },
  {
    id: "Lz",
    slug: "lutz",
    name: "Lutz",
    listed: true,
    difficultyRank: 5,
    takeOff: { foot: "left", edge: "outside", direction: "backward", toePick: true, toePickFoot: "right" },
    landing: { foot: "right", edge: "outside", direction: "backward" },
    extraHalfRevolution: false,
    rotations: [1, 2, 3, 4, 5],
    summary:
      "The hardest toe jump: a long back outside edge on the left foot that curves one way while the skater rotates the other, picked with the right toe.",
    mechanics: [
      "A long glide on the left back outside edge, usually a diagonal across the rink corner, curving to the left.",
      "The right toe pick is planted behind and the skater rotates counter-clockwise, against the curve of the entry edge. This counter-rotation is what makes it hard.",
      "Lands backward on the right outside edge.",
    ],
    howToSpot: [
      "The long straight-ish entry from the corner with the skater leaning outward on the left foot, then a toe pick.",
      "If the edge rolls inward before the pick it is a 'flutz' and gets an e or ! call.",
    ],
    commonErrors: [
      "Wrong edge (e): taking off from an inside edge turns it into a flip-like jump. Base value drops to the 'e' row and GOE is reduced -2 to -4.",
      "Unclear edge (!): base value stays, GOE reduced.",
    ],
    sources: [{ doc: "tpSingles", where: "Taking off from wrong edge (Flip/Lutz)" }, { doc: "sov2786" }],
  },
  {
    id: "A",
    slug: "axel",
    name: "Axel",
    aliases: ["Axel Paulsen"],
    listed: true,
    difficultyRank: 6,
    takeOff: { foot: "left", edge: "outside", direction: "forward", toePick: false },
    landing: { foot: "right", edge: "outside", direction: "backward" },
    extraHalfRevolution: true,
    rotations: [1, 2, 3, 4],
    summary:
      "The only jump that takes off forward, so it carries an extra half revolution: a triple Axel is three and a half turns in the air. Named after Axel Paulsen.",
    mechanics: [
      "Skater steps forward onto the left outside edge and swings the right leg and both arms through to lift off.",
      "Because the take-off faces forward and the landing faces backward, every Axel rotates half a turn more than its name says.",
      "Lands backward on the right outside edge.",
    ],
    howToSpot: [
      "The only jump where the skater is facing the way they travel at take-off.",
      "A single Axel is the first jump most beginners fear; a quad Axel (4.5 revolutions) has the highest base value in the Scale of Values at 12.50.",
    ],
    commonErrors: [
      "A backward take-off on an Axel-type jump is a cheat and is downgraded.",
      "A waltz jump used only as preparation for the next jump is not called at all.",
    ],
    sources: [{ doc: "tpSingles", where: "Jump Elements: Cheated take-off" }, { doc: "sov2786" }],
  },
  {
    id: "Eu",
    slug: "euler",
    name: "Euler",
    aliases: ["Half loop", "Thoren"],
    listed: false,
    difficultyRank: 0,
    takeOff: { foot: "right", edge: "outside", direction: "backward", toePick: false },
    landing: { foot: "left", edge: "inside", direction: "backward" },
    extraHalfRevolution: false,
    rotations: [1],
    summary:
      "A one-revolution connecting jump that lands on the back inside edge of the opposite foot, which is exactly the take-off edge a Salchow or Flip needs.",
    mechanics: [
      "Takes off like a loop from the right back outside edge.",
      "Makes one revolution and lands on the left foot, back inside edge, instead of the right.",
      "Immediately followed by a Salchow or Flip: that is its only purpose in competition.",
    ],
    howToSpot: [
      "Written 1Eu inside a combination, for example 3A+1Eu+3S.",
      "It has a base value of 0.00 and does not count toward the number of jumps in the combination.",
    ],
    commonErrors: [
      "Allowed once per Free Skating, between two listed jumps; never in a Short Program combination.",
      "If it is not clearly jumped (a step-over), the judges reduce GOE by -2 to -3. The panel never marks it q, < or <<.",
    ],
    sources: [{ doc: "rules2026", where: "Rule 610" }, { doc: "tpSingles", where: "Jump combination: General" }, { doc: "comm2788", where: "IV, Jumps: Euler" }],
  },
];

export const ROTATION_NAMES: Record<number, string> = {
  1: "single",
  2: "double",
  3: "triple",
  4: "quadruple",
  5: "quintuple",
};

export const ROTATION_SHORT: Record<number, string> = { 1: "single", 2: "double", 3: "triple", 4: "quad", 5: "quint" };

/** Signs the technical panel attaches to a jump code and what they do to the value. */
export const JUMP_SIGNS: JumpSign[] = [
  {
    sign: "q",
    name: "Landed on the quarter",
    meaning: "The jump is missing exactly a quarter revolution on landing.",
    baseValueEffect: "No change to the base value.",
    goeEffect: "Judges reduce by -2; the starting GOE cannot exceed +3 because 'good take-off and landing' cannot be awarded, so the best possible final GOE is +1.",
    appliesTo: "Jumps, throw jumps",
    sources: [{ doc: "tpSingles", where: "Landed on the quarter" }, { doc: "refJudges", where: "Jump Elements Q&A" }],
  },
  {
    sign: "<",
    name: "Under-rotated",
    meaning: "Missing more than a quarter but less than half a revolution.",
    baseValueEffect: "Reduced base value, the '<' row of the Scale of Values (80% of the clean jump).",
    goeEffect: "Reduction of -2 to -3.",
    appliesTo: "Jumps, throw jumps",
    sources: [{ doc: "tpSingles", where: "Under-rotated jumps" }, { doc: "sov2786" }],
  },
  {
    sign: "<<",
    name: "Downgraded",
    meaning: "Missing half a revolution or more, or a clearly cheated take-off (forward on a toe loop, backward on an Axel).",
    baseValueEffect: "Valued as the jump with one rotation less (a downgraded triple is paid as a double).",
    goeEffect: "Reduction of -3 to -4 and the starting GOE cannot be higher than +2.",
    appliesTo: "Jumps, throw jumps, twist lifts",
    sources: [{ doc: "tpSingles", where: "Downgraded jumps, Cheated take-off" }, { doc: "comm2788", where: "IV" }],
  },
  {
    sign: "e",
    name: "Wrong edge",
    meaning: "A Flip taken off from an outside edge or a Lutz from an inside edge, when the error is definite.",
    baseValueEffect: "Reduced base value from the 'e' row of the Scale of Values.",
    goeEffect: "Reduction of -2 to -4; starting GOE capped at +2.",
    appliesTo: "Flip and Lutz (also combined with q, < and <<)",
    sources: [{ doc: "tpSingles", where: "Taking off from wrong edge" }, { doc: "comm2788", where: "III, Jump elements" }],
  },
  {
    sign: "!",
    name: "Unclear edge",
    meaning: "The Flip or Lutz take-off edge was flat or ambiguous rather than clearly wrong.",
    baseValueEffect: "Base value unchanged.",
    goeEffect: "Reduction of -1 to -3.",
    appliesTo: "Flip and Lutz",
    sources: [{ doc: "tpSingles", where: "Taking off from wrong edge" }],
  },
  {
    sign: "b",
    name: "Bonus (Advanced Novice only)",
    meaning: "Marks jumps eligible for the Advanced Novice bonus. Not used in Junior or Senior events.",
    baseValueEffect: "Same base value as the plain code in the Scale of Values.",
    goeEffect: "None.",
    appliesTo: "Advanced Novice single and pair skating",
    sources: [{ doc: "sov2786", where: "Legend" }],
  },
  {
    sign: "REP",
    name: "Repetition",
    meaning: "A triple, quad or quint repeated as a solo jump (neither execution in a combination or sequence), or a jump element beyond the allowed number of combinations and sequences.",
    baseValueEffect: "The second element gets 80% of its base value, rounded to two decimals (3A+REP = 6.40).",
    goeEffect: "No reduction unless there is another mistake.",
    appliesTo: "Free Skating jump elements",
    sources: [{ doc: "tpSingles", where: "First repetition of a triple/quad/quint jump" }, { doc: "refJudges", where: "Jump Elements Q&A" }],
  },
  {
    sign: "COMBO",
    name: "Combination with a missing jump",
    meaning: "A planned combination where the second jump was not performed, or jumps after a fall or step-out are not counted (3T+COMBO+2T*).",
    baseValueEffect: "Only the jumps before the marker count; in the Short Program the element is 'not according to requirements'.",
    goeEffect: "In the Short Program the final GOE must be -5.",
    appliesTo: "Jump combinations",
    sources: [{ doc: "tpSingles", where: "No second jump in a jump combination" }, { doc: "comm2788", where: "IV, Jumps" }],
  },
  {
    sign: "SEQ",
    name: "Jump sequence",
    meaning: "Two or three jumps where the second or third is an Axel-type jump entered with a direct step from the previous landing curve.",
    baseValueEffect: "Each jump receives its full value; the GOE of the hardest jump applies to the unit.",
    goeEffect: "Evaluated as one unit.",
    appliesTo: "Free Skating only",
    sources: [{ doc: "rules2026", where: "Rule 610, Jump Sequences" }],
  },
  {
    sign: "*",
    name: "No value",
    meaning: "The element or jump is not according to the requirements: an extra jump, a repeated jump beyond the rules, a jump after a fall inside a combination.",
    baseValueEffect: "0.00; the element still occupies a box.",
    goeEffect: "Short Program: final GOE -5. Free Skating: the GOE applies to the whole element performed.",
    appliesTo: "Any element",
    sources: [{ doc: "tpSingles", where: "Calling procedure" }, { doc: "refJudges", where: "Jump Elements Q&A" }],
  },
];

export const JUMP_BY_ID = Object.fromEntries(JUMPS.map((j) => [j.id, j])) as Record<JumpType["id"], JumpType>;
export const JUMP_BY_SLUG = Object.fromEntries(JUMPS.map((j) => [j.slug, j])) as Record<string, JumpType>;

/** Calling rules from the Technical Panel Handbook, Jump Elements, that decide what code a jump gets. */
export const JUMP_CALLING_RULES: { title: string; rule: string }[] = [
  { title: "Over-rotation", rule: "A jump turned more than a quarter past its name is called as the next jump up and downgraded: a double toe loop with an extra quarter and more becomes 3T<<, valued as a double." },
  { title: "Popped jumps", rule: "A jump that opens up into a single still counts as an attempt and uses a jump slot. A small hop or jump of up to half a revolution done as decoration is not a jump; it goes into the Composition mark." },
  { title: "What is an attempt", rule: "A clear preparation for take-off (stepping onto the entry edge, planting the toe pick, leaving the ice with or without a turn) is an attempt: it receives no value and blocks a box. Falling on a loop take-off before leaving the ice can also be called an attempt." },
  { title: "Wrong foot or wrong edge on landing", rule: "In a combination or sequence every jump but the last may land on either foot. Landing the last jump on the wrong foot, or any jump on the wrong edge, keeps the call but costs GOE (weak landing, -1 to -3)." },
  { title: "Listed plus non-listed jumps", rule: "When a listed jump is preceded or followed by non-listed jumps (Walley, split jump, inside Axel, half-rotation jumps), only the listed jump is called, as a solo jump." },
  { title: "Euler with missing rotation", rule: "An Euler short of its revolution is never marked q, < or <<; a step-over Euler costs -2 to -3 in GOE instead." },
  { title: "Spin and jump back to back", rule: "A spin followed immediately by a jump, or the reverse, is two separate elements. The difficult take-off or entry is rewarded in GOE, but a jump after a spin is not a difficult exit of the spin." },
  { title: "Non-listed jumps", rule: "Walley, split jump, inside Axel and similar jumps are not in the Scale of Values. They never count as jump elements but can serve as creative entries, judged in Composition. A toe Walley is called and counted as a toe loop." },
];
