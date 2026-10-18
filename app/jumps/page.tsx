import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, PageHeader, Section } from "@/components/Page";
import { ElementCard } from "@/components/ElementCard";
import { SourceNote } from "@/components/SourceNote";
import { Disclosure } from "@/components/ui/Disclosure";
import { JUMPS, JUMP_CALLING_RULES, JUMP_SIGNS, ROTATION_NAMES } from "@/data/jumps";
import { SpecialExplorer } from "./SpecialExplorer";
import { FlipVsLutz } from "./FlipVsLutz";
import { SOV } from "@/lib/scoring/sov";

export const metadata: Metadata = {
  title: "Jumps",
  description: "The six figure skating jumps, from single to quintuple, with their take-off edges, base values and the signs that change their score.",
};

export default function JumpsPage() {
  const listed = JUMPS.filter((j) => j.listed);
  return (
    <>
      <PageHeader
        compact
        eyebrow="Jump elements"
        title="Six jumps, five rotations, one landing"
        intro={<p>Every listed jump lands the same way, backward on the right outside edge; the take-off tells them apart. Open one to watch it, change the rotations and the calls, or send it straight to the rink.</p>}
      />
      <Section className="pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {JUMPS.map((j) => (
            <ElementCard
              key={j.id}
              href={`/jumps/${j.slug}`}
              title={j.name}
              id={j.id}
              text={j.summary}
              meta={`Take-off: ${j.takeOff.foot} ${j.takeOff.direction} ${j.takeOff.edge}${j.takeOff.toePick ? `, ${j.takeOff.toePickFoot} toe pick` : ", edge jump"}`}
              performHref={`/rink?perform=${j.id === "Eu" ? "1Eu" : `3${j.id}`}`}
            />
          ))}
        </div>
      </Section>
      <Section title="Base values by rotation (2026-27 Scale of Values)">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Jump</th>
                {[1, 2, 3, 4, 5].map((r) => (
                  <th key={r} className="px-3 py-2 text-right">
                    {ROTATION_NAMES[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listed.map((j) => (
                <tr key={j.id} className="border-t border-border odd:bg-surface even:bg-surface-2/40">
                  <td className="px-3 py-1.5 font-medium">
                    {j.name} <span className="font-mono text-muted">{j.id}</span>
                  </td>
                  {[1, 2, 3, 4, 5].map((r) => {
                    const e = SOV.elements[`${r}${j.id}`];
                    return (
                      <td key={r} className="px-3 py-1.5 text-right font-mono">
                        {e ? e.base.toFixed(2) : <span className="text-muted">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-muted">
          Quints share one value (14.00) and may only be done as solo jumps in the Free Skating. There is no quintuple Axel in the Scale of Values; the quad Axel, at 12.50, is the most valuable jump.
        </p>
        <SourceNote refs={[{ doc: "sov2786" }, { doc: "rules2026", where: "Rule 612" }]} className="mt-2" />
      </Section>
      <Section id="flip-vs-lutz" title="Flip vs Lutz: the edge is the difference">
        <FlipVsLutz />
        <SourceNote refs={[{ doc: "tpSingles", where: "Taking off from wrong edge (Flip/Lutz)" }, { doc: "comm2788", where: "IV, Jumps" }]} className="mt-3" />
      </Section>
      <Section id="signs" title="Signs that change the value">
        <div className="grid gap-3 md:grid-cols-2">
          {JUMP_SIGNS.map((s) => (
            <Card key={s.sign}>
              <h3 className="font-semibold">
                <span className="font-mono text-accent-strong">{s.sign}</span> · {s.name}
              </h3>
              <p className="mt-1 text-sm">{s.meaning}</p>
              <dl className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-[auto_1fr] sm:gap-x-3">
                <dt className="font-medium">Base value</dt>
                <dd>{s.baseValueEffect}</dd>
                <dt className="font-medium">GOE</dt>
                <dd>{s.goeEffect}</dd>
                <dt className="font-medium">Applies to</dt>
                <dd>{s.appliesTo}</dd>
              </dl>
            </Card>
          ))}
        </div>
      </Section>
      <Section id="not-listed" title="Jumps that are not in the Scale of Values">
        <Suspense fallback={null}>
          <SpecialExplorer />
        </Suspense>
        <SourceNote refs={[{ doc: "tpSingles", where: "Non-listed jumps" }, { doc: "deductionsChart", where: "Illegal elements (Novice)" }]} className="mt-3" />
      </Section>
      <Section>
        <Disclosure title="What the technical panel calls" summary={`${JUMP_CALLING_RULES.length} rules`}>
          <div className="grid gap-3 md:grid-cols-2">
            {JUMP_CALLING_RULES.map((r) => (
              <div key={r.title} className="rounded-lg border border-border bg-surface-2/40 p-3">
                <h3 className="font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm">{r.rule}</p>
              </div>
            ))}
          </div>
          <SourceNote refs={[{ doc: "tpSingles", where: "Jump Elements: Clarifications" }, { doc: "refJudges", where: "Jump Elements Q&A" }]} className="mt-3" />
        </Disclosure>
      </Section>
    </>
  );
}
