"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { spinPreset } from "@/three/animation/spins";
import type { CameraMode } from "@/three/animation/store";

const ElementPlayer = dynamic(() => import("@/three/ElementPlayer").then((m) => m.ElementPlayer), { ssr: false });

/** /dev/spin?code=CCoSp&t=3&cam=side&play=0 */
export function SpinLab() {
  const q = useSearchParams();
  const code = q.get("code") ?? "CSp";
  const timeline = useMemo(() => spinPreset(code), [code]);
  const t = Number(q.get("t") ?? 0);
  const play = q.get("play") !== "0";
  const cam = (q.get("cam") ?? "follow") as CameraMode;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <p className="mb-2 text-sm text-muted">{timeline.title}</p>
      <ElementPlayer timeline={timeline} autoplay={play} initialTime={t} camera={cam} height={600} />
    </div>
  );
}
