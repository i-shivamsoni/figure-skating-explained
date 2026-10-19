import type { Metadata } from "next";
import { Card, PageHeader, Section } from "@/components/Page";
import { CHANGES_2026_27, SOURCES } from "@/data/sources";
import { GLOSSARY } from "@/data/glossary";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sources and glossary",
  description: "The ISU documents this site is built from, what changed for 2026-27, and a glossary of protocol abbreviations.",
};

export default function SourcesPage() {
  return (
    <>
      <PageHeader eyebrow="References" title="Sources, changes and glossary" intro={<p>Everything here is paraphrased from the official International Skating Union documents for the 2026-27 season. Numbers (base values, factors, deductions) are copied exactly; rule text is reworded. When in doubt, the ISU document wins. The site itself is open source: its code, content and tests are{" "}<a href={REPO_URL} target="_blank" rel="noreferrer" className="text-accent-strong hover:underline">on GitHub</a>.</p>} />
      <Section title="ISU documents">
        <div className="grid gap-3 md:grid-cols-2">
          {SOURCES.map((s) => (
            <Card key={s.id}>
              <h3 className="font-semibold">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-accent-strong hover:underline">
                  {s.title}
                </a>
              </h3>
              <p className="text-xs text-muted">
                {s.publisher} · {s.date}
              </p>
              <p className="mt-1 text-sm">{s.usedFor}</p>
            </Card>
          ))}
        </div>
      </Section>
      <Section id="changes" title="What changed for 2026-27">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {CHANGES_2026_27.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Section>
      <Section id="glossary" title="Glossary">
        <dl className="grid gap-2 md:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <dt className="font-semibold">
                {g.term}
                {g.example && <span className="ml-2 font-mono text-xs text-muted">{g.example}</span>}
              </dt>
              <dd className="text-muted">{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
