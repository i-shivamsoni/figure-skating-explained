import type { Deduction } from "./types";

/** Rule 353.1 n) and the "Who is responsible for deductions" chart. */
export const DEDUCTIONS: Deduction[] = [
  { violation: "Program time: for up to every 5 seconds lacking or in excess (beyond the ±10 s allowance)", points: "-1.0", responsible: "Referee, after consulting the timekeeper", rule: "Rule 502" },
  { violation: "Costume or prop violation", points: "-1.0 per program", responsible: "Judges' panel including the Referee, by majority (no deduction on a 50:50 split)", rule: "Rule 501.1" },
  { violation: "Part of the costume or decoration falls on the ice", points: "-1.0 per program", responsible: "Referee", rule: "Rule 501.2" },
  { violation: "Illegal element or movement (for every one)", points: "-2.0 per violation", responsible: "Technical panel by majority; the Technical Controller deducts", rule: "Rule 504.2" },
  { violation: "Fall, Senior Single Skating", points: "-1.0 for the first and second fall, -2.0 for the third and fourth, -3.0 for the fifth and every further fall", responsible: "Technical panel by majority", rule: "Rule 503" },
  { violation: "Fall, Junior Single Skating", points: "-1.0 for every fall", responsible: "Technical panel by majority", rule: "Rule 503" },
  { violation: "Fall, Pair Skating", points: "-1.0 for a fall by one partner, -2.0 for a fall by both", responsible: "Technical panel by majority", rule: "Rule 503" },
  { violation: "Interruption of the program", points: "more than 10 s up to 20 s: -1.0; more than 20 s up to 30 s: -2.0; more than 30 s up to 40 s: -3.0", responsible: "Referee", rule: "Rule 515.4 a)" },
  { violation: "Interruption with allowance of up to three minutes to resume", points: "-5.0 per program", responsible: "Referee", rule: "Rule 515.4 b)" },
  { violation: "Late start (starting position taken between 1 and 30 seconds late)", points: "-1.0", responsible: "Referee", rule: "Rule 350.2" },
];

export const FALL_DEFINITION =
  "A fall is a loss of control with the result that the majority of the skater's body weight is on the ice, supported by any part of the body other than the blades: hands, knees, back, buttocks or any part of the arm. A fall inside an element also forces a GOE of -5 on that element.";
