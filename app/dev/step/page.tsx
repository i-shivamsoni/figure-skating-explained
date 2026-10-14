import { Suspense } from "react";
import { StepLab } from "./StepLab";

export const metadata = { title: "Step lab", robots: { index: false } };

export default function StepLabPage() {
  return (
    <Suspense fallback={null}>
      <StepLab />
    </Suspense>
  );
}
