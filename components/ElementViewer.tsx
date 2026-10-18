"use client";

import dynamic from "next/dynamic";
import { Play } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { buildTimeline, captionFor, type ViewerSpec } from "@/three/animation/catalog";
import type { CameraMode } from "@/three/animation/store";
import { useInView } from "@/lib/useInView";
import { cn } from "./ui/cn";

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
  /**
   * Mount the WebGL player only when the viewer scrolls near the screen (a poster with a play
   * button stands in until then). The page's main viewer passes `lazy={false}`.
   */
  lazy?: boolean;
}

/** Client wrapper: turns a serialisable spec into a timeline and renders the 3D player. */
export function ElementViewer({ spec, height = 480, camera = "follow", autoplay = true, speed = 1, className, hud, showControls = true, lazy = true }: ElementViewerProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ disabled: !lazy });
  const [forced, setForced] = useState(false);
  const show = !lazy || inView || forced;
  const timeline = useMemo(() => (show ? buildTimeline(spec) : null), [spec, show]);
  const label = useMemo(() => captionFor(spec), [spec]);
  return (
    <div ref={ref} style={{ height }} className={className}>
      {timeline ? (
        <ElementPlayer timeline={timeline} camera={camera} autoplay={autoplay} speed={speed} height={height} hud={hud} showControls={showControls} caption={label.caption} value={label.value} />
      ) : (
        <ViewerPoster caption={label.caption} onPlay={() => setForced(true)} />
      )}
    </div>
  );
}

/** What stands in for a viewer that has not mounted yet. */
export function ViewerPoster({ caption, onPlay, className }: { caption: string; onPlay: () => void; className?: string }) {
  return (
    <div data-viewer-poster className={cn("relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-ice", className)}>
      <div aria-hidden className="absolute inset-x-0 bottom-[38%] h-px bg-border" />
      <button type="button" onClick={onPlay} className="focus-ring relative inline-flex items-center gap-2 rounded-full bg-surface/90 px-4 py-2 text-sm font-medium shadow backdrop-blur hover:bg-surface">
        <Play className="h-4 w-4 text-accent" />
        Watch {caption}
      </button>
    </div>
  );
}
