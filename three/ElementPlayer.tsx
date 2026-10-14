"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Euler, Group, Vector3 } from "three";
import { useStore } from "zustand";
import { Stage } from "./Stage";
import { SkaterModel, type SkaterHandle } from "./SkaterModel";
import { markerAt, poseAt, TWO_PI, type IceArrow, type Timeline } from "./animation/timeline";
import { createPlayerStore, type CameraMode, type PlayerStore } from "./animation/store";
import { COSTUME_PRESETS, useSkaterStore, type SkaterVariant } from "./skaterStore";

const EDGE_COLOR: Record<string, string> = { outside: "#1f6fd6", inside: "#e0532f", flat: "#888", toe: "#222" };

export interface ElementPlayerProps {
  timeline: Timeline;
  autoplay?: boolean;
  initialTime?: number;
  camera?: CameraMode;
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
}

export function ElementPlayer({ timeline, autoplay = true, initialTime = 0, camera = "follow", speed = 1, height = 480, className = "", hud, showControls = true, onStore, caption, value }: ElementPlayerProps) {
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
  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      const s = store.getState();
      if (e.key === " ") {
        e.preventDefault();
        s.toggle();
      } else if (e.key === "ArrowRight") s.setTime(Math.min(s.duration, s.time + 0.05));
      else if (e.key === "ArrowLeft") s.setTime(Math.max(0, s.time - 0.05));
    },
    [store],
  );
  return (
    <div ref={containerRef} tabIndex={0} onKeyDown={onKey} className={`relative overflow-hidden rounded-xl border border-border bg-[#eaf3fa] outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`} style={{ height }}>
      <Stage controls={false} camera={{ position: [timeline.focus.x + 3, 1.6, timeline.focus.z + 5], target: [timeline.focus.x, 0.9, timeline.focus.z] }}>
        <Actor timeline={timeline} store={store} />
        {timeline.partner && <Actor timeline={timeline} store={store} partner />}
        <Trace timeline={timeline} />
        {timeline.arrows && <IceArrows arrows={timeline.arrows} store={store} />}
        <CameraRig timeline={timeline} store={store} />
      </Stage>
      <Hud timeline={timeline} store={store} extra={hud} caption={caption} value={value} />
      {reducedMotion && <p className="pointer-events-none absolute left-3 bottom-14 rounded-md bg-surface/90 px-2 py-1 text-xs text-muted">Autoplay off (reduced motion). Use Play or the slider.</p>}
      {showControls && <Controls store={store} />}
    </div>
  );
}

function Actor({ timeline, store, partner = false }: { timeline: Timeline; store: PlayerStore; partner?: boolean }) {
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
    if (s.playing) {
      t += delta * s.speed;
      if (t > s.duration) t = s.loop ? t % s.duration : s.duration;
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
    h.rig.applyPose(poseAt(keys, t, (b) => h.rig.restDir(b)));
  });
  return (
    <group ref={groupRef}>
      <SkaterModel onReady={onReady} variant={partner ? track?.variant : undefined} />
    </group>
  );
}

/** Curved arrows on the ice (the sense of an edge's curve, of a rotation), shown while their time window is active. */
function IceArrows({ arrows, store }: { arrows: IceArrow[]; store: PlayerStore }) {
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

function Trace({ timeline }: { timeline: Timeline }) {
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
        <Line key={i} points={s.points} color={s.color} lineWidth={s.dashed ? 1.2 : s.partner ? 1.6 : 2.5} dashed={s.dashed} dashSize={0.15} gapSize={0.1} />
      ))}
      {toe && (
        <mesh position={[toe.x, 0.01, toe.z]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      )}
    </group>
  );
}

const _target = new Vector3();
const _pos = new Vector3();

function CameraRig({ timeline, store }: { timeline: Timeline; store: PlayerStore }) {
  const offset = useRef(new Vector3(2.8, 1.5, 4.5));
  useFrame((state) => {
    const s = store.getState();
    const root = timeline.root(s.time);
    const mode: CameraMode = s.camera;
    const controls = state.controls as { enabled: boolean; update: () => void } | null;
    const camera = state.camera;
    _target.set(root.x, 0.9 + root.y * 0.5, root.z);
    if (mode === "orbit") {
      if (controls) {
        controls.enabled = true;
        controls.update();
      }
      return;
    }
    if (controls) controls.enabled = false;
    if (mode === "follow") {
      _pos.copy(_target).add(offset.current);
    } else if (mode === "side") {
      _pos.set(root.x, 1.3, root.z + 6.5);
    } else if (mode === "front") {
      _pos.set(root.x + 6, 1.4, root.z + 0.8);
    } else {
      _pos.set(root.x, 9, root.z + 0.01);
    }
    camera.position.lerp(_pos, mode === "follow" ? 0.12 : 0.2);
    camera.lookAt(_target);
  });
  return null;
}

function Hud({ timeline, store, extra, caption, value }: { timeline: Timeline; store: PlayerStore; extra?: ReactNode; caption?: string; value?: number }) {
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
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 text-sm">
      <div className="flex max-w-xs flex-col items-start gap-2">
        <div className="rounded-lg bg-surface/85 px-3 py-2 shadow backdrop-blur">
          {!ready && <p className="text-muted">Loading skater…</p>}
          {ready && marker && (
            <>
              <p className="font-semibold">{marker.label}</p>
              {marker.detail && <p className="text-xs text-muted">{marker.detail}</p>}
            </>
          )}
        </div>
        {ready && activeArrows.length > 0 && (
          <ul className="rounded-lg bg-surface/85 px-3 py-1.5 text-xs shadow backdrop-blur">
            {activeArrows.map((a) => (
              <li key={a.label} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                {a.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        {counter && <div className="rounded-lg bg-surface/85 px-3 py-2 font-mono text-base font-semibold shadow backdrop-blur">{counter}</div>}
        {value !== undefined && complete && (
          <div className="rounded-lg bg-accent px-3 py-1.5 font-mono text-lg font-semibold text-white shadow" style={{ transform: `scale(${0.8 + 0.2 * popIn})`, opacity: popIn }}>
            {value.toFixed(2)}
          </div>
        )}
        {extra}
      </div>
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center">
          <span className="rounded-full bg-foreground/80 px-4 py-1.5 text-sm font-semibold text-background shadow">{caption}</span>
        </div>
      )}
    </div>
  );
}

const SPEEDS = [0.25, 0.5, 1];
const CAMERAS: { id: CameraMode; label: string }[] = [
  { id: "follow", label: "Follow" },
  { id: "side", label: "Side" },
  { id: "front", label: "Front" },
  { id: "overhead", label: "Overhead" },
  { id: "orbit", label: "Free orbit" },
];

function Controls({ store }: { store: PlayerStore }) {
  const time = useStore(store, (s) => s.time);
  const duration = useStore(store, (s) => s.duration);
  const playing = useStore(store, (s) => s.playing);
  const speed = useStore(store, (s) => s.speed);
  const camera = useStore(store, (s) => s.camera);
  const loop = useStore(store, (s) => s.loop);
  const variant = useSkaterStore((s) => s.variant);
  const setVariant = useSkaterStore((s) => s.setVariant);
  const costume = useSkaterStore((s) => s.costume[variant]);
  const setCostume = useSkaterStore((s) => s.setCostume);
  const api = store.getState();
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-surface/90 px-3 py-2 text-xs backdrop-blur">
      <button type="button" onClick={api.toggle} aria-label={playing ? "Pause" : "Play"} className="rounded-md bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent-strong">
        {playing ? "Pause" : "Play"}
      </button>
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
        className="min-w-32 flex-1 accent-accent"
      />
      <span className="w-20 font-mono text-muted">
        {time.toFixed(2)} / {duration.toFixed(2)} s
      </span>
      <label className="flex items-center gap-1">
        Speed
        <select value={speed} onChange={(e) => api.setSpeed(Number(e.target.value))} className="rounded border border-border bg-surface px-1 py-0.5">
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        Camera
        <select value={camera} onChange={(e) => api.setCamera(e.target.value as CameraMode)} className="rounded border border-border bg-surface px-1 py-0.5">
          {CAMERAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={loop} onChange={(e) => api.setLoop(e.target.checked)} /> Loop
      </label>
      <label className="flex items-center gap-1">
        Skater
        <select value={variant} onChange={(e) => setVariant(e.target.value as SkaterVariant)} className="rounded border border-border bg-surface px-1 py-0.5">
          <option value="female">Woman</option>
          <option value="male">Man</option>
        </select>
      </label>
      <label className="flex items-center gap-1">
        Costume
        <select value={costume} onChange={(e) => setCostume(variant, e.target.value)} className="rounded border border-border bg-surface px-1 py-0.5">
          {COSTUME_PRESETS[variant].map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
