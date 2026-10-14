import type { JumpId } from "@/data/types";
import { JUMP_BY_ID, ROTATION_NAMES } from "@/data/jumps";
import { SPIN_FAMILIES } from "@/data/spins";
import { hasCode, baseValueOf, round2 } from "@/lib/scoring/sov";
import type { ElementSpec, JumpSpec, Level, RotationCall, EdgeCall } from "@/lib/scoring/elements";
import { scoreElement } from "@/lib/scoring/value";

export interface DecodedPart {
  token: string;
  description: string;
  baseValue?: number;
  sovCode?: string;
}

export interface DecodedElement {
  input: string;
  code: string;
  parts: DecodedPart[];
  spec?: ElementSpec;
  baseValue: number;
  summary: string;
  errors: string[];
}

const JUMP_RE = /^([1-5])(T|S|Lo|F|Lz|A|Eu)(!|e)?(q|<<|<)?(b)?(\*)?$/;
const SPIN_RE = /^(F?)(C?)(U|L|C|S|Co)Sp(B|[1-4])(V?)(\*)?$/;
const STEP_RE = /^StSq(B|[1-4])(\*)?$/;
const CHOREO_RE = /^Ch(Sq|Sp)1(\*)?$/;
const PAIR_RE = /^(\d?(?:T|S|Lo|F|Lz|A)?Th(?:q|<|<<)?|\dTw(?:B|[1-4])(?:<<)?|\d[STBAR]?Li(?:B|[1-4])|[BF][io]Ds(?:B|[1-4])b?|PSp(?:B|[1-4])|PCoSp(?:B|[1-4])V?|ChPSp1|ChPLi1|PiF1)$/;

function rotationWord(n: number, jump: JumpId): string {
  if (jump === "Eu") return "Euler (half loop)";
  return `${ROTATION_NAMES[n]} ${JUMP_BY_ID[jump].name}`;
}

export function parseJumpToken(token: string): { spec: JumpSpec; part: DecodedPart } | null {
  const m = JUMP_RE.exec(token);
  if (!m) return null;
  const rotations = Number(m[1]);
  const jump = m[2] as JumpId;
  const edgeCall = (m[3] ?? "") as EdgeCall;
  const rotationCall = (m[4] ?? "") as RotationCall;
  const noValue = Boolean(m[6]);
  const spec: JumpSpec = { jump, rotations, edgeCall, rotationCall, noValue };
  const notes: string[] = [];
  if (jump === "A") notes.push(`${rotations + 0.5} revolutions in the air`);
  if (edgeCall === "e") notes.push("wrong take-off edge (reduced base value)");
  if (edgeCall === "!") notes.push("unclear take-off edge");
  if (rotationCall === "q") notes.push("landed a quarter short (GOE -2)");
  if (rotationCall === "<") notes.push("under-rotated (80% base value)");
  if (rotationCall === "<<") notes.push("downgraded, valued as one rotation less");
  if (m[5]) notes.push("Advanced Novice bonus flag");
  if (noValue) notes.push("no value (*)");
  const sovCode = jump === "Eu" ? "Eu" : `${rotations}${jump}${edgeCall}${rotationCall}${m[5] ?? ""}`;
  const base = noValue ? 0 : hasCode(sovCode) ? baseValueOf(sovCode) : undefined;
  return {
    spec,
    part: { token, description: `${rotationWord(rotations, jump)}${notes.length ? ` — ${notes.join(", ")}` : ""}`, baseValue: base, sovCode },
  };
}

export function decode(inputRaw: string): DecodedElement {
  const input = inputRaw.trim();
  const errors: string[] = [];
  const parts: DecodedPart[] = [];
  const result = (spec: ElementSpec | undefined, summary: string, baseValue: number, code = input): DecodedElement => ({ input, code, parts, spec, baseValue, summary, errors });
  if (!input) return result(undefined, "", 0);

  const tokens = input.split("+").map((t) => t.trim());
  const first = tokens[0];

  if (SPIN_RE.test(first) && tokens.length === 1) {
    const m = SPIN_RE.exec(first)!;
    const family = `${m[1]}${m[2]}${m[3]}Sp`;
    const fam = SPIN_FAMILIES.find((f) => f.code === family);
    const level = (m[4] === "B" ? "B" : Number(m[4])) as Level;
    const v = m[5] === "V";
    const noValue = Boolean(m[6]);
    const spec: ElementSpec = { kind: "spin", family, level, v, noValue };
    const sovCode = `${family}${level}${v ? "V" : ""}`;
    const base = noValue ? 0 : hasCode(sovCode) ? baseValueOf(sovCode) : 0;
    if (!fam) errors.push(`Unknown spin family ${family}`);
    const bits = [
      m[1] ? "flying entry" : null,
      m[2] ? "change of foot" : null,
      m[3] === "Co" ? "combination spin (two or more basic positions)" : `${{ U: "upright", L: "layback", C: "camel", S: "sit" }[m[3]]} position`,
      `level ${level}`,
      v ? "reduced value (V)" : null,
      noValue ? "no value" : null,
    ].filter(Boolean);
    parts.push({ token: first, description: `${fam?.name ?? "Spin"}: ${bits.join(", ")}`, baseValue: base, sovCode });
    return result(spec, `${fam?.name ?? "Spin"} level ${level}${v ? " with reduced value" : ""}`, base);
  }

  if (STEP_RE.test(first) && tokens.length === 1) {
    const m = STEP_RE.exec(first)!;
    const level = (m[1] === "B" ? "B" : Number(m[1])) as Level;
    const noValue = Boolean(m[2]);
    const sovCode = `StSq${level}`;
    const base = noValue ? 0 : baseValueOf(sovCode);
    parts.push({ token: first, description: `Step sequence, level ${level}`, baseValue: base, sovCode });
    return result({ kind: "step", level, noValue }, `Step sequence level ${level}`, base);
  }

  if (CHOREO_RE.test(first) && tokens.length === 1) {
    const m = CHOREO_RE.exec(first)!;
    const kind = m[1] === "Sq" ? "choreoSequence" : "choreoSpin";
    const noValue = Boolean(m[2]);
    const sovCode = m[1] === "Sq" ? "ChSq1" : "ChSp1";
    const base = noValue ? 0 : baseValueOf(sovCode);
    const name = kind === "choreoSequence" ? "Choreographic sequence" : "Choreographic spin";
    parts.push({ token: first, description: `${name}, fixed base value`, baseValue: base, sovCode });
    return result({ kind, noValue }, name, base);
  }

  if (tokens.length === 1 && PAIR_RE.test(first)) {
    const base = hasCode(first) ? baseValueOf(first) : 0;
    parts.push({ token: first, description: `Pair skating element (${hasCode(first) ? "see Scale of Values" : "unknown code"})`, baseValue: base, sovCode: first });
    if (!hasCode(first)) errors.push(`Unknown pair element code ${first}`);
    return result(undefined, "Pair skating element", base);
  }

  // Jump element: jumps joined by +, with optional COMBO / SEQ / REP markers
  const jumps: JumpSpec[] = [];
  let sequence = false;
  let rep = false;
  let marker: { type: "COMBO" | "SEQ"; afterIndex: number } | undefined;
  tokens.forEach((t, idx) => {
    const upper = t.toUpperCase();
    if (upper === "COMBO" || upper === "SEQ") {
      const isLast = idx === tokens.length - 1;
      if (upper === "SEQ" && isLast) {
        sequence = true;
        parts.push({ token: t, description: "jump sequence: the following jump is an Axel-type jump entered with a direct step" });
      } else {
        marker = { type: upper, afterIndex: jumps.length - 1 };
        parts.push({ token: t, description: upper === "COMBO" ? "combination marker: the planned next jump was missing or the jumps after a mistake are deleted" : "sequence marker" });
      }
      return;
    }
    if (upper === "REP") {
      rep = true;
      parts.push({ token: t, description: "repetition: 80% of the base value" });
      return;
    }
    const parsed = parseJumpToken(t);
    if (!parsed) {
      errors.push(`Cannot read "${t}"`);
      parts.push({ token: t, description: "unrecognised" });
      return;
    }
    if (parsed.part.baseValue === undefined && !parsed.spec.noValue) errors.push(`${t} is not in the Scale of Values`);
    jumps.push(parsed.spec);
    parts.push(parsed.part);
  });
  if (jumps.length === 0) return result(undefined, "Not a recognised element code", 0);
  const spec: ElementSpec = { kind: "jump", jumps, sequence, rep, marker };
  let base = 0;
  try {
    base = scoreElement(spec, 0).factoredBase;
  } catch (err) {
    errors.push((err as Error).message);
    base = round2(parts.reduce((a, p) => a + (p.baseValue ?? 0), 0));
  }
  const names = jumps.map((j) => rotationWord(j.rotations, j.jump));
  const summary = jumps.length === 1 ? names[0] : `${sequence ? "Jump sequence" : "Jump combination"}: ${names.join(" + ")}`;
  return result(spec, summary, base);
}
