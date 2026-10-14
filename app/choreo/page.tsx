import type { Metadata } from "next";
import { Card, PageHeader, Section, Sig } from "@/components/Page";
import { SourceNote } from "@/components/SourceNote";
import { ValueTable } from "@/components/ValueTable";
import { ElementViewer } from "@/components/ElementViewer";
import { ChoreoExplorer } from "./ChoreoExplorer";
import { CHOREO_SEQUENCE, CHOREO_SPIN } from "@/data/choreo";

export const metadata: Metadata = {
  title: "Choreographic elements",
  description: "The choreographic sequence and choreographic spin: fixed base value elements scored by the judges alone, with spirals, spread eagles, Ina Bauers and hydroblading.",
};

export default function ChoreoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Choreographic elements"
        title="Fixed value, judged on quality"
        intro={
          <p>
            Two elements of the Free Skating have no levels at all. The technical panel only confirms that a choreographic sequence or a choreographic spin happened; the judges then score it purely on Grade of Execution, with each grade worth ±0.50 instead of 10% of the base value.
          </p>
        }
      />
      <Section title="Movements of a choreographic sequence">
        <ChoreoExplorer />
      </Section>
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {[CHOREO_SEQUENCE, CHOREO_SPIN].map((el) => (
            <Card key={el.code}>
              <h2 className="text-lg font-semibold">
                {el.name} <Sig>{el.code}</Sig>
              </h2>
              <p className="mt-1 text-sm">{el.summary}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {el.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg bg-surface-2 p-2">
                  <p className="font-semibold text-ok">Positive bullets</p>
                  <ul className="mt-1 list-disc pl-4">
                    {el.goe.positive.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <p className="font-semibold text-highlight">Reductions</p>
                  <ul className="mt-1 list-disc pl-4">
                    {el.goe.negative.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <SourceNote refs={[{ doc: "tpSingles", where: "Choreographic Sequence, Choreographic Spin" }, { doc: "comm2788", where: "II-III" }]} className="mt-3" />
      </Section>
      <Section title="A choreographic spin">
        <ElementViewer spec={{ kind: "spin", code: "ChSp" }} height={420} camera="side" />
      </Section>
      <Section title="Values">
        <ValueTable codes={["ChSq1", "ChSp1"]} labels={{ ChSq1: "Choreographic sequence", ChSp1: "Choreographic spin" }} />
        <SourceNote refs={[{ doc: "sov2786" }]} className="mt-2" />
      </Section>
    </>
  );
}
