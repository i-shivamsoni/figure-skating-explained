/**
 * Parses the text extraction of ISU Communication 2786 (Single & Pair Skating
 * Scale of Values 2026-27) into data/sov-2026-27.json.
 *
 *   pnpm data:sov            (node --experimental-strip-types scripts/parse-sov.ts)
 *
 * Input: docs/isu/text/ISU-Comm-2786-Scale-of-Values-2026-27.txt (pdftotext -layout).
 * Each element row is "<code> <-5> <-4> <-3> <-2> <-1> <BASE> <+1> ... <+5>" with comma
 * decimals. Two rows lost their label in extraction (3A / 3Ab before the quads, and
 * 3Aq / 3Aqb before the quad q-rows); they are re-labelled by position.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const INPUT = path.join(ROOT, "docs/isu/text/ISU-Comm-2786-Scale-of-Values-2026-27.txt");
const OUTPUT = path.join(ROOT, "data/sov-2026-27.json");

type Row = { code: string; section: string; base: number; goe: number[] };

const NUM = /^-?\d+,\d{2}$/;
const toNum = (s: string) => Number(s.replace(",", "."));

const lines = readFileSync(INPUT, "utf8").split("\n");
const rows: Row[] = [];
let section = "";
let prevCode = "";
// labels for the unlabeled 8.00 rows, consumed in order of appearance
const unlabeled: Record<string, string[]> = { "3Lz!<<": ["3A", "3Ab"], "4A": ["3Aq", "3Aqb"] };
let pending: string[] = [];

for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  const parts = line.split(/\s+/);
  const nums = parts.filter((p) => NUM.test(p));
  if (nums.length === 11) {
    const label = parts.filter((p) => !NUM.test(p)).join(" ");
    let code = label;
    if (!code) {
      code = pending.shift() ?? "";
      if (!code) throw new Error(`Unlabeled row with no pending label: ${line}`);
    }
    const values = nums.map(toNum);
    rows.push({ code, section, base: values[5], goe: values });
    prevCode = code;
    if (unlabeled[prevCode]) pending = [...unlabeled[prevCode]];
    continue;
  }
  // section headers: lines without numbers that are not table headers / page numbers
  if (nums.length === 0 && !/^-?\d+%?(\s|$)/.test(line) && !/^(BASE|\(This|Remarks|Legend|\d+\))/.test(line) && !/^\d+$/.test(line)) {
    if (/^(1\. Scale of Values|Single & Pair Skating)$/.test(line)) continue;
    if (line.length < 70 && !/^[a-z<]/.test(line)) section = line;
  }
}

// sanity checks against values read from the PDF
const expect: Record<string, number> = { "4T": 9.5, "3A": 8.0, "4A": 12.5, "3Lz<": 4.72, "3F!q": 5.3, "CCoSp4V": 3.15, "StSq4": 4.1, "ChSq1": 3.5, "5T": 14.0, "3Tw4": 6.0, "4LzTh": 7.5, "FoDs4": 5.1, "5RLi4": 7.0 };
const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));
for (const [code, base] of Object.entries(expect)) {
  if (!byCode[code]) throw new Error(`missing ${code}`);
  if (Math.abs(byCode[code].base - base) > 1e-9) throw new Error(`${code}: ${byCode[code].base} != ${base}`);
}
const dupes = rows.map((r) => r.code).filter((c, i, a) => a.indexOf(c) !== i);
if (dupes.length) throw new Error(`duplicate codes: ${dupes.join(", ")}`);

const out = {
  season: "2026-27",
  source: "ISU Communication 2786 (Single & Pair Skating Scale of Values), update of 2 June 2026",
  goeSteps: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
  programComponentFactors: {
    men: { shortProgram: 1.67, freeSkating: 3.33 },
    women: { shortProgram: 1.33, freeSkating: 2.67 },
    pairs: { shortProgram: 1.33, freeSkating: 2.67 },
  },
  elements: Object.fromEntries(rows.map((r) => [r.code, { base: r.base, goe: r.goe, section: r.section }])),
};
writeFileSync(OUTPUT, JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${rows.length} elements to ${path.relative(ROOT, OUTPUT)}`);
console.log("sections:", [...new Set(rows.map((r) => r.section))].join(" | "));
