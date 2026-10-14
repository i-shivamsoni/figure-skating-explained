"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { POSES, poseNames } from "@/three/rig/allPoses";

const PoseStage = dynamic(() => import("./PoseStage").then((m) => m.PoseStage), { ssr: false });

/** Development page: view any named pose. /dev/pose?pose=camel&cam=front */
export function PoseLab() {
  const params = useSearchParams();
  const initial = params.get("pose") ?? "stand";
  const cam = params.get("cam") ?? "iso";
  const names = poseNames();
  const [pose, setPose] = useState(names.includes(initial) ? initial : "stand");
  // ?bare=1 renders only the stage, above the site chrome (used to capture the pose thumbnails in public/poses)
  if (params.get("bare") === "1") {
    return (
      <div id="bare-stage" className="fixed left-0 top-0 z-[200] h-[440px] w-[360px] overflow-hidden bg-[#eaf3fa]">
        <PoseStage pose={initial in POSES ? initial : "stand"} cam={cam} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-3 flex items-center gap-3 text-sm">
        <label htmlFor="pose">Pose</label>
        <select id="pose" value={pose} onChange={(e) => setPose(e.target.value)} className="rounded border border-border bg-surface px-2 py-1">
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="text-muted">camera: {cam}</span>
      </div>
      <div className="h-[640px] overflow-hidden rounded-xl border border-border">
        <PoseStage pose={pose} cam={cam} />
      </div>
    </div>
  );
}
