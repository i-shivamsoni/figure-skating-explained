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
      <PageHeader eyebrow="Decoder" title="Read a protocol code" intro={<p>Type the code exactly as it appears on a results protocol. Jumps join with +, signs follow the jump, spins end with a level, and markers such as REP, COMBO and SEQ explain what the panel decided.</p>} />
      <Section>
        <Suspense fallback={null}>
          <Decoder />
        </Suspense>
      </Section>
    </>
  );
}
