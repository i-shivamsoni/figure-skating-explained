import type { Metadata } from "next";
import { Card, PageHeader, Section, Sig } from "@/components/Page";
import { SourceNote } from "@/components/SourceNote";
import { ScoringLab } from "./ScoringLab";
import { GOE_GENERAL, GOE_GUIDELINES } from "@/data/goe";
import { PCS_FACTORS, PCS_SCALE, PROGRAM_COMPONENTS, SERIOUS_ERROR_CAPS } from "@/data/pcs";
import { DEDUCTIONS, FALL_DEFINITION } from "@/data/deductions";
import { SECOND_HALF_BONUS, REPETITION_RULES } from "@/data/programs";

export const metadata: Metadata = {
  title: "How scoring works",
  description: "Base value, Grade of Execution, trimmed means, levels, program components, the second-half bonus and deductions in the ISU Judging System for 2026-27.",
};

export default function ScoringPage() {
  return (
    <>
      <PageHeader
        eyebrow="ISU Judging System"
        title="How a program becomes a number"
        intro={
          <>
            <p>
              Two panels score every program. The technical panel decides <em>what</em> was done: it names each element, its level and any signs such as <Sig>q</Sig>, <Sig>&lt;</Sig> or <Sig>e</Sig>, which fixes the base value. The judges decide <em>how well</em>: a Grade of Execution from -5 to +5 for each element, and three program component marks from 0.25 to 10.
            </p>
            <p>Total segment score = technical elements + program components − deductions.</p>
          </>
        }
      />
      <Section title="Try it: base value and GOE">
        <ScoringLab />
      </Section>
      <Section title="Grade of Execution">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Steps and starting GOE</h3>
            <p className="mt-1 text-sm">{GOE_GENERAL.steps}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {GOE_GENERAL.startingGoe.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="mt-2 text-sm text-muted">{GOE_GENERAL.panel}</p>
          </Card>
          <Card>
            <h3 className="font-semibold">Errors that cap the starting GOE at +2</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {GOE_GENERAL.capAtPlusTwo.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {GOE_GUIDELINES.map((g) => (
            <Card key={g.elementType}>
              <h3 className="font-semibold">{g.name}</h3>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ok">Positive bullets</p>
              <ol className="list-decimal space-y-0.5 pl-5 text-sm">
                {g.positive.map((b) => (
                  <li key={b.text} className={b.requiredForHighGoe ? "font-semibold" : ""}>
                    {b.text}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-highlight">Reductions</p>
              <ul className="space-y-0.5 text-sm">
                {g.reductions.map((r) => (
                  <li key={r.error} className="flex gap-2">
                    <span className="w-16 shrink-0 font-mono text-xs text-muted">{r.range}</span>
                    <span>
                      {r.error}
                      {r.capsStartingGoeAtPlusTwo && <span className="ml-1 text-xs text-muted">(caps at +2)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <SourceNote refs={[{ doc: "comm2788", where: "II-IV" }, { doc: "rules2026", where: "Rule 353" }]} className="mt-3" />
      </Section>
      <Section title="Levels, repetition and the second-half bonus">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Levels of difficulty</h3>
            <p className="mt-1 text-sm">Spins and step sequences get a level from the number of features the technical panel counts: Basic for none, then Level 1 to 4. Each level has its own base value in the Scale of Values. Jumps have no levels; their value comes from the jump and the number of rotations.</p>
            <h3 className="mt-4 font-semibold">Second-half bonus</h3>
            <p className="mt-1 text-sm">{SECOND_HALF_BONUS.summary}</p>
          </Card>
          <Card>
            <h3 className="font-semibold">Repetition rules (the Zayak rule)</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {REPETITION_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Card>
        </div>
        <SourceNote refs={[{ doc: "rules2026", where: "Rules 353, 504, 612" }, { doc: "tpSingles", where: "Jump Elements" }]} className="mt-3" />
      </Section>
      <Section title="Program components">
        <div className="grid gap-4 md:grid-cols-3">
          {PROGRAM_COMPONENTS.map((c) => (
            <Card key={c.id}>
              <h3 className="font-semibold">{c.name}</h3>
              <p className="text-xs uppercase tracking-wide text-muted">{c.focus}</p>
              <p className="mt-2 text-sm">{c.definition}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {c.criteria.map((k) => (
                  <li key={k.name}>
                    <span className="font-medium">{k.name}</span>
                    {k.pairsOnly && <span className="ml-1 text-xs text-muted">(pairs)</span>}
                    <span className="block text-xs text-muted">{k.explanation}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Marks</th>
                  <th className="px-3 py-2">Means</th>
                  <th className="px-3 py-2">Thinking words</th>
                </tr>
              </thead>
              <tbody>
                {PCS_SCALE.map((b) => (
                  <tr key={b.range.join()} className="border-t border-border odd:bg-surface even:bg-surface-2/40">
                    <td className="px-3 py-1.5 font-mono">{b.range[0] === b.range[1] ? b.range[0].toFixed(2) : `${b.range[0].toFixed(2)} – ${b.range[1].toFixed(2)}`}</td>
                    <td className="px-3 py-1.5 font-medium">{b.label}</td>
                    <td className="px-3 py-1.5 text-muted">
                      {b.words.join(", ")}
                      {b.maxWith && <span className="block text-xs">Maximum {b.maxWith}.</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card>
            <h3 className="font-semibold">Factors</h3>
            <p className="mt-1 text-sm text-muted">Each component’s panel mark is multiplied by a factor so that components and elements weigh about the same.</p>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {(["men", "women", "pairs"] as const).map((g) => (
                  <tr key={g} className="border-t border-border">
                    <td className="py-1 capitalize">{g}</td>
                    <td className="py-1 text-right font-mono">SP ×{PCS_FACTORS[g].shortProgram.toFixed(2)}</td>
                    <td className="py-1 text-right font-mono">FS ×{PCS_FACTORS[g].freeSkating.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="mt-4 font-semibold">Serious errors</h3>
            <p className="mt-1 text-sm">{SERIOUS_ERROR_CAPS.definition}</p>
            <p className="mt-1 text-sm">
              One serious error caps every component at <span className="font-mono">{SERIOUS_ERROR_CAPS.oneError.toFixed(2)}</span>; two or more at <span className="font-mono">{SERIOUS_ERROR_CAPS.twoOrMore.toFixed(2)}</span>.
            </p>
          </Card>
        </div>
        <SourceNote refs={[{ doc: "pcsChart" }, { doc: "pcsCriteria" }, { doc: "thinkingWords" }, { doc: "sov2786", where: "2. Program Components Factors" }]} className="mt-3" />
      </Section>
      <Section title="Deductions">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Violation</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">Who decides</th>
              </tr>
            </thead>
            <tbody>
              {DEDUCTIONS.map((d) => (
                <tr key={d.violation} className="border-t border-border odd:bg-surface even:bg-surface-2/40">
                  <td className="px-3 py-1.5">
                    {d.violation} <span className="text-xs text-muted">({d.rule})</span>
                  </td>
                  <td className="px-3 py-1.5 font-mono">{d.points}</td>
                  <td className="px-3 py-1.5 text-muted">{d.responsible}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-muted">{FALL_DEFINITION}</p>
        <SourceNote refs={[{ doc: "rules2026", where: "Rule 353.1 n), 503" }, { doc: "deductionsChart" }]} className="mt-2" />
      </Section>
    </>
  );
}
