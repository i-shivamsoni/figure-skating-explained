"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Camera as CameraIcon, Maximize2, Minimize2, Pause, Play, Repeat, UserRound } from "lucide-react";
import { Euler, Group, Vector3 } from "three";
import { useStore } from "zustand";
import { Stage } from "./Stage";
import { SkaterModel, type SkaterHandle } from "./SkaterModel";
import { markerAt, poseAt, TWO_PI, type IceArrow, type Timeline } from "./animation/timeline";
import { CAMERA_PRESETS, createPlayerStore, type CameraPreset, type PlayerStore } from "./animation/store";
import { useUiStore } from "@/lib/uiStore";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/components/ui/cn";

const EDGE_COLOR: Record<string, string> = { outside: "#1f6fd6", inside: "#e0532f", flat: "#888", toe: "#222" };

export interface ElementPlayerProps {
  timeline: Timeline;
  autoplay?: boolean;
  initialTime?: number;
  camera?: CameraPreset;
  speed?: number;
  height?: number | string;
  className?: string;
  /** Extra HUD content rendered top-right. */
  hud?: ReactNode;
  showControls?: boolean;
  /** Called with the store so parents (compare mode) can drive time. */
  onStore?: (store: PlayerStore) => void;
  /** Element name shown under the action, like a broadcast caption. */
  caption?: string;
  /** Base value that pops up once the element is complete. */
  value?: number;
  /** Called once when playback reaches the end with looping off. */
  onEnd?: () => void;
}

/** Presets that the C key cycles through. */
const CYCLE: CameraPreset[] = ["follow", "side", "front", "overhead", "low", "close"];

export function ElementPlayer({ timeline, autoplay = true, initialTime = 0, camera = "follow", speed = 1, height = 480, className = "", hud, showControls = true, onStore, caption, value, onEnd }: ElementPlayerProps) {
  const store = useMemo(() => createPlayerStore({ duration: timeline.duration, playing: autoplay, time: initialTime, camera, speed }), [timeline.duration, autoplay, initialTime, camera, speed]);
  useEffect(() => {
    onStore?.(store);
  }, [store, onStore]);
  // this component only renders on the client (dynamic import, ssr: false), so reading matchMedia here is safe
  const [reducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (reducedMotion) store.getState().pause();
  }, [reducedMotion, store]);
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
      if ((e.target as HTMLElement).tagName === "INPUT" && e.key !== " ") return;
      const s = store.getState();
      if (e.key === " ") {
        e.preventDefault();
        s.toggle();
      } else if (e.key === "ArrowRight") s.setTime(Math.min(s.duration, s.time + 0.05));
      else if (e.key === "ArrowLeft") s.setTime(Math.max(0, s.time - 0.05));
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "c" || e.key === "C") s.setPreset(CYCLE[(CYCLE.indexOf(s.preset) + 1) % CYCLE.length]);
      else if (e.key === "t" || e.key === "T") s.setTrack(!s.track);
    },
    [store, toggleFullscreen],
  );
  const onOrbitStart = useCallback(() => store.getState().setPreset("free"), [store]);
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKey}
      className={cn("relative overflow-hidden rounded-xl border border-border bg-[#eaf3fa] outline-none focus-visible:ring-2 focus-visible:ring-accent [&:fullscreen]:h-screen! [&:fullscreen]:rounded-none", className)}
      style={{ height }}
    >
      <Stage orbit={{ onStart: onOrbitStart, maxPolarAngle: Math.PI / 2 + 0.3 }} camera={{ position: [timeline.focus.x + 2.8, 2.4, timeline.focus.z + 4.5], target: [timeline.focus.x, 0.9, timeline.focus.z] }}>
        <Actor timeline={timeline} store={store} onEnd={onEnd} />
        {timeline.partner && <Actor timeline={timeline} store={store} partner />}
        <Trace timeline={timeline} />
        {timeline.arrows && <IceArrows arrows={timeline.arrows} store={store} />}
        <CameraRig timeline={timeline} store={store} container={containerRef} />
      </Stage>
      <Hud timeline={timeline} store={store} extra={hud} caption={caption} value={value} controls={showControls} />
      {reducedMotion && <p className="pointer-events-none absolute bottom-14 left-3 rounded-md bg-surface/90 px-2 py-1 text-xs text-muted">Autoplay off (reduced motion). Use Play or the slider.</p>}
      {showControls && <PlayerControls store={store} fullscreen={fullscreen} onFullscreen={toggleFullscreen} />}
    </div>
  );
}

/** The skater (or the pair partner) driven by the store's clock. */
export function Actor({ timeline, store, partner = false, onEnd }: { timeline: Timeline; store: PlayerStore; partner?: boolean; onEnd?: () => void }) {
  const handleRef = useRef<SkaterHandle | null>(null);
  const groupRef = useRef<Group>(null);
  const track = partner ? timeline.partner : undefined;
  const onReady = useCallback(
    (h: SkaterHandle) => {
      handleRef.current = h;
      if (partner) return;
      store.getState().setReady(true);
      if (typeof document !== "undefined") document.body.dataset.skaterReady = "1";
    },
    [store, partner],
  );
  useFrame((_, delta) => {
    const s = store.getState();
    let t = s.time;
    if (s.playing && !partner) {
      t += delta * s.speed;
      if (t > s.duration) {
        if (s.loop) t = t % s.duration;
        else {
          t = s.duration;
          s.pause();
          onEnd?.();
        }
      }
      s.setTime(t);
    }
    const h = handleRef.current;
    const g = groupRef.current;
    if (!h || !g) return;
    if (partner && !track) return;
    const root = partner ? track!.root(t) : timeline.root(t);
    g.position.set(root.x, root.y, root.z);
    g.rotation.set(root.pitch ?? 0, root.yaw, root.roll ?? 0, "YXZ");
    const keys = partner ? { ...timeline, keys: track!.keys } : timeline;
    // on the ice the lowest blade is pinned to the surface (under the body's lean, so an edge does not sink);
    // the clamp fades out over the first 25 cm of flight
    h.rig.applyPose(poseAt(keys, t, (b) => h.rig.restDir(b)), Math.max(0, Math.min(1, 1 - root.y / 0.25)), root.roll ?? 0, root.pitch ?? 0);
  });
  return (
    <group ref={groupRef}>
      <SkaterModel onReady={onReady} variant={partner ? track?.variant : undefined} />
    </group>
  );
}

/** Curved arrows on the ice (the sense of an edge's curve, of a rotation), shown while their time window is active. */
export function IceArrows({ arrows, store }: { arrows: IceArrow[]; store: PlayerStore }) {
  const groups = useRef<(Group | null)[]>([]);
  useFrame(() => {
    const t = store.getState().time;
    arrows.forEach((a, i) => {
      const g = groups.current[i];
      if (g) g.visible = t >= a.from && t <= a.to;
    });
  });
  const shapes = useMemo(
    () =>
      arrows.map((a) => {
        const n = 40;
        const points: [number, number, number][] = [];
        for (let i = 0; i <= n; i++) {
          const ang = a.startAngle + (a.sweep * i) / n;
          points.push([a.x + a.radius * Math.sin(ang), 0.012, a.z + a.radius * Math.cos(ang)]);
        }
        const end = a.startAngle + a.sweep;
        const dir = Math.sign(a.sweep);
        // tangent at the end of the arc, pointing the way the arrow travels
        const yaw = Math.atan2(dir * Math.cos(end), -dir * Math.sin(end));
        const tip: [number, number, number] = [a.x + a.radius * Math.sin(end) + 0.1 * Math.sin(yaw), 0.012, a.z + a.radius * Math.cos(end) + 0.1 * Math.cos(yaw)];
        return { points, tip, rotation: new Euler(Math.PI / 2, yaw, 0, "YXZ") };
      }),
    [arrows],
  );
  return (
    <group>
      {arrows.map((a, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <Line points={shapes[i].points} color={a.color} lineWidth={2} transparent opacity={0.85} />
          <mesh position={shapes[i].tip} rotation={shapes[i].rotation}>
            <coneGeometry args={[0.1, 0.26, 12]} />
            <meshStandardMaterial color={a.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The blade trace, coloured by edge, with the dashed flight path and the toe-pick mark. */
export function Trace({ timeline, opacity = 1 }: { timeline: Timeline; opacity?: number }) {
  const segments = useMemo(() => {
    const out: { color: string; points: [number, number, number][]; dashed?: boolean; partner?: boolean }[] = [];
    let cur: (typeof out)[number] | null = null;
    let lastT = -1;
    for (const s of timeline.trace) {
      const color = EDGE_COLOR[s.edge] ?? "#555";
      const partner = s.actor === "partner";
      // a new line at every change of edge colour, time gap, or skater (the partner's samples follow the primary's)
      const gap = lastT >= 0 && Math.abs(s.t - lastT) > 0.1;
      if (!cur || cur.color !== color || gap || cur.partner !== partner) {
        cur = { color, points: [], partner };
        out.push(cur);
      }
      cur.points.push([s.x, 0.006, s.z]);
      lastT = s.t;
    }
    if (timeline.rotation) {
      const pts: [number, number, number][] = [];
      const { start, end } = timeline.rotation;
      for (let i = 0; i <= 24; i++) {
        const r = timeline.root(start + ((end - start) * i) / 24);
        pts.push([r.x, r.y + 0.02, r.z]);
      }
      out.push({ color: "#6b7a8a", points: pts, dashed: true });
    }
    return out.filter((s) => s.points.length > 1);
  }, [timeline]);
  const toe = useMemo(() => timeline.trace.find((s) => s.edge === "toe"), [timeline]);
  return (
    <group>
      {segments.map((s, i) => (
        <Line key={i} points={s.points} color={s.color} lineWidth={s.dashed ? 1.2 : s.partner ? 1.6 : 2.5} dashed={s.dashed} dashSize={0.15} gapSize={0.1} transparent={opacity < 1} opacity={opacity} />
      ))}
      {toe && (
        <mesh position={[toe.x, 0.01, toe.z]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#222" transparent={opacity < 1} opacity={opacity} />
        </mesh>
      )}
    </group>
  );
}

/** Camera position relative to the point of interest (the skater's hips) for each preset. */
const PRESET_OFFSET: Partial<Record<CameraPreset, [number, number, number]>> = {
  follow: [2.8, 1.5, 4.5],
  side: [0, 0.4, 6.5],
  front: [6, 0.5, 0.8],
  overhead: [0.01, 9, 0.01],
  low: [2.6, -0.6, 3.4],
  close: [1.3, 0.35, 1.7],
};
const ARENA_POSITION = new Vector3(0, 18, 30);
const MIN_CAMERA_HEIGHT = 0.12;

interface OrbitControlsLike {
  target: Vector3;
  update: () => void;
}

const _target = new Vector3();
const _goal = new Vector3();
const _delta = new Vector3();

/**
 * Keeps the orbit controls centred on the skater (when tracking) and glides the camera to a preset
 * when one is chosen; the viewer can drag and zoom from any preset, which turns it into "free".
 * Writes `data-camera="<preset> <track|fixed> <distance>"` on the container for tests.
 */
export function CameraRig({ timeline, store, container, focus }: { timeline: Timeline; store: PlayerStore; container?: RefObject<HTMLDivElement | null>; focus?: (t: number) => { x: number; y: number; z: number } }) {
  const settled = useRef<CameraPreset | null>(null);
  const lastAttr = useRef("");
  useFrame((state, delta) => {
    const s = store.getState();
    const controls = state.controls as unknown as OrbitControlsLike | null;
    const camera = state.camera;
    if (s.preset === "arena") _target.set(0, 0, 0);
    else {
      const r = focus ? focus(s.time) : timeline.root(s.time);
      _target.set(r.x, 0.9 + r.y * 0.5, r.z);
    }
    if (controls && (s.track || s.preset === "arena")) {
      _delta.copy(_target).sub(controls.target);
      if (s.preset !== "arena") camera.position.add(_delta);
      controls.target.copy(_target);
    }
    if (s.preset === "free") settled.current = "free";
    else if (settled.current !== s.preset) {
      if (s.preset === "arena") _goal.copy(ARENA_POSITION);
      else {
        const off = PRESET_OFFSET[s.preset] ?? PRESET_OFFSET.follow!;
        _goal.set(_target.x + off[0], _target.y + off[1], _target.z + off[2]);
      }
      // time-based glide (about half a second), so a slow frame rate does not stretch it
      camera.position.lerp(_goal, 1 - Math.exp(-8 * Math.min(delta, 0.1)));
      if (camera.position.distanceTo(_goal) < 0.02) {
        camera.position.copy(_goal);
        settled.current = s.preset;
      }
    }
    if (camera.position.y < MIN_CAMERA_HEIGHT) camera.position.y = MIN_CAMERA_HEIGHT;
    if (controls) controls.update();
    else camera.lookAt(_target);
    // preset, tracking, distance, then the view direction (azimuth and elevation in degrees) for tests and diagnosis
    _delta.copy(camera.position).sub(controls ? controls.target : _target);
    const azimuth = (Math.atan2(_delta.x, _delta.z) * 180) / Math.PI;
    const elevation = (Math.atan2(_delta.y, Math.hypot(_delta.x, _delta.z)) * 180) / Math.PI;
    const attr = `${s.preset} ${s.track ? "track" : "fixed"} ${_delta.length().toFixed(1)} az ${azimuth.toFixed(0)} el ${elevation.toFixed(0)}`;
    if (attr !== lastAttr.current) {
      lastAttr.current = attr;
      container?.current?.setAttribute("data-camera", attr);
    }
  });
  return null;
}

/** Marker, rotation counter, value pop, arrow legend and caption over the canvas. */
export function Hud({ timeline, store, extra, caption, value, controls = true }: { timeline: Timeline; store: PlayerStore; extra?: ReactNode; caption?: string; value?: number; controls?: boolean }) {
  const time = useStore(store, (s) => s.time);
  const ready = useStore(store, (s) => s.ready);
  const marker = markerAt(timeline, time);
  const rot = timeline.rotation;
  const complete = rot ? time > rot.end + 0.1 : time > timeline.duration * 0.8;
  const popIn = rot ? Math.min(1, Math.max(0, (time - rot.end - 0.1) / 0.3)) : 1;
  let counter: string | null = null;
  if (rot) {
    if (time >= rot.start && time <= rot.end) {
      const done = (timeline.root(time).yaw - (rot.yawStart ?? timeline.root(rot.start).yaw)) / TWO_PI;
      counter = `${done.toFixed(2)} / ${rot.nominal} rev`;
    } else if (time > rot.end) {
      counter = rot.turns < rot.nominal ? `${rot.turns.toFixed(2)} of ${rot.nominal} rev in the air` : `${rot.nominal} rev`;
    }
  }
  const activeArrows = (timeline.arrows ?? []).filter((a) => time >= a.from && time <= a.to);
  return (
    <div className="pointer-events-none absolute inset-0 text-sm">
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 sm:p-3">
        <div className="max-w-[62%] rounded-lg bg-surface/85 px-3 py-1.5 shadow backdrop-blur">
          {!ready && <p className="text-muted">Loading skater…</p>}
          {ready && marker && (
            <>
              <p className="leading-tight font-semibold">{marker.label}</p>
              {marker.detail && <p className="text-xs text-muted max-sm:hidden">{marker.detail}</p>}
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {counter && <div className="rounded-lg bg-surface/85 px-3 py-1.5 font-mono text-base font-semibold shadow backdrop-blur tabular-nums">{counter}</div>}
          {value !== undefined && complete && (
            <div className="rounded-lg bg-accent px-3 py-1 font-mono text-lg font-semibold text-white shadow" style={{ transform: `scale(${0.8 + 0.2 * popIn})`, opacity: popIn }}>
              {value.toFixed(2)}
            </div>
          )}
          {extra}
        </div>
      </div>
      <div className={cn("absolute inset-x-0 grid grid-cols-[1fr_auto_1fr] items-end gap-2 px-2 sm:px-3", controls ? "bottom-12 max-sm:bottom-[5.6rem]" : "bottom-2")}>
        <ul className="flex flex-col items-start gap-1">
          {ready &&
            activeArrows.map((a) => (
              <li key={a.label} className="flex items-center gap-1.5 rounded-full bg-surface/85 px-2 py-0.5 text-[11px] shadow backdrop-blur">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: a.color }} />
                {a.label}
              </li>
            ))}
        </ul>
        {caption ? <span className="rounded-full bg-foreground/80 px-3 py-1 text-center text-xs font-semibold text-background shadow sm:text-sm">{caption}</span> : <span />}
        <span />
      </div>
    </div>
  );
}

const SPEEDS = [0.25, 0.5, 1];
const SPEED_LABEL: Record<number, string> = { 0.25: "¼×", 0.5: "½×", 1: "1×" };

/** Play, scrub, speed, camera menu, loop, full screen and the appearance drawer, in one row. */
export function PlayerControls({ store, fullscreen, onFullscreen, showLoop = true }: { store: PlayerStore; fullscreen?: boolean; onFullscreen?: () => void; showLoop?: boolean }) {
  const time = useStore(store, (s) => s.time);
  const duration = useStore(store, (s) => s.duration);
  const playing = useStore(store, (s) => s.playing);
  const speed = useStore(store, (s) => s.speed);
  const loop = useStore(store, (s) => s.loop);
  const preset = useStore(store, (s) => s.preset);
  const track = useStore(store, (s) => s.track);
  const openSkater = useUiStore((s) => s.openSkaterDrawer);
  const api = store.getState();
  const [cameraOpen, setCameraOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!cameraOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setCameraOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCameraOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [cameraOpen]);
  const presetLabel = CAMERA_PRESETS.find((c) => c.id === preset)?.label ?? preset;
  const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1;
  return (
    <div role="toolbar" aria-label="Playback" className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 bg-surface/90 px-2 py-1.5 text-xs backdrop-blur">
      <div className="flex min-w-0 flex-1 basis-60 items-center gap-1.5">
        <IconButton size="sm" label={playing ? "Pause" : "Play"} onClick={api.toggle} className="bg-accent text-white hover:bg-accent-strong hover:text-white">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </IconButton>
        <input
          type="range"
          aria-label="Time"
          min={0}
          max={duration}
          step={0.01}
          value={time}
          onChange={(e) => {
            api.pause();
            api.setTime(Number(e.target.value));
          }}
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 font-mono whitespace-nowrap text-muted tabular-nums">
          {time.toFixed(2)} / {duration.toFixed(2)} s
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => api.setSpeed(nextSpeed)} aria-label={`Speed ${SPEED_LABEL[speed] ?? speed}, change`} title="Speed" className="focus-ring h-8 min-w-9 rounded-lg px-1.5 font-mono font-medium text-muted hover:bg-surface-2 hover:text-foreground">
          {SPEED_LABEL[speed] ?? `${speed}×`}
        </button>
        <div ref={menuRef} className="relative">
          <button type="button" aria-expanded={cameraOpen} aria-haspopup="dialog" aria-label={`Camera: ${presetLabel}`} onClick={() => setCameraOpen((o) => !o)} title="Camera" className="focus-ring inline-flex h-8 items-center gap-1 rounded-lg px-2 font-medium text-muted hover:bg-surface-2 hover:text-foreground">
            <CameraIcon className="h-4 w-4" />
            <span>{presetLabel}</span>
          </button>
          {cameraOpen && (
            <div role="dialog" aria-label="Camera" className="absolute right-0 bottom-full z-10 mb-1 w-72 rounded-xl border border-border bg-surface p-2 shadow-lg">
              <Segmented<CameraPreset> size="sm" label="Camera preset" value={preset} onChange={(p) => api.setPreset(p)} options={CAMERA_PRESETS.map((c) => ({ id: c.id, label: c.label, hint: c.hint }))} />
              <label className="mt-2 flex items-center gap-2 px-1">
                <input type="checkbox" checked={track} onChange={(e) => api.setTrack(e.target.checked)} /> Follow the skater
              </label>
              <p className="mt-1 px-1 text-[11px] text-muted">Drag to look around, scroll or pinch to zoom. Every preset is a starting point.</p>
            </div>
          )}
        </div>
        {showLoop && (
          <IconButton size="sm" label={loop ? "Loop on" : "Loop off"} active={loop} onClick={() => api.setLoop(!loop)}>
            <Repeat className="h-4 w-4" />
          </IconButton>
        )}
        {onFullscreen && (
          <IconButton size="sm" label={fullscreen ? "Exit full screen" : "Full screen"} onClick={onFullscreen}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </IconButton>
        )}
        <IconButton size="sm" label="Your skater" onClick={openSkater}>
          <UserRound className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
