import { Suspense } from "react";
import { Section } from "@/components/Page";
import { ElementCard } from "@/components/ElementCard";
import { Disclosure } from "@/components/ui/Disclosure";
import { CHANGES_2026_27 } from "@/data/sources";
import { RinkApp } from "./rink/RinkApp";

const ELEMENTS = [
  { href: "/jumps", title: "Jumps", id: "T S Lo F Lz A", text: "Six jumps, one to five rotations, and the signs (q, <, <<, e, !) that change their value.", performHref: "/rink?perform=3Lz" },
  { href: "/spins", title: "Spins", id: "Sp", text: "Camel, sit, upright and layback positions, ten difficult variations and the features that build a Level 4.", performHref: "/rink?perform=CCoSp4" },
  { href: "/steps", title: "Step sequences", id: "StSq", text: "Twizzles, brackets, rockers and counters: what the blade draws and how variety becomes a level.", performHref: "/rink?perform=twizzle" },
  { href: "/choreo", title: "Choreographic elements", id: "ChSq ChSp", text: "Spirals, spread eagles, Ina Bauers and hydroblading: fixed-value elements scored by the judges alone.", performHref: "/rink?perform=spiral" },
  { href: "/pairs", title: "Pair Skating", id: "Li Tw Th Ds", text: "Lifts in five groups, twist lifts, throw jumps, death spirals and pair spins, with their levels and values.", performHref: "/rink?perform=5RLi" },
];
const SCORING = [
  { href: "/scoring", title: "How scoring works", text: "Base value, Grade of Execution, trimmed means, program components and deductions: how a program becomes a number.", action: "Read" },
  { href: "/calculator", title: "Program calculator", text: "Build a Short Program or Free Skating and see the score under the 2026-27 Scale of Values, with the rule checks.", action: "Open" },
  { href: "/decoder", title: "Protocol decoder", text: "Paste a code from a results sheet, such as 4Lz+3T or FCCoSp4V, and read it in plain language.", action: "Open" },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-5 sm:pt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <div>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">ISU rules, season 2026-27</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Figure skating, explained on the ice</h1>
          </div>
          <p className="max-w-md text-sm text-muted">Pick an element and the skater performs it; every one lands in the protocol with its value and a card that says what you saw. Then open the lessons.</p>
        </div>
        <div className="h-[70dvh] min-h-[420px] overflow-hidden rounded-2xl border border-border shadow-sm sm:h-[min(75dvh,720px)] sm:min-h-[480px]">
          <Suspense fallback={<div className="flex h-full items-center justify-center bg-[#0f1722] text-sm text-white/70">Loading the rink…</div>}>
            <RinkApp mode="hero" />
          </Suspense>
        </div>
      </section>
      <Section title="Learn the elements" className="pt-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ELEMENTS.map((e) => (
            <ElementCard key={e.href} {...e} />
          ))}
        </div>
      </Section>
      <Section title="Understand the score">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCORING.map((e) => (
            <ElementCard key={e.href} {...e} />
          ))}
        </div>
      </Section>
      <Section>
        <Disclosure title="What changed for 2026-27" summary={`${CHANGES_2026_27.length} changes`}>
          <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
            {CHANGES_2026_27.map((c) => (
              <li key={c} className="rounded-lg border border-border bg-surface-2/40 px-3 py-2">
                {c}
              </li>
            ))}
          </ul>
        </Disclosure>
      </Section>
    </>
  );
}
