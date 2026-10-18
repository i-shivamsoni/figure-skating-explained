import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, PageHeader, Section, Sig } from "@/components/Page";
import { SourceNote } from "@/components/SourceNote";
import { ValueTable } from "@/components/ValueTable";
import { TurnExplorer } from "./TurnExplorer";
import { DIFFICULT_TURNS_AND_STEPS, STEP_LEVEL_FEATURES, STEP_SEQUENCE_RULES, TURNS_AND_STEPS, VARIETY_THRESHOLDS } from "@/data/steps";

export const metadata: Metadata = {
  title: "Step sequences",
  description: "Three turns, brackets, rockers, counters, loops, twizzles, mohawks and choctaws: what the blade draws on the ice and how a step sequence reaches Level 4.",
};

export default function StepsPage() {
  return (
    <>
      <PageHeader
        compact
        eyebrow="Step sequence"
        title="Turns and steps, drawn on the ice"
        intro={<p>A step sequence is judged by what the blade does: turns change direction on one foot, steps move to the other foot, and six of them count as difficult (★). Seen from overhead, blue is an outside edge and orange an inside edge.</p>}
      />
      <Section className="pt-0">
        <Suspense fallback={null}>
          <TurnExplorer />
        </Suspense>
      </Section>
      <Section title="The vocabulary">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TURNS_AND_STEPS.map((t) => (
            <Card key={t.id} className={DIFFICULT_TURNS_AND_STEPS.includes(t.id) ? "border-accent/60" : ""}>
              <h3 className="font-semibold">
                {t.name} <span className="text-xs font-normal uppercase tracking-wide text-muted">{t.kind}</span>
                {DIFFICULT_TURNS_AND_STEPS.includes(t.id) && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-normal text-white">difficult</span>}
              </h3>
              <p className="mt-1 text-sm">{t.definition}</p>
              <p className="mt-1 text-xs text-muted">Tracing: {t.tracing}</p>
            </Card>
          ))}
        </div>
        <SourceNote refs={[{ doc: "tpSingles", where: "Step Sequence: Definition of Turns and Steps" }]} className="mt-3" />
      </Section>
      <Section id="levels" title="From variety to Level 4">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2 text-right">Difficult turns and steps</th>
                <th className="px-3 py-2">Rule</th>
              </tr>
            </thead>
            <tbody>
              {VARIETY_THRESHOLDS.map((v) => (
                <tr key={v.name} className="border-t border-border odd:bg-surface even:bg-surface-2/40">
                  <td className="px-3 py-1.5 font-medium">{v.name}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{v.minimum}</td>
                  <td className="px-3 py-1.5 text-muted">{v.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ol className="mt-4 grid gap-2 md:grid-cols-2">
          {STEP_LEVEL_FEATURES.map((f) => (
            <li key={f.number} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="font-semibold">
                {f.number}. {f.name}
              </p>
              <p className="mt-1 text-muted">{f.detail}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm">
          Level = number of features, with feature 1 compulsory at each step: Level 1 needs minimum variety plus nothing else, Level 4 needs complexity plus three more features. Without two difficult turns the sequence has no value; without balanced distribution it is capped at Basic.
        </p>
        <SourceNote refs={[{ doc: "tpSingles", where: "Step Sequence: Level features, Clarifications" }, { doc: "comm2788", where: "I" }]} className="mt-2" />
      </Section>
      <Section title="Rules of the sequence">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {STEP_SEQUENCE_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Code: <Sig>StSq3</Sig> is a step sequence at Level 3. Judges then add GOE for deep edges, clean turns, music, energy, creativity of body movement, ice coverage and acceleration.
        </p>
      </Section>
      <Section title="Values">
        <ValueTable codes={["StSqB", "StSq1", "StSq2", "StSq3", "StSq4"]} />
        <SourceNote refs={[{ doc: "sov2786" }]} className="mt-2" />
      </Section>
    </>
  );
}
