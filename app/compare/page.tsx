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
      <PageHeader eyebrow="Compare" title="Two elements, one clock" intro={<p>Both viewers run on the same normalised timeline, so the take-offs, peaks and landings line up. Use the overhead camera to compare the edge curves, or the side camera for height and rotation.</p>} />
      <Section>
        <Compare />
      </Section>
    </>
  );
}
