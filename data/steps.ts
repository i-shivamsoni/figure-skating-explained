import type { TurnOrStep, LevelFeature } from "./types";

/** Technical Panel Handbook 2026-27, Step Sequence. */
export const TURNS_AND_STEPS: TurnOrStep[] = [
  { id: "three-turn", name: "Three turn", kind: "turn", difficult: false, definition: "A turn on one foot from forward to backward (or the reverse) that changes edge, outside to inside or inside to outside, rotating in the direction of the curve.", tracing: "A '3' shape: the cusp points into the circle." },
  { id: "bracket", name: "Bracket", kind: "turn", difficult: true, definition: "Like a three turn in that it changes edge, but the body rotates against the curve, so the cusp points outward.", tracing: "A '}' shape: the cusp points out of the circle." },
  { id: "rocker", name: "Rocker", kind: "turn", difficult: true, definition: "A one-foot turn that keeps the same edge (outside to outside or inside to inside) while changing lobe; rotation is in the direction of the entry curve.", tracing: "An S-shaped tracing with a cusp that points into the entry circle." },
  { id: "counter", name: "Counter", kind: "turn", difficult: true, definition: "Keeps the same edge like a rocker, but the rotation is against the entry curve.", tracing: "An S-shaped tracing with the cusp pointing out of the entry circle." },
  { id: "loop", name: "Loop", kind: "turn", difficult: true, definition: "A small, tight circle traced on one edge, roughly a blade length across, without changing foot or edge.", tracing: "A teardrop loop inside the curve." },
  { id: "twizzle", name: "Twizzle", kind: "turn", difficult: true, definition: "A travelling multi-rotation turn on one foot; at least two revolutions are needed for it to count.", tracing: "A tight spiral that moves along the ice rather than staying on one spot." },
  { id: "toe-step", name: "Toe step", kind: "step", difficult: false, definition: "A step onto the toe pick.", tracing: "A dot or short scratch from the pick." },
  { id: "chasse", name: "Chassé", kind: "step", difficult: false, definition: "A two-step sequence where the free foot is placed beside the skating foot and the skating foot lifts without crossing.", tracing: "Two parallel short edges." },
  { id: "mohawk", name: "Mohawk", kind: "step", difficult: false, definition: "A step from one foot to the other that changes direction (forward to backward) while keeping the same kind of edge, inside to inside or outside to outside.", tracing: "Two curves on the same circle joined at the change of foot." },
  { id: "choctaw", name: "Choctaw", kind: "step", difficult: true, definition: "A step from one foot to the other, forward to backward or the reverse, in which the exit edge is the opposite kind to the entry edge (outside to inside or inside to outside).", tracing: "Two curves on different circles meeting at the change of foot." },
  { id: "change-of-edge", name: "Change of edge", kind: "step", difficult: false, definition: "Rolling from one edge to the other on the same foot.", tracing: "A serpentine where the curve flips direction." },
  { id: "cross-roll", name: "Cross roll", kind: "step", difficult: false, definition: "A roll from one outside edge to the other where the free foot crosses in front (forward) or behind (backward) of the skating foot.", tracing: "Alternating outside lobes with a crossing at each change." },
];

export const DIFFICULT_TURNS_AND_STEPS = ["twizzle", "bracket", "loop", "counter", "rocker", "choctaw"];
export const DIFFICULT_TURNS_FOR_CLUSTERS = ["rocker", "counter", "bracket", "twizzle", "loop"];

export const VARIETY_THRESHOLDS = [
  { name: "Level Basic", minimum: 2, rule: "At least two difficult turns and steps on clean edges (same or different)." },
  { name: "Minimum variety (Level 1)", minimum: 5, rule: "At least five difficult turns and steps, no type counted more than twice." },
  { name: "Simple variety (Level 2)", minimum: 7, rule: "At least seven, no type counted more than twice." },
  { name: "Variety (Level 3)", minimum: 9, rule: "At least nine, no type counted more than twice." },
  { name: "Complexity (Level 4)", minimum: 11, rule: "At least eleven, no type more than twice, and five types executed in both rotational directions." },
];

export const STEP_LEVEL_FEATURES: LevelFeature[] = [
  { number: 1, name: "Variety of difficult turns and steps", detail: "Minimum variety for Level 1, simple variety for Level 2, variety for Level 3, complexity for Level 4. This feature is compulsory for the level named." },
  { number: 2, name: "Rotations in both directions", detail: "Full body rotations with turns and steps covering at least a third of the pattern in each rotational direction, continuous or in total." },
  { number: 3, name: "Use of body movements", detail: "Arm, head, torso, hip or leg movements that affect the balance of the body core for at least a third of the pattern." },
  { number: 4, name: "Two combinations of three difficult turns on different feet", detail: "Three consecutive difficult turns (rocker, counter, bracket, twizzle, loop) with continuous flow; only one turn may be repeated across the two clusters; three turns, changes of edge, hops and changes of foot break the cluster." },
  { number: 5, name: "Body movements in a cluster", detail: "Two balance-affecting movements inside one of the counted clusters, not on the same curve of a turn; all turns in that cluster must be clean." },
];

export const STEP_SEQUENCE_RULES = [
  "There is no required pattern, but the sequence must fully use the ice surface (straight line, serpentine, circle, oval or similar) and be clearly visible; otherwise it has no value.",
  "Turns and steps must be distributed through the sequence; long gaps cap the level at Basic.",
  "A jumped turn is not counted. Turns must be executed on clean edges.",
  "Listed jumps of up to one and a half revolutions and any unlisted jumps may be included without penalty and are not called.",
  "In the Free Skating a listed jump of more than one and a half revolutions inside the sequence is called and fills a jump box; in the Short Program it is ignored but costs one GOE grade.",
  "Short stops in time with the music are allowed. Free skating moves such as spread eagles and spirals may be included.",
  "Step sequence is required in the Short Program (all categories) and in the Senior Free Skating; the Junior Free Skating has no step sequence.",
];
