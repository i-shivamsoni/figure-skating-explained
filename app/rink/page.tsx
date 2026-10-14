import type { Metadata } from "next";
import { Suspense } from "react";
import { RinkApp } from "./RinkApp";

export const metadata: Metadata = {
  title: "Rink",
  description: "A full-size rink where you steer the skater with the arrow keys, pick the elements she performs, and watch the protocol add up.",
};

export default function RinkPage() {
  return (
    <>
      <h1 className="sr-only">The rink</h1>
      <Suspense fallback={null}>
        <RinkApp />
      </Suspense>
    </>
  );
}
