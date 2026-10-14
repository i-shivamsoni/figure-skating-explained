import { Suspense } from "react";
import { PoseLab } from "./PoseLab";

export const metadata = { title: "Pose lab", robots: { index: false } };

export default function PoseLabPage() {
  return (
    <Suspense fallback={null}>
      <PoseLab />
    </Suspense>
  );
}
