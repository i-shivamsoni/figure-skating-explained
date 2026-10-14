import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, Section, Sig } from "@/components/Page";
import { SourceNote } from "@/components/SourceNote";
import { ElementViewer } from "@/components/ElementViewer";
import { ValueTable } from "@/components/ValueTable";
import { SPIN_CLARIFICATIONS, SPIN_FAMILIES, SPIN_LEVEL_FEATURES, SPIN_LEVEL_RULES, SPIN_POSITIONS, SPIN_REQUIREMENTS, VARIATION_CATEGORIES, V_SIGN_CASES } from "@/data/spins";
import { SpinExplorer } from "./SpinExplorer";

export const metadata: Metadata = {
  title: "Spins",
  description: "Camel, sit, upright and layback spins, the ten difficult variations, flying entries, changes of foot and how spins earn Level 4 under the 2026-27 ISU rules.",
};

/** Stills in public/poses, captured from the pose lab (see docs/HANDOFF.md). */
const POSE_IMAGE: Record<string, string> = {
  camel: "camel",
  sit: "sit",
  upright: "upright",
  layback: "layback",
  sideways: "sidewaysLean",
  biellmann: "biellmann",
  CF: "camelForward",
  CS: "camelSideways",
  CU: "camelUpward",
  SF: "sit",
  SS: "sitSideways",
  SB: "sitBehind",
  UF: "uprightForward",
  US: "crossfoot",
  UB: "biellmann",
  UL: "layback",
};

function PoseStill({ pose, alt, className = "" }: { pose: string; alt: string; className?: string }) {
  // plain img: the stills are static PNGs served from /public, no optimisation pipeline needed
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/poses/${pose}.png`} alt={alt} width={180} height={220} loading="lazy" className={`shrink-0 rounded-lg border border-border bg-[#eaf3fa] object-cover ${className || "h-[132px] w-[108px]"}`} />;
}

export default function SpinsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Spins"
        title="Three positions, ten variations, four levels"
        intro={
          <>
            <p>
              Every spin is built from three basic positions: camel, sit and upright. The layback, the sideways leaning spin and the Biellmann are all upright spins in the rules. A position only counts once it has been held for two revolutions, and the technical panel then counts features (difficult variations, a change of foot by jump, a change of edge, eight revolutions and so on) to award Level 1 to 4.
            </p>
            <p>The code tells you everything: <Sig>FCCoSp4V</Sig> is a flying (F) change-foot (C) combination (Co) spin (Sp) at Level 4 with reduced value (V).</p>
          </>
        }
      />
      <Section title="Build a spin">
        <SpinExplorer family="CCoSp" />
        <p className="mt-2 text-sm text-muted">Choose any of the twenty families, a level and the features that change what you see: a flying entry and its difficult variation, a change of foot by step or by jump, a clear change of edge (the lean and the trace colour flip), a difficult variation in each position, eight revolutions, travelling threes, windmills. The protocol code, its base value and the features the technical panel would count follow along.</p>
      </Section>
      <Section title="The positions and their difficult variations">
        <ElementViewer spec={{ kind: "spin", code: "variations" }} height={460} camera="free" />
        <p className="mt-2 text-sm text-muted">One continuous spin cycling through the ten variation categories, seen from an orbiting camera so every position is read side-on at some point. Real spins hold each for at least two revolutions; only two difficult variations count toward the level in any one spin. The stills below show each position from a fixed angle.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SPIN_POSITIONS.filter((p) => POSE_IMAGE[p.id]).map((p) => (
            <Card key={p.id} className="flex gap-3">
              <PoseStill pose={POSE_IMAGE[p.id]} alt={`${p.name} position`} />
              <div className="min-w-0">
                <h3 className="font-semibold">
                  {p.name} {p.codeLetter && <span className="font-mono text-muted">{p.codeLetter}</span>} {!p.basic && <span className="text-xs text-muted">(variation of upright)</span>}
                </h3>
                <p className="mt-1 text-sm">{p.definition}</p>
                {p.notes?.map((n) => (
                  <p key={n} className="mt-1 text-xs text-muted">
                    {n}
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {VARIATION_CATEGORIES.map((v) => (
            <div key={v.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
              {POSE_IMAGE[v.id] && <PoseStill pose={POSE_IMAGE[v.id]} alt={`${v.name} variation`} className="mb-2 w-full" />}
              <p className="font-mono font-semibold text-accent-strong">{v.id}</p>
              <p className="font-medium">{v.name}</p>
              <p className="text-xs text-muted">{v.definition}</p>
            </div>
          ))}
        </div>
        <SourceNote refs={[{ doc: "tpSingles", where: "Spins: Categories of difficult variations" }, { doc: "rules2026", where: "Rule 610" }]} className="mt-3" />
      </Section>
      <Section title="Level features">
        <ol className="grid gap-2 md:grid-cols-2">
          {SPIN_LEVEL_FEATURES.map((f) => (
            <li key={f.number} className={`rounded-lg border p-3 text-sm ${f.mandatoryForLevel4 ? "border-accent bg-accent-soft/40" : "border-border bg-surface"}`}>
              <p className="font-semibold">
                {f.number}. {f.name}
                {f.mandatoryForLevel4 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-white">one needed for Level 4</span>}
              </p>
              <p className="mt-1 text-muted">{f.detail}</p>
            </li>
          ))}
        </ol>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
          {SPIN_LEVEL_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <SourceNote refs={[{ doc: "tpSingles", where: "Spins: Level features" }, { doc: "comm2788", where: "I" }]} className="mt-2" />
      </Section>
      <Section title="Windmills, flying entries and changes of foot">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <ElementViewer spec={{ kind: "spin", code: "FCSp" }} height={360} camera="side" />
            <p className="mt-2 text-sm text-muted">Flying camel: a clear jump with a butterfly air position, landing straight into the camel. No rotation on the ice before take-off.</p>
          </div>
          <div>
            <ElementViewer spec={{ kind: "spin", code: "windmills" }} height={360} camera="side" />
            <p className="mt-2 text-sm text-muted">Windmills: three in a row, each close to a split, count as one feature and are one of the six that unlock Level 4.</p>
          </div>
        </div>
      </Section>
      <Section title="Popular names, special entries">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <ElementViewer spec={{ kind: "spin", code: "shapes" }} height={360} camera="side" />
            <p className="mt-2 text-sm text-muted">Pancake, doughnut, haircutter and headless: skaters’ names that the panel files under the ten official categories.</p>
          </div>
          <div>
            <ElementViewer spec={{ kind: "spin", code: "FCSpToeArabian" }} height={360} camera="side" />
            <p className="mt-2 text-sm text-muted">Toe Arabian entry: a horizontal butterfly from the toe pick, credited as a difficult fly or as a change of foot by jump.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SPIN_CLARIFICATIONS.map((c) => (
            <Card key={c.title}>
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm">{c.rule}</p>
            </Card>
          ))}
        </div>
        <SourceNote refs={[{ doc: "tpSingles", where: "Spins: Clarifications" }]} className="mt-3" />
      </Section>
      <Section title="Reduced value (V)">
        <p className="text-sm">The V sign cuts the base value to the row below the full code in the Scale of Values. It is used in exactly four situations:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {V_SIGN_CASES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      </Section>
      <Section title="Requirements">
        <div className="grid gap-4 md:grid-cols-3">
          {(["general", "shortProgram", "freeSkating"] as const).map((k) => (
            <Card key={k}>
              <h3 className="font-semibold">{k === "general" ? "All spins" : k === "shortProgram" ? "Short Program" : "Free Skating"}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {SPIN_REQUIREMENTS[k].map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <SourceNote refs={[{ doc: "rules2026", where: "Rules 610-612" }, { doc: "tpSingles", where: "Spins" }]} className="mt-3" />
      </Section>
      <Section title="Every spin code and its value">
        <div className="mb-3 flex flex-wrap gap-2">
          {SPIN_FAMILIES.map((f) => (
            <Link key={f.code} href={`/spins/${f.code}`} className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-sm hover:border-accent hover:text-accent">
              {f.code}
            </Link>
          ))}
        </div>
        <ValueTable codes={SPIN_FAMILIES.map((f) => `${f.code}4`)} labels={Object.fromEntries(SPIN_FAMILIES.map((f) => [`${f.code}4`, f.name]))} compact />
        <p className="mt-2 text-sm text-muted">Level 4 values shown; open a family for Levels B to 4 and the V rows.</p>
        <SourceNote refs={[{ doc: "sov2786" }]} className="mt-2" />
      </Section>
    </>
  );
}
