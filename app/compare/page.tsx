import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/Page";
import { Compare } from "./Compare";

export const metadata: Metadata = {
  title: "Compare elements",
  description: "Watch two elements side by side with a shared timeline: flip against Lutz, triple Axel against quad toe loop, camel against sit spin.",
};

export default function ComparePage() {
  return (
    <>
      <PageHeader compact eyebrow="Compare" title="Two elements, one clock" intro={<p>Both viewers run on one normalised timeline, so take-offs, peaks and landings line up. Pick a pair to try, or any two elements.</p>} />
      <Section className="pt-0">
        <Compare />
      </Section>
    </>
  );
}
