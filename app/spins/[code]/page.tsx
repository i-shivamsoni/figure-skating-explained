import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Section } from "@/components/Page";
import { SourceNote } from "@/components/SourceNote";
import { ElementViewer } from "@/components/ElementViewer";
import { ValueTable } from "@/components/ValueTable";
import { SPIN_FAMILIES } from "@/data/spins";
import { spinPresetFor } from "@/three/animation/catalog";
import { hasCode } from "@/lib/scoring/sov";

export function generateStaticParams() {
  return SPIN_FAMILIES.map((f) => ({ code: f.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const fam = SPIN_FAMILIES.find((f) => f.code === code);
  return fam ? { title: `${fam.name} (${fam.code})`, description: fam.description } : {};
}

export default async function SpinFamilyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const fam = SPIN_FAMILIES.find((f) => f.code === code);
  if (!fam) notFound();
  const levels = ["B", 1, 2, 3, 4].map((l) => `${fam.code}${l}`);
  const vRows = levels.map((c) => `${c}V`).filter(hasCode);
  const preset = spinPresetFor(fam.code);
  return (
    <>
      <PageHeader eyebrow={`Spin · ${fam.code}`} title={fam.name} intro={<p>{fam.description}</p>} />
      <Section>
        <ElementViewer spec={{ kind: "spin", code: preset }} height={460} camera="side" />
        {preset !== fam.code && <p className="mt-2 text-sm text-muted">Shown with the closest animated preset ({preset}); the code adds {fam.flying ? "a flying entry" : ""}{fam.flying && fam.changeOfFoot ? " and " : ""}{fam.changeOfFoot ? "a change of foot" : ""}.</p>}
      </Section>
      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <h2 className="font-semibold">Reading the code</h2>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <span className="font-mono">F</span> flying entry: {fam.flying ? "yes" : "no"}
              </li>
              <li>
                <span className="font-mono">C</span> change of foot: {fam.changeOfFoot ? "yes" : "no"}
              </li>
              <li>
                {fam.combination ? (
                  <>
                    <span className="font-mono">Co</span> combination: at least two basic positions, all three for full value
                  </>
                ) : (
                  <>
                    <span className="font-mono">{fam.position}</span> position: {fam.position === "U" ? "upright" : fam.position === "L" ? "layback or sideways leaning" : fam.position === "C" ? "camel" : "sit"}
                  </>
                )}
              </li>
              <li>
                <span className="font-mono">B, 1-4</span> level by number of features
              </li>
              <li>
                <span className="font-mono">V</span> reduced value when a requirement is missed
              </li>
            </ul>
          </Card>
          <Card className="md:col-span-2">
            <h2 className="font-semibold">Where it is used</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {fam.usage.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              All spins in one program must have different abbreviations. In the Free Skating a program has one spin combination, one flying spin and one choreographic spin.
            </p>
          </Card>
        </div>
      </Section>
      <Section title="Base values and GOE">
        <ValueTable codes={[...levels, ...vRows]} />
        <SourceNote refs={[{ doc: "sov2786" }]} className="mt-2" />
      </Section>
      <Section title="Other spin families">
        <div className="flex flex-wrap gap-2">
          {SPIN_FAMILIES.filter((f) => f.code !== fam.code).map((f) => (
            <Link key={f.code} href={`/spins/${f.code}`} className="rounded-full border border-border bg-surface px-3 py-1 text-sm hover:border-accent hover:text-accent">
              <span className="font-mono">{f.code}</span> <span className="text-muted">{f.name}</span>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
