import Link from "next/link";
import type { Metadata } from "next";
import { Card, PageHeader, Section } from "@/components/Page";

export const metadata: Metadata = {
  title: "Rink",
  description: "A full-size rink where you pick the elements and the skater performs them one after another.",
};

const DOORS = [
  { href: "/jumps", title: "Jumps", text: "Six jumps from single to quint." },
  { href: "/spins", title: "Spins", text: "Build any spin from its level features." },
  { href: "/steps", title: "Steps", text: "Turns and steps on their lobes." },
  { href: "/pairs", title: "Pairs", text: "Lifts, twists, throws, death spirals." },
];

/** Placeholder until the freeplay rink lands (Wave 2 of the overhaul). */
export default function RinkPage() {
  return (
    <>
      <PageHeader eyebrow="Freeplay" title="The rink" intro={<p>A full-size rink where you pick the elements and the skater performs them one after another, with the traces left on the ice and a running protocol. It is being built; until then every element has its own viewer on these pages.</p>} />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOORS.map((d) => (
            <Link key={d.href} href={d.href} className="group">
              <Card className="h-full transition-colors group-hover:border-accent">
                <h2 className="font-semibold text-accent-strong">{d.title}</h2>
                <p className="mt-1 text-sm text-muted">{d.text}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
