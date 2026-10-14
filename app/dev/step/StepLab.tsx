"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { choreoTimeline, turnTimeline, TURN_SPECS, type ChoreoId, type TurnId } from "@/three/animation/steps";
import type { CameraMode } from "@/three/animation/store";

const ElementPlayer = dynamic(() => import("@/three/ElementPlayer").then((m) => m.ElementPlayer), { ssr: false });

/** /dev/step?id=bracket&t=1.5&cam=overhead&play=0  (id may also be spiral, spread-eagle, ina-bauer, hydroblade) */
export function StepLab() {
  const q = useSearchParams();
  const id = q.get("id") ?? "three-turn";
  const timeline = useMemo(() => (id in TURN_SPECS ? turnTimeline(id as TurnId) : choreoTimeline(id as ChoreoId)), [id]);
  const t = Number(q.get("t") ?? 0);
  const play = q.get("play") !== "0";
  const cam = (q.get("cam") ?? "overhead") as CameraMode;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <p className="mb-2 text-sm text-muted">{timeline.title}</p>
      <ElementPlayer timeline={timeline} autoplay={play} initialTime={t} camera={cam} height={600} />
    </div>
  );
}
