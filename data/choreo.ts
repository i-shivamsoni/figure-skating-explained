export const CHOREO_SEQUENCE = {
  code: "ChSq1",
  name: "Choreographic sequence",
  baseValue: 3.5,
  summary: "A free-form sequence of at least two different skating movements, such as spirals, arabesques, spread eagles, Ina Bauers, hydroblading, jumps of up to two revolutions or spins, linked by steps and turns.",
  rules: [
    "Included in the Junior and Senior Free Skating; not in the Short Program.",
    "Fixed base value (3.50): the technical panel only confirms it, the judges score it in GOE with steps of ±0.50.",
    "Starts with the first choreographed movement and ends with the last; it can come before or after the step sequence.",
    "Confirmed once two different skating movements have been identified. Sliding on the knees counts as a skating movement.",
    "Listed single and double jumps (except the double Axel) and any spin inside the sequence are not called and do not fill a box. A jump of more than two revolutions ends the sequence and is called.",
    "Any pattern is allowed but the sequence must be clearly visible.",
  ],
  goe: {
    positive: ["matches the music and reflects the concept of the program", "creativity", "effortless with good energy, flow and execution", "varied directions and pattern", "good clarity and precision", "excellent commitment and control of the whole body"],
    negative: ["partly or fully not to the music (-1 to -4, starting GOE capped at +2)", "lack of connection between movements (-2 to -3)", "does not highlight the choreography, poor quality of movements, loss of control, lack of energy, weak execution, small pattern (-1 to -3)"],
  },
};

export const CHOREO_SPIN = {
  code: "ChSp1",
  name: "Choreographic spin",
  baseValue: 3.5,
  summary: "A spin that enhances the choreography and matches the music, with at least three consecutive revolutions on one or two blades in any position, basic or not.",
  rules: [
    "Included in the Junior and Senior Free Skating as the third spin.",
    "Fixed base value (3.50), evaluated by the judges in GOE only.",
    "Confirmed once three consecutive revolutions on the same foot are completed; changing feet during those three revolutions makes it no value. If no spin is identifiable as choreographic, the third spin performed becomes it.",
    "Changes of foot are optional and can be repeated; spinning on other body parts before or after the three revolutions is allowed, as is intentional travelling.",
    "Positions and features used here are not treated as used in the other spins of the program.",
  ],
  goe: {
    positive: ["matches the music and reflects the concept of the program", "creativity", "effortless throughout", "a highlight of the program", "good controlled positions matching the music", "intentional use of speed matching the music"],
    negative: ["partly or fully not to the music (-1 to -4)", "weak execution or loss of control when travelling is unintentional (-1 to -3)", "lack of energy, poor quality of positions (-1 to -3)"],
  },
};
