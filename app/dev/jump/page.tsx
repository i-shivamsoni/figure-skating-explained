import { Suspense } from "react";
import { JumpLab } from "./JumpLab";

export const metadata = { title: "Jump lab", robots: { index: false } };

export default function JumpLabPage() {
  return (
    <Suspense fallback={null}>
      <JumpLab />
    </Suspense>
  );
}
