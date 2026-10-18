import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Section } from "@/components/Page";
import { LessonTabs } from "@/components/LessonTabs";
import { SourceNote } from "@/components/SourceNote";
import { ValueTable } from "@/components/ValueTable";
import { Chip } from "@/components/ui/Chip";
import { SPIN_FAMILIES } from "@/data/spins";
import { hasCode } from "@/lib/scoring/sov";
import { SpinExplorer } from "../SpinExplorer";

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
  const tabs = [
    {
      id: "code",
      label: "Reading the code",
      content: (
        <ul className="space-y-1">
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
      ),
    },
    {
      id: "used",
      label: "Where it is used",
      content: (
        <>
          <ul className="list-disc space-y-1 pl-5">
            {fam.usage.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <p className="mt-3 text-muted">All spins in one program must have different abbreviations. In the Free Skating a program has one spin combination, one flying spin and one choreographic spin.</p>
        </>
      ),
    },
    {
      id: "values",
      label: "Values by level",
      content: (
        <>
          <ValueTable codes={[...levels, ...vRows]} />
          <SourceNote refs={[{ doc: "sov2786" }]} className="mt-2" />
        </>
      ),
    },
  ];
  return (
    <>
      <PageHeader compact eyebrow={`Spin · ${fam.code}`} title={fam.name} intro={<p>{fam.description} Pick the level and toggle the features to see what they look like; the code, the value and what counts for the level follow.</p>} />
      <Section className="pt-0">
        <SpinExplorer family={fam.code} />
      </Section>
      <Section>
        <LessonTabs label="About the spin" tabs={tabs} />
      </Section>
      <Section title="Other spin families">
        <div className="flex flex-wrap gap-2">
          {SPIN_FAMILIES.filter((f) => f.code !== fam.code).map((f) => (
            <Chip key={f.code} href={`/spins/${f.code}`}>
              <span className="font-mono">{f.code}</span> <span className="text-muted">{f.name}</span>
            </Chip>
          ))}
        </div>
      </Section>
    </>
  );
}
