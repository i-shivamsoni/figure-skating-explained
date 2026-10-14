import Link from "next/link";
import { Card, Section } from "@/components/Page";
import { ElementViewer } from "@/components/ElementViewer";
import { CHANGES_2026_27 } from "@/data/sources";

const SECTIONS = [
  { href: "/jumps", title: "Jumps", text: "Six jumps, one to five rotations, and the signs (q, <, <<, e, !) that change their value." },
  { href: "/spins", title: "Spins", text: "Camel, sit, upright and layback positions, ten difficult variations and the features that build a Level 4." },
  { href: "/steps", title: "Step sequences", text: "Twizzles, brackets, rockers and counters: what the blade draws and how variety becomes a level." },
  { href: "/choreo", title: "Choreographic elements", text: "The choreographic sequence and choreographic spin, scored by the judges alone." },
  { href: "/pairs", title: "Pair Skating", text: "Lifts in five groups, twist lifts, throw jumps, death spirals and pair spins, with their levels and values." },
  { href: "/scoring", title: "How scoring works", text: "Base value, Grade of Execution, trimmed means, program components and deductions." },
  { href: "/calculator", title: "Program calculator", text: "Build a Short Program or Free Skating and see the score with the 2026-27 Scale of Values." },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pt-12 pb-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">ISU rules, season 2026-27</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            What a quad Lutz is, why a flip gets an “e”, and how a program becomes a score.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            An interactive guide to the components of figure skating, built from the International Skating Union
            handbooks, rules and Scale of Values for the 2026-27 season.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/jumps/lutz" className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent-strong">Explore the Lutz</Link>
            <Link href="/decoder" className="rounded-lg border border-border bg-surface px-4 py-2 font-medium hover:bg-surface-2">Decode a protocol code</Link>
          </div>
        </div>
        <div>
          <ElementViewer spec={{ kind: "jump", slug: "lutz", rotations: 4 }} height={400} camera="follow" showControls={false} />
          <p className="mt-2 text-xs text-muted">A quad Lutz: left back outside edge, right toe pick, four revolutions, base value 11.50.</p>
        </div>
      </section>
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-colors group-hover:border-accent">
                <h2 className="font-semibold text-accent-strong">{s.title}</h2>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
      <Section title="What changed for 2026-27">
        <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          {CHANGES_2026_27.map((c) => (
            <li key={c} className="rounded-lg border border-border bg-surface px-3 py-2">{c}</li>
          ))}
        </ul>
      </Section>
    </>
  );
}
