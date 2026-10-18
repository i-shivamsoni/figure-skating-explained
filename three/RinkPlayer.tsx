"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { Stage } from "./Stage";
import { Actor, CameraRig, Hud, IceArrows, PlayerControls, Trace } from "./ElementPlayer";
import { createPlayerStore } from "./animation/store";
import { pointAt } from "./animation/place";
import type { ProgramStore } from "./animation/program";
import { cn } from "@/components/ui/cn";
import { useUiStore } from "@/lib/uiStore";

/**
 * The freeplay rink: the arena, the skater performing the program store's segments one after
 * another, the marks they leave, and whatever panels the page lays over it (they stay in full
 * screen because they live inside the player).
 */
export function RinkPlayer({ program, className, children }: { program: ProgramStore; className?: string; children?: ReactNode }) {
  const playing = useStore(program, (s) => s.playing);
  const marks = useStore(program, (s) => s.marks);
  const queued = useStore(program, (s) => s.queue.length);
  const steerVersion = useStore(program, (s) => s.steerVersion);
  // the segment on arrival frames the first camera; one clock for the page, reset by each new segment
  const [first] = useState(playing.timeline);
  const store = useMemo(() => createPlayerStore({ duration: first.duration, playing: true, camera: "follow" }), [first]);
  useEffect(() => {
    store.setState({ time: 0, duration: playing.timeline.duration, playing: true, loop: false });
  }, [playing, store]);
  // an element queued, or a change of steering, while the skater strokes around: start right away from where she is
  useEffect(() => {
    const s = program.getState();
    if ((queued > 0 || steerVersion > 0) && s.playing.kind === "idle") s.advance(pointAt(s.playing.timeline, store.getState().time));
  }, [queued, steerVersion, program, store]);
  const onEnd = useCallback(() => program.getState().advance(), [program]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);
  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(tag) && e.key !== " ") return;
      const s = store.getState();
      if (e.key === " ") {
        e.preventDefault();
        s.toggle();
      } else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "t" || e.key === "T") s.setTrack(!s.track);
      else if (e.key === "?") useUiStore.getState().openShortcuts();
    },
    [store, toggleFullscreen],
  );
  const onOrbitStart = useCallback(() => store.getState().setPreset("free"), [store]);
  const tl = playing.timeline;
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKey}
      data-rink-playing={playing.kind}
      className={cn("relative overflow-hidden bg-[#0f1722] outline-none focus-visible:ring-2 focus-visible:ring-accent [&:fullscreen]:h-screen! [&:fullscreen]:rounded-none", className)}
    >
      <Stage arena orbit={{ onStart: onOrbitStart, maxPolarAngle: Math.PI / 2 + 0.3, maxDistance: 90 }} camera={{ position: [first.focus.x + 2.8, 2.4, first.focus.z + 4.5], target: [first.focus.x, 0.9, first.focus.z] }}>
        {marks.map((m, i) => (
          <Trace key={`${i}-${m.id}-${m.duration}`} timeline={m} opacity={0.2 + (0.6 * (i + 1)) / marks.length} />
        ))}
        <Trace timeline={tl} />
        <Actor timeline={tl} store={store} onEnd={onEnd} />
        {tl.partner && <Actor timeline={tl} store={store} partner />}
        {tl.arrows && <IceArrows arrows={tl.arrows} store={store} />}
        <CameraRig timeline={tl} store={store} container={containerRef} />
      </Stage>
      <Hud timeline={tl} store={store} caption={playing.caption} value={playing.value} />
      {children}
      <PlayerControls store={store} fullscreen={fullscreen} onFullscreen={toggleFullscreen} showLoop={false} />
    </div>
  );
}
