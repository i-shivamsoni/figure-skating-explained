import type { SpinPosition, SpinVariationCategory, LevelFeature, SpinFamily } from "./types";

/** Rule 610 and the Technical Panel Handbook, Spins. */
export const SPIN_POSITIONS: SpinPosition[] = [
  {
    id: "camel",
    name: "Camel",
    basic: true,
    codeLetter: "C",
    definition: "Free leg extended backward with the knee higher than the hip; the body is roughly horizontal like an arabesque on one skate.",
    notes: ["If the upper body rises too close to upright during a difficult variation, the variation is not credited but the position is still a camel."],
  },
  {
    id: "sit",
    name: "Sit",
    basic: true,
    codeLetter: "S",
    definition: "The upper part of the skating leg (the thigh) is at least parallel to the ice; the skater spins in a crouch.",
  },
  {
    id: "upright",
    name: "Upright",
    basic: true,
    codeLetter: "U",
    definition: "Any position on an extended or slightly bent skating leg that is not a camel. Layback, sideways leaning and Biellmann positions all count as upright.",
  },
  {
    id: "layback",
    name: "Layback",
    basic: true,
    codeLetter: "L",
    definition: "An upright spin with the head and shoulders leaning backward and the back arched. The free leg position is optional.",
    notes: ["In the Senior and Junior Women's Short Program the layback or sideways leaning position must be held for eight revolutions before a Biellmann can be taken."],
  },
  {
    id: "sideways",
    name: "Sideways leaning",
    basic: true,
    codeLetter: "L",
    definition: "An upright spin with the head and shoulders leaning sideways and the upper body arched. Shares the L code with the layback.",
  },
  {
    id: "biellmann",
    name: "Biellmann",
    basic: false,
    definition: "A difficult variation of the upright position: the free leg is pulled from behind above and toward the top of the head, close to the spinning axis.",
    notes: ["A Free Skating spin that starts in a layback for at least two revolutions and continues into a Biellmann is still called a layback spin."],
  },
];

/** The ten categories of difficult variations. Each category counts once per program, the first time it is attempted. */
export const VARIATION_CATEGORIES: SpinVariationCategory[] = [
  { id: "CF", position: "camel", name: "Camel forward", definition: "Shoulder line parallel to the ice." },
  { id: "CS", position: "camel", name: "Camel sideways", definition: "Shoulder line twisted to a vertical position; must also include a movement that affects the balance of the body core." },
  { id: "CU", position: "camel", name: "Camel upward", definition: "Shoulder line twisted beyond vertical." },
  { id: "SF", position: "sit", name: "Sit forward", definition: "Free leg forward, with a movement that affects the balance of the body core." },
  { id: "SS", position: "sit", name: "Sit sideways", definition: "Free leg sideways, with a movement that affects the balance of the body core (for example arms under the leg with the torso bent down)." },
  { id: "SB", position: "sit", name: "Sit behind", definition: "Free leg behind the skating leg." },
  { id: "UF", position: "upright", name: "Upright forward", definition: "Torso leaning forward." },
  { id: "US", position: "upright", name: "Upright straight or sideways", definition: "Torso straight up or sideways. The crossfoot spin, on both feet with toes together and heels apart, belongs here." },
  { id: "UB", position: "upright", name: "Upright Biellmann", definition: "Free leg pulled above the head toward the spinning axis." },
  { id: "UL", position: "layback", name: "Upright layback", definition: "The layback position itself when used as a difficult variation." },
];

/** Level features for spins (Technical Panel Handbook 2026-27, Spins: Level features). */
export const SPIN_LEVEL_FEATURES: LevelFeature[] = [
  { number: 1, name: "Difficult variation", detail: "A movement of a body part, leg, arm, hand or head that needs strength or flexibility and affects the balance of the body core, held for two revolutions. Only two difficult variations count in any spin and each of the ten categories counts once per program." },
  { number: 2, name: "Change of foot executed by jump", detail: "Counts only if a camel or sit position is reached within two revolutions after landing; not credited into an upright position.", countsOncePerProgram: true },
  { number: 3, name: "Jump within a spin without changing feet", detail: "A clear jump landed on the same foot, with the basic position reached within two revolutions after landing.", countsOncePerProgram: true },
  { number: 4, name: "Difficult change of position on the same foot", detail: "Basic to basic position with continuous movement, no jump and no non-basic position in between; both positions held two revolutions. An illusion can count here.", countsOncePerProgram: true },
  { number: 5, name: "Difficult entrance", detail: "Preparation immediately before the spin that significantly affects balance, control and execution; the basic position must be reached within two revolutions.", countsOncePerProgram: true },
  { number: 6, name: "Difficult exit", detail: "A movement or jump that makes leaving the spin significantly harder. Entrance and exit must be in different spins and of different nature.", countsOncePerProgram: true, mandatoryForLevel4: true },
  { number: 7, name: "Clear change of edge", detail: "Two revolutions on one edge then two on the other in the same position; in sit only from back inside to forward outside, also in camel, layback, Biellmann or a difficult upright variation.", countsOncePerProgram: true, mandatoryForLevel4: true },
  { number: 8, name: "Both directions immediately following each other", detail: "Clockwise and counter-clockwise in sit, camel, layback or a difficult upright variation, at least three revolutions in each direction.", countsOncePerProgram: true, mandatoryForLevel4: true },
  { number: 9, name: "Clear increase of speed", detail: "In camel, sit, layback, Biellmann or a difficult upright variation once the position is established (not in a crossfoot spin).", countsOncePerProgram: true, mandatoryForLevel4: true },
  { number: 10, name: "At least 8 revolutions without changes", detail: "No change of position, variation, foot or edge, in camel, layback or a difficult variation of any basic position. Counts in the first spin where it is achieved.", countsOncePerProgram: true },
  { number: 11, name: "Difficult variation of flying entry", detail: "A clearly visible jump into a genuinely difficult air position: a full sit or open butterfly into a flying sit, a butterfly or near-split into a flying camel.", countsOncePerProgram: true, mandatoryForLevel4: true },
  { number: 12, name: "Difficult blade feature", detail: "Using the blade in a way that changes balance and control, for example spinning on the heel or toe, in camel, sit, layback, Biellmann or a difficult upright variation.", countsOncePerProgram: true },
  { number: 13, name: "Windmills (three in a row)", detail: "Three consecutive windmill movements each reaching close to a split (at least 135 degrees), without hands touching the ice.", countsOncePerProgram: true, mandatoryForLevel4: true },
  { number: 14, name: "Layback: change of position backward to sideways (or reverse)", detail: "At least two revolutions in each position without rising to upright. Counts if the layback is part of any spin.", countsOncePerProgram: true },
  { number: 15, name: "Biellmann position after a layback", detail: "In the Short Program only after eight revolutions in the layback or sideways position (six for Advanced Novice).", countsOncePerProgram: true },
];

export const SPIN_LEVEL_RULES = [
  "Level is the number of features counted: Basic for none, Level 1 for one, Level 2 for two, Level 3 for three, Level 4 for four or more.",
  "To reach Level 4 one of the six mandatory features must be counted: difficult exit, clear change of edge, both directions, clear increase of speed, difficult variation of flying entry, or windmills.",
  "Features 2 to 9 and 11 to 15 count only once per program, the first time they are attempted. Feature 10 counts once, in the first spin where it succeeds.",
  "Only two difficult variations are counted in any spin, and each of the ten variation categories counts once per program.",
  "In a spin with change of foot, at most two features are counted on one foot.",
  "A feature executed together with a used difficult variation (same moment) is not counted.",
];

export const V_SIGN_CASES = [
  "Flying spin: the skater steps over instead of clearly jumping.",
  "Spin combination: only two basic positions were held for two revolutions (full value needs all three).",
  "Any change-of-foot spin with fewer than three revolutions on one foot (Free Skating only).",
  "Spin in one position with change of foot where one foot has no basic position for two revolutions (Free Skating only).",
];

/** Code families as they appear in the Scale of Values. Grammar: [F][C](U|L|C|S|Co)Sp(B|1-4)[V]. */
export const SPIN_FAMILIES: SpinFamily[] = [
  { code: "USp", name: "Upright spin", description: "One upright position, no change of foot.", flying: false, changeOfFoot: false, combination: false, position: "U", usage: ["Short Program spin in one position (Women, if the layback is not chosen)", "Free Skating"] },
  { code: "LSp", name: "Layback spin", description: "Layback or sideways leaning position, no change of foot.", flying: false, changeOfFoot: false, combination: false, position: "L", usage: ["Short Program spin in one position (Senior and Junior Women)", "Free Skating"] },
  { code: "CSp", name: "Camel spin", description: "Camel position, no change of foot.", flying: false, changeOfFoot: false, combination: false, position: "C", usage: ["Short Program spin in one position (Women)", "Free Skating"] },
  { code: "SSp", name: "Sit spin", description: "Sit position, no change of foot.", flying: false, changeOfFoot: false, combination: false, position: "S", usage: ["Short Program spin in one position (Women)", "Free Skating"] },
  { code: "FUSp", name: "Flying upright spin", description: "Jumped entry landing in an upright position.", flying: true, changeOfFoot: false, combination: false, position: "U", usage: ["Short Program flying spin (Senior)", "Free Skating flying spin"] },
  { code: "FLSp", name: "Flying layback spin", description: "Jumped entry landing in a layback.", flying: true, changeOfFoot: false, combination: false, position: "L", usage: ["Short Program flying spin (Senior)", "Free Skating flying spin"] },
  { code: "FCSp", name: "Flying camel spin", description: "The classic flying spin: a jump with a split or butterfly air position landing in a camel.", flying: true, changeOfFoot: false, combination: false, position: "C", usage: ["Short Program flying spin (Senior; prescribed for Juniors in 2026-27)", "Free Skating flying spin"] },
  { code: "FSSp", name: "Flying sit spin", description: "Jumped entry, often a tucked sit in the air, landing in a sit position.", flying: true, changeOfFoot: false, combination: false, position: "S", usage: ["Short Program flying spin (Senior)", "Free Skating flying spin"] },
  { code: "CUSp", name: "Change-foot upright spin", description: "Upright position on both feet with one change of foot.", flying: false, changeOfFoot: true, combination: false, position: "U", usage: ["Free Skating"] },
  { code: "CLSp", name: "Change-foot layback spin", description: "Layback on both feet.", flying: false, changeOfFoot: true, combination: false, position: "L", usage: ["Free Skating"] },
  { code: "CCSp", name: "Change-foot camel spin", description: "Camel on both feet with one change of foot.", flying: false, changeOfFoot: true, combination: false, position: "C", usage: ["Short Program spin in one position (Senior Men; prescribed Junior Men 2027-28)", "Free Skating"] },
  { code: "CSSp", name: "Change-foot sit spin", description: "Sit on both feet with one change of foot.", flying: false, changeOfFoot: true, combination: false, position: "S", usage: ["Short Program spin in one position (Senior Men; prescribed Junior Men 2026-27)", "Free Skating"] },
  { code: "FCUSp", name: "Flying change-foot upright spin", description: "Flying entry plus a change of foot, upright.", flying: true, changeOfFoot: true, combination: false, position: "U", usage: ["Free Skating"] },
  { code: "FCLSp", name: "Flying change-foot layback spin", description: "Flying entry plus a change of foot, layback.", flying: true, changeOfFoot: true, combination: false, position: "L", usage: ["Free Skating"] },
  { code: "FCCSp", name: "Flying change-foot camel spin", description: "Flying entry plus a change of foot, camel.", flying: true, changeOfFoot: true, combination: false, position: "C", usage: ["Free Skating"] },
  { code: "FCSSp", name: "Flying change-foot sit spin", description: "Flying entry plus a change of foot, sit.", flying: true, changeOfFoot: true, combination: false, position: "S", usage: ["Free Skating"] },
  { code: "CoSp", name: "Combination spin, no change of foot", description: "At least two basic positions on one foot; full value needs all three.", flying: false, changeOfFoot: false, combination: true, usage: ["Free Skating spin combination"] },
  { code: "FCoSp", name: "Flying combination spin, no change of foot", description: "Flying entry, at least two basic positions, one foot.", flying: true, changeOfFoot: false, combination: true, usage: ["Free Skating spin combination"] },
  { code: "CCoSp", name: "Change-foot combination spin", description: "At least two basic positions with a change of foot; the standard Short Program combination spin.", flying: false, changeOfFoot: true, combination: true, usage: ["Short Program spin combination (all categories)", "Free Skating spin combination"] },
  { code: "FCCoSp", name: "Flying change-foot combination spin", description: "Flying entry, change of foot, at least two basic positions.", flying: true, changeOfFoot: true, combination: true, usage: ["Free Skating spin combination"] },
];

export const SPIN_REQUIREMENTS = {
  general: [
    "A position must be held for at least two revolutions without interruption to count; a spin with fewer than three total rotations is a skating movement, not a spin.",
    "A change of foot must be preceded and followed by a position of at least three revolutions, otherwise the spin has no value in the Short Program and is marked V in Free Skating.",
    "Spin combinations need at least two different basic positions with two revolutions each; all three basic positions are needed for full value.",
    "All spins in a program must have a different abbreviation; a repeated character is not counted but still fills a box.",
  ],
  shortProgram: [
    "Three spins: a flying spin, a spin in one position, and a spin combination with only one change of foot.",
    "Flying spin: eight revolutions in the landing position, no rotation on the ice before take-off. Seniors may choose any flying spin whose landing position differs from their spin in one position; Juniors must do the prescribed flying camel in 2026-27.",
    "Spin in one position: Senior Men camel or sit with one change of foot, six revolutions on each foot; Senior Women layback/sideways, sit or camel without change of foot, eight revolutions. Junior Men sit spin with one change of foot; Junior Women layback/sideways or sit spin.",
    "Spin combination: one change of foot, six revolutions on each foot.",
    "Except flying spins, spins cannot start with a jump.",
  ],
  freeSkating: [
    "Maximum three spins: one spin combination (change of foot optional), one flying spin (no change of foot or position), one choreographic spin.",
    "Minimum revolutions: six for the flying spin, ten for the spin combination, counted from entry to exit.",
    "Multiple changes of foot are allowed in Free Skating; a second change is a wrong element in the Short Program.",
  ],
};

/** Further clarifications from the Technical Panel Handbook, Spins. */
export const SPIN_CLARIFICATIONS: { title: string; rule: string }[] = [
  { title: "Weight transfer ends the spin", rule: "A clear transfer of weight during a spin finishes it; only the part before the transfer is called and counted for features." },
  { title: "Two spinning centres", rule: "If the centres before and after a change of foot are far apart with an exit curve and an entry curve between them, the Short Program spin has no value and in Free Skating only the first part counts." },
  { title: "Toe Arabian", rule: "A Toe Arabian (butterfly with a toe-pick push) is allowed as a change of foot: it counts as a change of foot executed by jump in both programs. As a flying entry it can earn the difficult-fly feature." },
  { title: "Travelling threes", rule: "Three turns travelling into the spin are a difficult entrance only if at least two revolutions are turned without the free foot touching the ice, and the basic position arrives within two revolutions." },
  { title: "Headless spin", rule: "A named upright variation: the head and neck move backward off the main axis so the balance is affected." },
  { title: "Illusion", rule: "A single windmill movement counts as difficult only near a full split (135 degrees). It can be the difficult change of position; it is no longer a difficult entry or exit unless the blade is held on the spinning foot." },
  { title: "Crossfoot spin", rule: "On both feet with equal weight, toes close, heels open: a difficult upright variation credited to the foot before the cross. Increasing speed in it is not a feature." },
  { title: "Popular names", rule: "Pancake, doughnut, haircutter, Y-spin and Biellmann are skaters' names. The panel files each one under one of the ten variation categories (sit, camel or upright with its direction), so a doughnut is a camel variation and a haircutter an upright layback variation." },
];
