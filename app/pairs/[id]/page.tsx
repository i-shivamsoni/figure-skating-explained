import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Section } from "@/components/Page";
import { SourceNote } from "@/components/SourceNote";
import { ValueTable } from "@/components/ValueTable";
import { CHOREO_PAIR_LIFT, CHOREO_PAIR_SPIN, DEATH_SPIRALS, LIFT_CLARIFICATIONS, LIFT_GROUPS, LIFT_LEVEL_FEATURES, LIFT_LEVEL_RULES, LIFT_POSITIONS, PAIR_ELEMENT_BY_ID, PAIR_ELEMENT_FAMILIES, PAIR_GOE_GUIDELINES, PAIR_SPIN_COMBINATION, PIVOT_FIGURE, SIDE_BY_SIDE, SOLO_SPIN_COMBINATION, THROW_JUMPS, TWIST_LIFT } from "@/data/pairs";
import type { PairElementId, PairGoeElementType, PairLevelFeature, RuleNote } from "@/data/types";
import { hasCode } from "@/lib/scoring/sov";

export function generateStaticParams() {
  return PAIR_ELEMENT_FAMILIES.map((f) => ({ id: f.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fam = PAIR_ELEMENT_BY_ID[id as PairElementId];
  return fam ? { title: `${fam.name} (pairs)`, description: fam.definition } : {};
}

const GOE_FOR: Partial<Record<PairElementId, PairGoeElementType>> = {
  lift: "lift",
  twist: "twist",
  throw: "throw",
  deathSpiral: "deathSpiral",
  pairSpinCombination: "pairSpin",
  pairSpin: "pairSpin",
  soloSpinCombination: "soloSpin",
  soloJump: "jump",
  stepSequence: "step",
  choreoPairLift: "choreoPairLift",
  choreoPairSpin: "choreoPairSpin",
  choreoSequence: "choreoSequence",
};

function Features({ features }: { features: PairLevelFeature[] }) {
  return (
    <ol className="grid gap-2 md:grid-cols-2">
      {features.map((f) => (
        <li key={f.number} className="rounded-lg border border-border bg-surface p-3 text-sm">
          <p className="font-semibold">
            {f.number}. {f.name}
            {f.countsOncePerProgram && <span className="ml-2 text-xs font-normal text-muted">once per program</span>}
            {f.freeSkatingOnly && <span className="ml-2 text-xs font-normal text-muted">Free Skating only</span>}
          </p>
          <p className="mt-1 text-muted">{f.detail}</p>
          {f.senior && <p className="mt-1 text-xs"><span className="font-medium">Senior:</span> {f.senior}</p>}
          {f.junior && <p className="text-xs"><span className="font-medium">Junior:</span> {f.junior}</p>}
        </li>
      ))}
    </ol>
  );
}

function Notes({ notes }: { notes: RuleNote[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {notes.map((n) => (
        <Card key={n.title}>
          <h3 className="font-semibold">{n.title}</h3>
          <p className="mt-1 text-sm">{n.rule}</p>
        </Card>
      ))}
    </div>
  );
}

const levelCodes = (prefix: string) => ["B", 1, 2, 3, 4].map((l) => `${prefix}${l}`).filter(hasCode);

export default async function PairElementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fam = PAIR_ELEMENT_BY_ID[id as PairElementId];
  if (!fam) notFound();
  const goe = PAIR_GOE_GUIDELINES.find((g) => g.elementType === GOE_FOR[fam.id]);
  return (
    <>
      <PageHeader eyebrow="Pair Skating" title={fam.name} intro={<p>{fam.definition}</p>} />
      <Section>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <Card>
            <h2 className="font-semibold">Reading the code</h2>
            <p className="mt-1 font-mono text-sm text-accent-strong">{fam.codeFamily}</p>
            <p className="mt-2 text-sm">{fam.howToRead}</p>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {fam.examples.map((e) => (
                  <tr key={e.code} className="border-t border-border">
                    <td className="py-1 font-mono font-semibold">{e.code}</td>
                    <td className="py-1 text-muted">{e.reading}</td>
                    <td className="py-1 text-right font-mono">{e.baseValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <h2 className="font-semibold">Where it is used</h2>
            <p className="mt-2 text-sm">
              <span className="font-medium">Short Program:</span> {fam.usage.shortProgram}
            </p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Free Skating:</span> {fam.usage.freeSkating}
            </p>
          </Card>
        </div>
        <SourceNote refs={fam.sources} className="mt-3" />
      </Section>

      {fam.id === "lift" && (
        <>
          <Section title="The five groups">
            <div className="grid gap-3 md:grid-cols-2">
              {LIFT_GROUPS.map((g) => (
                <Card key={g.group}>
                  <h3 className="font-semibold">
                    Group {g.group}: {g.name} <span className="font-mono text-xs text-muted">{g.sovPrefix}</span>
                  </h3>
                  <p className="mt-1 text-sm">{g.hold}</p>
                  <p className="mt-1 text-xs text-muted">{g.identification}</p>
                  {g.types && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {g.types.map((t) => (
                        <li key={t.code}>
                          <span className="font-mono font-semibold">{t.sovPrefix}</span> {t.name}: <span className="text-muted">{t.takeOff}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {LIFT_POSITIONS.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-muted">{p.definition}</p>
                </div>
              ))}
            </div>
            <SourceNote refs={LIFT_GROUPS[0].sources} className="mt-3" />
          </Section>
          <Section title="Level features">
            <Features features={LIFT_LEVEL_FEATURES} />
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {LIFT_LEVEL_RULES.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <SourceNote refs={LIFT_LEVEL_RULES.sources} className="mt-2" />
          </Section>
          <Section title="Clarifications">
            <Notes notes={LIFT_CLARIFICATIONS} />
          </Section>
          <Section title="Base values">
            <ValueTable codes={[...levelCodes("3Li"), ...levelCodes("4Li"), ...levelCodes("5SLi"), ...levelCodes("5TLi"), ...levelCodes("5ALi"), ...levelCodes("5BLi"), ...levelCodes("5RLi")]} compact />
          </Section>
        </>
      )}

      {fam.id === "twist" && (
        <>
          <Section title="Rules">
            <p className="text-sm">{TWIST_LIFT.definition}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="font-semibold">Short Program</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">{TWIST_LIFT.shortProgram.map((r) => <li key={r}>{r}</li>)}</ul>
              </Card>
              <Card>
                <h3 className="font-semibold">Free Skating</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">{TWIST_LIFT.freeSkating.map((r) => <li key={r}>{r}</li>)}</ul>
              </Card>
            </div>
          </Section>
          <Section title="Level features">
            <Features features={TWIST_LIFT.levelFeatures} />
            <Card className="mt-3">
              <h3 className="font-semibold">Cheated landing ({TWIST_LIFT.downgrade.sign})</h3>
              <p className="mt-1 text-sm">{TWIST_LIFT.downgrade.rule}</p>
              <p className="mt-1 text-xs text-muted">{TWIST_LIFT.downgrade.example}</p>
            </Card>
            <div className="mt-3">
              <Notes notes={TWIST_LIFT.clarifications} />
            </div>
            <SourceNote refs={TWIST_LIFT.sources} className="mt-3" />
          </Section>
          <Section title="Base values">
            <ValueTable codes={[...levelCodes("2Tw"), ...levelCodes("3Tw"), ...levelCodes("4Tw")]} compact />
          </Section>
        </>
      )}

      {fam.id === "throw" && (
        <>
          <Section title="Rules">
            <p className="text-sm">{THROW_JUMPS.definition}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="font-semibold">Short Program</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">{THROW_JUMPS.shortProgram.map((r) => <li key={r}>{r}</li>)}</ul>
              </Card>
              <Card>
                <h3 className="font-semibold">Free Skating</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">{THROW_JUMPS.freeSkating.map((r) => <li key={r}>{r}</li>)}</ul>
              </Card>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {THROW_JUMPS.signs.map((s) => (
                <Card key={s.sign}>
                  <h3 className="font-semibold">
                    <span className="font-mono text-accent-strong">{s.sign}</span>
                  </h3>
                  <p className="mt-1 text-sm">{s.meaning}</p>
                </Card>
              ))}
              {THROW_JUMPS.rules.map((s) => (
                <Card key={s.title}>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm">{s.rule}</p>
                </Card>
              ))}
            </div>
            <SourceNote refs={THROW_JUMPS.sources} className="mt-3" />
          </Section>
          <Section title="Base values">
            <ValueTable codes={["2ATh", "3TTh", "3STh", "3LoTh", "3FTh", "3LzTh", "3LzTh<", "3LzTh<<", "3ATh", "4TTh", "4STh", "4LoTh", "4FTh", "4LzTh"]} compact />
            <p className="mt-2 text-sm text-muted">Under-rotated throws are paid at {Math.round(THROW_JUMPS.underRotatedFactor * 100)}% of the clean value in the Scale of Values.</p>
          </Section>
        </>
      )}

      {fam.id === "deathSpiral" && (
        <>
          <Section title="The four death spirals">
            <p className="text-sm">{DEATH_SPIRALS.definition}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {DEATH_SPIRALS.types.map((t) => (
                <Card key={t.code}>
                  <h3 className="font-semibold">
                    {t.name} <span className="font-mono text-xs text-muted">{t.code}</span>
                  </h3>
                  <p className="mt-1 text-sm"><span className="font-medium">Man:</span> {t.manEdge}</p>
                  <p className="text-sm"><span className="font-medium">Woman:</span> {t.womanEdge}; {t.womanLean}</p>
                  {t.prescribedShortProgram && <p className="mt-1 text-xs text-muted">Prescribed in the Short Program: {t.prescribedShortProgram}</p>}
                </Card>
              ))}
            </div>
          </Section>
          <Section title="Positions and timing">
            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <h3 className="font-semibold">The man&apos;s pivot</h3>
                <p className="mt-1 text-sm">{DEATH_SPIRALS.pivot.shortProgram}</p>
                <p className="mt-1 text-sm">{DEATH_SPIRALS.pivot.freeSkating}</p>
                <p className="mt-1 text-xs text-muted">{DEATH_SPIRALS.pivot.changeOfArmHold}</p>
              </Card>
              <Card>
                <h3 className="font-semibold">Low positions</h3>
                <p className="mt-1 text-sm">{DEATH_SPIRALS.lowPositions.womanInside}</p>
                <p className="mt-1 text-sm">{DEATH_SPIRALS.lowPositions.womanOutside}</p>
                <p className="mt-1 text-sm">{DEATH_SPIRALS.lowPositions.man}</p>
              </Card>
              <Card>
                <h3 className="font-semibold">When it starts and ends</h3>
                <p className="mt-1 text-sm">{DEATH_SPIRALS.timing.entryStarts}</p>
                <p className="mt-1 text-sm">{DEATH_SPIRALS.timing.revolutionsStart} {DEATH_SPIRALS.timing.revolutionsEnd}</p>
                <p className="mt-1 text-sm">{DEATH_SPIRALS.timing.exit}</p>
              </Card>
            </div>
          </Section>
          <Section title="Level features">
            <Features features={DEATH_SPIRALS.levelFeatures} />
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {DEATH_SPIRALS.levelRules.map((r) => <li key={r}>{r}</li>)}
              {DEATH_SPIRALS.noValue.map((r) => <li key={r} className="text-highlight">{r}</li>)}
            </ul>
            <SourceNote refs={DEATH_SPIRALS.sources} className="mt-3" />
          </Section>
          <Section title="Base values">
            <ValueTable codes={[...levelCodes("FiDs"), ...levelCodes("BoDs"), ...levelCodes("BiDs"), ...levelCodes("FoDs")]} compact />
          </Section>
        </>
      )}

      {(fam.id === "pairSpinCombination" || fam.id === "pairSpin") && (
        <>
          <Section title="Requirements">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="font-semibold">All programs</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">{PAIR_SPIN_COMBINATION.general.map((r) => <li key={r}>{r}</li>)}</ul>
              </Card>
              <Card>
                <h3 className="font-semibold">Short Program</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">{PAIR_SPIN_COMBINATION.shortProgram.map((r) => <li key={r}>{r}</li>)}</ul>
              </Card>
            </div>
          </Section>
          <Section title="Level features">
            <Features features={PAIR_SPIN_COMBINATION.levelFeatures} />
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {PAIR_SPIN_COMBINATION.levelRules.map((r) => <li key={r}>{r}</li>)}
              {PAIR_SPIN_COMBINATION.vCases.map((r) => <li key={r}>V: {r}</li>)}
              {PAIR_SPIN_COMBINATION.noValueCases.map((r) => <li key={r} className="text-highlight">{r}</li>)}
            </ul>
            <SourceNote refs={PAIR_SPIN_COMBINATION.sources} className="mt-3" />
          </Section>
          <Section title="Base values">
            <ValueTable codes={[...levelCodes("PCoSp"), ...["B", 1, 2, 3, 4].map((l) => `PCoSp${l}V`).filter(hasCode), ...levelCodes("PSp")]} compact />
          </Section>
        </>
      )}

      {fam.id === "soloSpinCombination" && (
        <Section title="Requirements and features">
          <p className="text-sm">{SOLO_SPIN_COMBINATION.status}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{SOLO_SPIN_COMBINATION.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
          <div className="mt-3">
            <Features features={SOLO_SPIN_COMBINATION.levelFeatures} />
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{SOLO_SPIN_COMBINATION.levelRules.map((r) => <li key={r}>{r}</li>)}</ul>
          <SourceNote refs={SOLO_SPIN_COMBINATION.sources} className="mt-3" />
        </Section>
      )}

      {fam.id === "soloJump" && (
        <Section title="Side-by-side jumps">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="font-semibold">Solo jump</h3>
              <ul className="mt-1 list-disc pl-5 text-sm">{[...SIDE_BY_SIDE.soloJump.shortProgram, ...SIDE_BY_SIDE.soloJump.freeSkating].map((r) => <li key={r}>{r}</li>)}</ul>
            </Card>
            <Card>
              <h3 className="font-semibold">Combination or sequence</h3>
              <ul className="mt-1 list-disc pl-5 text-sm">{SIDE_BY_SIDE.jumpCombinationAndSequence.rules.map((r) => <li key={r}>{r}</li>)}</ul>
            </Card>
          </div>
          <div className="mt-3">
            <Notes notes={SIDE_BY_SIDE.calling} />
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{SIDE_BY_SIDE.soloSpins.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          <SourceNote refs={SIDE_BY_SIDE.sources} className="mt-3" />
        </Section>
      )}

      {(fam.id === "choreoPairLift" || fam.id === "choreoPairSpin") && (
        <Section title="Rules">
          {[fam.id === "choreoPairLift" ? CHOREO_PAIR_LIFT : CHOREO_PAIR_SPIN].map((c) => (
            <Card key={c.code}>
              <p className="text-sm">{c.summary}</p>
              <ul className="mt-2 list-disc pl-5 text-sm">{c.rules.map((r) => <li key={r}>{r}</li>)}</ul>
              <p className="mt-2 font-mono text-sm">{c.code} · base value {c.baseValue.toFixed(2)}</p>
              <SourceNote refs={c.sources} className="mt-2" />
            </Card>
          ))}
        </Section>
      )}

      {fam.id === "pivotFigure" && (
        <Section title="Rules">
          <Card>
            <p className="text-sm">{PIVOT_FIGURE.definition}</p>
            <p className="mt-2 text-sm text-muted">{PIVOT_FIGURE.usage}</p>
            <p className="mt-2 font-mono text-sm">{PIVOT_FIGURE.code} · base value {PIVOT_FIGURE.baseValue.toFixed(2)}</p>
            <SourceNote refs={PIVOT_FIGURE.sources} className="mt-2" />
          </Card>
        </Section>
      )}

      {goe && (
        <Section title="Grade of Execution">
          <Card>
            <h3 className="font-semibold">{goe.name}</h3>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ok">Positive bullets</p>
            <ol className="list-decimal space-y-0.5 pl-5 text-sm">
              {goe.positive.map((b) => (
                <li key={b.text} className={b.requiredForHighGoe ? "font-semibold" : ""}>{b.text}</li>
              ))}
            </ol>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-highlight">Reductions</p>
            <ul className="space-y-0.5 text-sm">
              {goe.reductions.map((r) => (
                <li key={r.error} className="flex gap-2">
                  <span className="w-16 shrink-0 font-mono text-xs text-muted">{r.range}</span>
                  <span>
                    {r.error}
                    {r.capsStartingGoeAtPlusTwo && <span className="ml-1 text-xs text-muted">(caps at +2)</span>}
                  </span>
                </li>
              ))}
            </ul>
            {goe.notes?.map((n) => (
              <p key={n} className="mt-2 text-xs text-muted">{n}</p>
            ))}
            <SourceNote refs={goe.sources} className="mt-2" />
          </Card>
        </Section>
      )}

      <Section title="Other pair elements">
        <div className="flex flex-wrap gap-2">
          {PAIR_ELEMENT_FAMILIES.filter((f) => f.id !== fam.id).map((f) => (
            <Link key={f.id} href={`/pairs/${f.id}`} className="rounded-full border border-border bg-surface px-3 py-1 text-sm hover:border-accent hover:text-accent">
              {f.name}
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
