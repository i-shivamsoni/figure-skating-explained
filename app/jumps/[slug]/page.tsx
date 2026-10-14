import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Section } from "@/components/Page";
import { SourceNote } from "@/components/SourceNote";
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
  return (
    <>
      <PageHeader eyebrow={`Jump · ${jump.id}`} title={jump.name} intro={<p>{jump.summary}</p>} />
      <Section>
        <JumpExplorer slug={jump.slug} defaultRotation={defaultRotation} />
      </Section>
      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <h2 className="font-semibold">How it works</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
              {jump.mechanics.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>
          </Card>
          <Card>
            <h2 className="font-semibold">How to spot it</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
              {jump.howToSpot.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="font-semibold">Common errors and calls</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
              {jump.commonErrors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Card>
        </div>
        <SourceNote refs={jump.sources} className="mt-3" />
      </Section>
      <Section title="Take-off and landing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Take-off</h3>
            <p className="mt-1 text-lg">
              {jump.takeOff.foot} foot, {jump.takeOff.direction} {jump.takeOff.edge} edge
            </p>
            <p className="text-sm text-muted">{jump.takeOff.toePick ? `Assisted by the ${jump.takeOff.toePickFoot} toe pick.` : "An edge jump: no toe pick."} {jump.extraHalfRevolution && "Forward take-off, so every Axel has an extra half revolution."}</p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Landing</h3>
            <p className="mt-1 text-lg">
              {jump.landing.foot} foot, {jump.landing.direction} {jump.landing.edge} edge
            </p>
            <p className="text-sm text-muted">{jump.listed ? "The same landing as every listed jump, which is why combinations chain so naturally." : "Lands on the back inside edge of the other foot, ready for a Salchow or Flip."}</p>
          </Card>
        </div>
      </Section>
      {jump.listed && (
        <Section title="Where it is allowed">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Free Skating: any number of rotations as a solo jump; in combinations and sequences up to a quad. Rotations available: {jump.rotations.map((r) => ROTATION_NAMES[r]).join(", ")}.</li>
            {spMentions.map((m) => (
              <li key={m}>Short Program, {m}.</li>
            ))}
            {jump.id === "A" && <li>Every Free Skating must contain an Axel-type jump, and every Short Program starts its jump list with a double or triple Axel.</li>}
          </ul>
          <SourceNote refs={[{ doc: "rules2026", where: "Rules 611-612" }]} className="mt-2" />
        </Section>
      )}
      <Section title="Other jumps">
        <div className="flex flex-wrap gap-2">
          {others.map((j) => (
            <Link key={j.slug} href={`/jumps/${j.slug}`} className="rounded-full border border-border bg-surface px-3 py-1 text-sm hover:border-accent hover:text-accent">
              {j.name} <span className="font-mono text-muted">{j.id}</span>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
