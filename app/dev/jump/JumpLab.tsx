"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { JUMP_BY_SLUG } from "@/data/jumps";
import { jumpTimeline, type RotationCall } from "@/three/animation/jumps";
import type { CameraMode } from "@/three/animation/store";

const ElementPlayer = dynamic(() => import("@/three/ElementPlayer").then((m) => m.ElementPlayer), { ssr: false });

/** /dev/jump?type=lutz&rot=4&t=1.9&cam=side&play=0&call=q */
export function JumpLab() {
  const q = useSearchParams();
  const jump = JUMP_BY_SLUG[q.get("type") ?? "lutz"] ?? JUMP_BY_SLUG.lutz;
  const rotations = Number(q.get("rot") ?? 3);
  const call = (q.get("call") ?? "") as RotationCall;
  const timeline = useMemo(() => jumpTimeline({ jump, rotations, call }), [jump, rotations, call]);
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
