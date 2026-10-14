import { Suspense } from "react";
import { SpinLab } from "./SpinLab";

export const metadata = { title: "Spin lab", robots: { index: false } };

export default function SpinLabPage() {
  return (
    <Suspense fallback={null}>
      <SpinLab />
    </Suspense>
  );
}
