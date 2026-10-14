import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, Section, Sig } from "@/components/Page";
import { SourceNote } from "@/components/SourceNote";
import { PairExplorer } from "@/components/PairExplorer";
import { PAIR_CATEGORY_LABELS, PAIR_ELEMENT_FAMILIES, PAIR_FREE_SKATING, PAIR_GOE_NOTES, PAIR_LEVEL_SCALE, PAIR_MAX_LEVEL_TABLE, PAIR_MAX_LEVEL_TABLE_NOTE, PAIR_PCS_FACTORS, PAIR_SHORT_PROGRAMS, PAIR_SHORT_PROGRAM_ROTATION } from "@/data/pairs";

export const metadata: Metadata = {
  title: "Pair Skating",
  description: "Lifts, twist lifts, throw jumps, death spirals and pair spins: how the pair elements are defined, levelled and scored under the 2026-27 ISU rules.",
};

export default function PairsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pair Skating"
        title="Two skaters, one element"
        intro={
          <>
            <p>
              Pair Skating keeps the jumps and spins of singles, done side by side in unison, and adds the elements that need a partner: overhead lifts in five groups, the twist lift, throw jumps, death spirals and pair spins. Levels work as in singles, except that a pair is awarded the lower level achieved by the two partners.
            </p>
            <p>
              Every code tells the story: <Sig>5RLi4</Sig> is a Group 5 reverse lasso lift at Level 4, <Sig>3Tw3</Sig> a triple twist at Level 3, <Sig>3LzTh</Sig> a throw triple Lutz, <Sig>FiDs4</Sig> a forward inside death spiral at Level 4.
            </p>
          </>
        }
      />
      <Section>
        <PairExplorer
          presets={[
            { id: "5RLi", label: "reverse lasso lift" },
            { id: "3Tw", label: "triple twist" },
            { id: "3LzTh", label: "throw triple Lutz" },
            { id: "BoDs", label: "backward outside death spiral" },
            { id: "PCoSp", label: "pair spin combination" },
          ]}
          camera="side"
          height={460}
        />
      </Section>
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PAIR_ELEMENT_FAMILIES.map((f) => (
            <Link key={f.id} href={`/pairs/${f.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-accent">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold text-accent-strong">{f.name}</h2>
                  <span className="truncate font-mono text-xs text-muted">{f.examples[0]?.code}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{f.definition}</p>
              </Card>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">{PAIR_LEVEL_SCALE.rule}</p>
        <SourceNote refs={PAIR_LEVEL_SCALE.sources} className="mt-2" />
      </Section>
      <Section title="Short Program 2026-27">
        <div className="grid gap-4 md:grid-cols-2">
          {PAIR_SHORT_PROGRAMS.map((sp) => (
            <Card key={sp.category}>
              <h3 className="font-semibold">
                {PAIR_CATEGORY_LABELS[sp.category]} <span className="text-sm font-normal text-muted">· {Math.floor(sp.durationSeconds / 60)}:{String(sp.durationSeconds % 60).padStart(2, "0")}</span>
              </h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                {sp.elements.map((e) => (
                  <li key={e.slot}>
                    <span className="font-medium">{e.slot}:</span> {e.requirement}
                    {e.notes?.map((n) => (
                      <span key={n} className="block text-xs text-muted">
                        {n}
                      </span>
                    ))}
                  </li>
                ))}
              </ol>
              <ul className="mt-2 list-disc pl-5 text-xs text-muted">
                {sp.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-sm">{PAIR_SHORT_PROGRAM_ROTATION.summary}</p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {PAIR_SHORT_PROGRAM_ROTATION.seasons.map((s) => (
            <Card key={s.season}>
              <h4 className="font-semibold">{s.season}</h4>
              <dl className="mt-1 space-y-1 text-sm">
                <div>
                  <dt className="font-medium">{PAIR_CATEGORY_LABELS.seniorPairs}</dt>
                  <dd className="text-muted">{s.senior.join("; ")}</dd>
                </div>
                <div>
                  <dt className="font-medium">{PAIR_CATEGORY_LABELS.juniorPairs}</dt>
                  <dd className="text-muted">{s.junior.join("; ")}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
        <SourceNote refs={PAIR_SHORT_PROGRAMS[0].sources} className="mt-3" />
      </Section>
      <Section title="Free Skating: the well-balanced program">
        <div className="grid gap-4 md:grid-cols-2">
          {(["senior", "junior"] as const).map((k) => (
            <Card key={k}>
              <h3 className="font-semibold capitalize">
                {k} pairs <span className="text-sm font-normal text-muted">· {Math.floor(PAIR_FREE_SKATING[k].durationSeconds / 60)}:{String(PAIR_FREE_SKATING[k].durationSeconds % 60).padStart(2, "0")}</span>
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {PAIR_FREE_SKATING[k].limits.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {PAIR_FREE_SKATING.remarks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Program component factors for pairs: ×{PAIR_PCS_FACTORS.shortProgram.toFixed(2)} in the Short Program and ×{PAIR_PCS_FACTORS.freeSkating.toFixed(2)} in the Free Skating.
        </p>
        <SourceNote refs={PAIR_FREE_SKATING.sources} className="mt-2" />
      </Section>
      <Section title="Grade of Execution in pairs">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-sm">{PAIR_GOE_NOTES.partners}</p>
            <p className="mt-2 text-sm">{PAIR_GOE_NOTES.startingGoe}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
              {PAIR_GOE_NOTES.clarifications.map((c) => (
                <li key={c.title}>
                  <span className="font-medium">{c.title}:</span> {c.rule}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold">Errors that cap the starting GOE at +2</h3>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
              {PAIR_GOE_NOTES.capAtPlusTwo.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Card>
        </div>
        <SourceNote refs={PAIR_GOE_NOTES.sources} className="mt-3" />
      </Section>
      <Section title="No value or a capped level">
        <p className="mb-2 text-sm text-muted">{PAIR_MAX_LEVEL_TABLE_NOTE.note}</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Element</th>
                <th className="px-3 py-2">Problem</th>
                <th className="px-3 py-2">Max level SP</th>
                <th className="px-3 py-2">Max level FS</th>
              </tr>
            </thead>
            <tbody>
              {PAIR_MAX_LEVEL_TABLE.map((r, i) => (
                <tr key={i} className="border-t border-border odd:bg-surface even:bg-surface-2/40">
                  <td className="px-3 py-1.5 font-medium">{r.section}</td>
                  <td className="px-3 py-1.5">{r.problem}</td>
                  <td className="px-3 py-1.5 font-mono">{r.maxLevelShortProgram}</td>
                  <td className="px-3 py-1.5 font-mono">{r.maxLevelFreeSkating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceNote refs={PAIR_MAX_LEVEL_TABLE_NOTE.sources} className="mt-2" />
      </Section>
    </>
  );
}
