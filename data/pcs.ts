import type { ProgramComponent } from "./types";

/** Rule 504.3, the Program Components chart (July 2024) and the Single & Pair component charts. */
export const PROGRAM_COMPONENTS: ProgramComponent[] = [
  {
    id: "composition",
    name: "Composition",
    focus: "How the program is designed or built in relation to the music.",
    definition: "The intentional, developed and/or original arrangement of the repertoire of all types of movements into a meaningful whole according to the principles of proportion, unity, space, pattern and musical structure.",
    criteria: [
      { name: "Multidimensional movements and use of space", explanation: "Fluid, controlled movement across different planes (high, medium, low, diagonal) and the ability to use the whole space." },
      { name: "Connections between and within elements", explanation: "Elements joined by varied, intricate body and skating movements without interruption; the element becomes part of a unit of movement rather than an isolated trick." },
      { name: "Choreography reflecting musical phrase and form", explanation: "Each unit of movement follows a musical phrase: its beginning, climax and end." },
      { name: "Pattern and ice coverage", explanation: "Interesting, creative placement of movement units and a layout that covers the entire ice surface." },
      { name: "Unity", explanation: "A coherent whole in which all parts contribute to a sense of completeness." },
    ],
  },
  {
    id: "presentation",
    name: "Presentation",
    focus: "How the program is performed in relation to the music.",
    definition: "The demonstration of engagement, commitment and involvement based on an understanding of the music and composition.",
    criteria: [
      { name: "Expressiveness and projection", explanation: "Personal involvement that projects a mood, feeling, image, rhythm or style and captures the viewer." },
      { name: "Variety and contrast of energy and of movements", explanation: "Movements that intensify meaning or underline an accent; force and movement vary across the program." },
      { name: "Musical sensitivity and timing", explanation: "Moving accurately and consistently with melody, rhythm, harmony, tempo and dynamics; finesse in responding to musical details." },
      { name: "Oneness and awareness of space", explanation: "Partners performing as a unit with awareness of each other's placement without looking.", pairsOnly: true },
    ],
  },
  {
    id: "skatingSkills",
    name: "Skating Skills",
    focus: "The technique of skating and movement.",
    definition: "The ability of the skater to execute the repertoire of steps, turns and skating movements with blade and body control.",
    criteria: [
      { name: "Variety of edges, steps, turns, movements and directions", explanation: "Diversity of edges, steps, turns, body movements and skating direction: forward, backward, clockwise, counter-clockwise." },
      { name: "Clarity of edges, steps, turns, movements and body control", explanation: "Each edge, step and turn executed precisely and completely from the moment the blade touches the ice, with core control." },
      { name: "Balance and glide", explanation: "Equilibrium over the blade giving effortless glide, mostly on one foot; long deep edges are harder than short flat ones." },
      { name: "Flow", explanation: "The whole body moving smoothly and harmoniously from a fluid knee and ankle action, with effortless transitions between movements." },
      { name: "Power and speed", explanation: "Gaining and controlling speed from stroke to stroke, with acceleration, deceleration and ease." },
      { name: "Unison", explanation: "Executing the skating repertoire with similar technique.", pairsOnly: true },
    ],
  },
];

/** Marks are 0.25 to 10 in 0.25 steps. Words from the ISU thinking-words rubric and Rule 504. */
export const PCS_SCALE = [
  { band: "Platinum", range: [10, 10], label: "outstanding", words: ["exceptional", "superior", "remarkable", "every criterion present 100% of the time"], maxWith: "no mistakes" },
  { band: "Diamond", range: [9, 9.75], label: "excellent", words: ["always", "at all times", "very sophisticated", "immensely"], maxWith: "9.50 with one serious error that minimally affects the program" },
  { band: "Gold", range: [8, 8.75], label: "very good", words: ["consistently", "very evident", "sophisticated", "completely", "accurately", "throughout"], maxWith: "8.75 with two or more serious errors" },
  { band: "Gold", range: [7, 7.75], label: "good", words: ["frequently", "effectively", "competently", "considerably", "confidently", "most of the time"] },
  { band: "Green", range: [6, 6.75], label: "above average", words: ["sufficiently", "evidently", "mainly"] },
  { band: "Green", range: [5, 5.75], label: "average", words: ["partially", "at times", "sometimes", "to some extent", "satisfactorily", "acceptable"] },
  { band: "Orange", range: [4, 4.75], label: "below average", words: ["simple", "few", "only", "inconsistently", "merely", "minimal"] },
  { band: "Orange", range: [3, 3.75], label: "weak", words: ["a bit", "not often", "hardly", "barely", "seldom", "infrequently", "less identifiable"] },
  { band: "Red", range: [2, 2.75], label: "poor", words: ["lacking", "never", "not at all", "rarely", "not evident", "struggling"] },
  { band: "Red", range: [1, 1.75], label: "very poor", words: ["lacking", "never", "not at all"] },
  { band: "Red", range: [0.25, 0.75], label: "extremely poor", words: ["not evident", "struggling"] },
];

export const SERIOUS_ERROR_CAPS = {
  definition: "Serious errors are falls and mistakes that break the delivery of the program. A fall by both pair partners counts as two errors.",
  oneError: 9.5,
  twoOrMore: 8.75,
  note: "The caps only matter when the program as a whole is still judged excellent or outstanding; the mark must otherwise meet the criteria of its band.",
};

/** ISU Communication 2786, section 2. */
export const PCS_FACTORS = {
  men: { shortProgram: 1.67, freeSkating: 3.33 },
  women: { shortProgram: 1.33, freeSkating: 2.67 },
  pairs: { shortProgram: 1.33, freeSkating: 2.67 },
};
