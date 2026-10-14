"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { PAIR_IDS, PAIR_PRESETS, pairTimeline } from "@/three/animation/pairs";
import type { CameraMode } from "@/three/animation/store";

const ElementPlayer = dynamic(() => import("@/three/ElementPlayer").then((m) => m.ElementPlayer), { ssr: false });

/** /dev/pair?id=5RLi&t=3&cam=side&play=0 */
export function PairLab() {
  const q = useSearchParams();
  const id = q.get("id") ?? "3Tw";
  const timeline = useMemo(() => pairTimeline(id in PAIR_PRESETS ? id : "3Tw"), [id]);
  const t = Number(q.get("t") ?? 0);
  const play = q.get("play") !== "0";
  const cam = (q.get("cam") ?? "follow") as CameraMode;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <p className="mb-2 text-sm text-muted">
        {timeline.title} · {PAIR_IDS.join(", ")}
      </p>
      <ElementPlayer timeline={timeline} autoplay={play} initialTime={t} camera={cam} height={600} />
    </div>
  );
}
