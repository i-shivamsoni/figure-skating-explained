"use client";

import { useCallback } from "react";
import { Stage } from "@/three/Stage";
import { SkaterModel, type SkaterHandle } from "@/three/SkaterModel";
import { POSES } from "@/three/rig/poses";

const CAMS: Record<string, [number, number, number]> = {
  iso: [2.6, 1.6, 3.4],
  front: [0, 1.1, 4.2],
  side: [4.2, 1.1, 0],
  back: [0, 1.1, -4.2],
  top: [0.01, 5, 0.01],
  head: [0.9, 1.6, 1.1],
  card: [2.5, 1.25, 1.9],
  cardLow: [2.5, 0.9, 1.9],
};

export function PoseStage({ pose, cam }: { pose: string; cam: string }) {
  const onReady = useCallback((h: SkaterHandle) => {
    h.rig.applyPose(POSES[pose] ?? POSES.rest);
    document.body.dataset.groundShift = h.rig.groundShift.toFixed(3);
    document.body.dataset.bladeLow = h.rig.lowestBladeY().toFixed(4);
    document.body.dataset.skaterReady = "1";
  }, [pose]);
  return (
    <Stage camera={{ position: CAMS[cam] ?? CAMS.iso, target: cam === "head" ? [0, 1.5, 0] : cam === "cardLow" ? [0, 0.55, 0] : [0, 0.85, 0] }}>
      <SkaterModel pose={POSES[pose] ?? POSES.rest} onReady={onReady} />
    </Stage>
  );
}
