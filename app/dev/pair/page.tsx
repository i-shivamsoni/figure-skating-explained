import { Suspense } from "react";
import { PairLab } from "./PairLab";

export const metadata = { title: "Pair lab", robots: { index: false } };

export default function PairLabPage() {
  return (
    <Suspense fallback={null}>
      <PairLab />
    </Suspense>
  );
}
