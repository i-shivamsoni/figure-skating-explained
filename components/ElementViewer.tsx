"use client";

import dynamic from "next/dynamic";
import { useMemo, type ReactNode } from "react";
import { buildTimeline, type ViewerSpec } from "@/three/animation/catalog";
import type { CameraMode } from "@/three/animation/store";

const ElementPlayer = dynamic(() => import("@/three/ElementPlayer").then((m) => m.ElementPlayer), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted">Loading 3D viewer…</div>,
});

export interface ElementViewerProps {
  spec: ViewerSpec;
  height?: number | string;
  camera?: CameraMode;
  autoplay?: boolean;
  speed?: number;
  className?: string;
  hud?: ReactNode;
  showControls?: boolean;
}

/** Client wrapper: turns a serialisable spec into a timeline and renders the 3D player. */
export function ElementViewer({ spec, height = 480, camera = "follow", autoplay = true, speed = 1, className, hud, showControls = true }: ElementViewerProps) {
  const timeline = useMemo(() => buildTimeline(spec), [spec]);
  return (
    <div style={{ height }} className={className}>
      <ElementPlayer timeline={timeline} camera={camera} autoplay={autoplay} speed={speed} height={height} hud={hud} showControls={showControls} />
    </div>
  );
}
