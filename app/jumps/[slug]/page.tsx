import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Section } from "@/components/Page";
import { LessonTabs } from "@/components/LessonTabs";
import { SourceNote } from "@/components/SourceNote";
import { Chip } from "@/components/ui/Chip";
import { JumpExplorer } from "./JumpExplorer";
import { JUMPS, JUMP_BY_SLUG, ROTATION_NAMES } from "@/data/jumps";
import { SHORT_PROGRAMS, CATEGORY_LABELS } from "@/data/programs";

export function generateStaticParams() {
  return JUMPS.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const jump = JUMP_BY_SLUG[slug];
  if (!jump) return {};
  return { title: `${jump.name} jump`, description: jump.summary };
}

export default async function JumpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const jump = JUMP_BY_SLUG[slug];
  if (!jump) notFound();
  const defaultRotation = jump.listed ? Math.min(4, jump.rotations[jump.rotations.length - 1]) : 1;
  const others = JUMPS.filter((j) => j.slug !== slug);
  const spMentions = SHORT_PROGRAMS.flatMap((sp) =>
    sp.elements.filter((e) => e.requirement.toLowerCase().includes(jump.name.toLowerCase())).map((e) => `${CATEGORY_LABELS[sp.category]}: ${e.requirement}`),
  );
  const feet = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Take-off</h3>
        <p className="mt-1 text-lg">
          {jump.takeOff.foot} foot, {jump.takeOff.direction} {jump.takeOff.edge} edge
        </p>
        <p className="text-sm text-muted">
          {jump.takeOff.toePick ? `Assisted by the ${jump.takeOff.toePickFoot} toe pick.` : "An edge jump: no toe pick."} {jump.extraHalfRevolution && "Forward take-off, so every Axel has an extra half revolution."}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Landing</h3>
        <p className="mt-1 text-lg">
          {jump.landing.foot} foot, {jump.landing.direction} {jump.landing.edge} edge
        </p>
        <p className="text-sm text-muted">{jump.listed ? "The same landing as every listed jump, which is why combinations chain so naturally." : "Lands on the back inside edge of the other foot, ready for a Salchow or Flip."}</p>
      </div>
    </div>
  );
  const tabs = [
    {
      id: "how",
      label: "How it works",
      content: (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,1.1fr)]">
          <ol className="list-decimal space-y-1.5 pl-5">
            {jump.mechanics.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
          {feet}
        </div>
      ),
    },
    {
      id: "spot",
      label: "How to spot it",
      content: (
        <ul className="list-disc space-y-1.5 pl-5">
          {jump.howToSpot.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ),
    },
    {
      id: "errors",
      label: "Errors and calls",
      content: (
        <ul className="list-disc space-y-1.5 pl-5">
          {jump.commonErrors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ),
    },
    ...(jump.listed
      ? [
          {
            id: "where",
            label: "Where it is allowed",
            content: (
              <ul className="list-disc space-y-1 pl-5">
                <li>Free Skating: any number of rotations as a solo jump; in combinations and sequences up to a quad. Rotations available: {jump.rotations.map((r) => ROTATION_NAMES[r]).join(", ")}.</li>
                {spMentions.map((m) => (
                  <li key={m}>Short Program, {m}.</li>
                ))}
                {jump.id === "A" && <li>Every Free Skating must contain an Axel-type jump, and every Short Program starts its jump list with a double or triple Axel.</li>}
              </ul>
            ),
          },
        ]
      : []),
  ];
  return (
    <>
      <PageHeader compact eyebrow={`Jump · ${jump.id}`} title={jump.name} intro={<p>{jump.summary}</p>} />
      <Section className="pt-0">
        <JumpExplorer slug={jump.slug} defaultRotation={defaultRotation} />
      </Section>
      <Section>
        <LessonTabs label="About the jump" tabs={tabs} />
        <SourceNote refs={[...jump.sources, { doc: "rules2026", where: "Rules 611-612" }]} className="mt-4" />
      </Section>
      <Section title="Other jumps">
        <div className="flex flex-wrap gap-2">
          {others.map((j) => (
            <Chip key={j.slug} href={`/jumps/${j.slug}`}>
              {j.name} <span className="font-mono text-muted">{j.id}</span>
            </Chip>
          ))}
        </div>
      </Section>
    </>
  );
}
