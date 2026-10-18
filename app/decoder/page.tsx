import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Section } from "@/components/Page";
import { Decoder } from "./Decoder";

export const metadata: Metadata = {
  title: "Protocol decoder",
  description: "Paste a code from a figure skating protocol such as 4Lz+3T, 3F!q or FCCoSp4V and read it in plain language with its base value.",
};

export default function DecoderPage() {
  return (
    <>
      <PageHeader compact eyebrow="Decoder" title="Read a protocol code" intro={<p>Type a code exactly as it appears on a results protocol and read it in plain language, with its base value.</p>} />
      <Section className="pt-0">
        <Suspense fallback={null}>
          <Decoder />
        </Suspense>
      </Section>
    </>
  );
}
