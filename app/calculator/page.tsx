import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/Page";
import { SourceNote } from "@/components/SourceNote";
import { Calculator } from "./Calculator";

export const metadata: Metadata = {
  title: "Program calculator",
  description: "Build a Short Program or Free Skating from jumps, spins and steps and see the technical score, program components and total under the 2026-27 Scale of Values.",
};

export default function CalculatorPage() {
  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="Build a program, read the score"
        intro={<p>Add elements in the order they are skated, set the panel’s GOE and the component marks, and the calculator applies the 2026-27 Scale of Values, the second-half bonus, repetition rules and deductions. Warnings show where a program breaks the Short Program or well-balanced program requirements.</p>}
      />
      <Section>
        <Calculator />
        <SourceNote refs={[{ doc: "sov2786" }, { doc: "rules2026", where: "Rules 353, 611, 612" }, { doc: "tpSingles", where: "Jump Elements" }]} className="mt-4" />
      </Section>
    </>
  );
}
