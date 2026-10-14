"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTimeline, type ViewerSpec } from "@/three/animation/catalog";
import type { CameraMode, PlayerStore } from "@/three/animation/store";
import { JUMPS } from "@/data/jumps";
import { SPIN_PRESETS } from "@/three/animation/spins";
import { TURN_SPECS, type TurnId } from "@/three/animation/steps";

const ElementPlayer = dynamic(() => import("@/three/ElementPlayer").then((m) => m.ElementPlayer), { ssr: false });

interface Option {
  id: string;
  label: string;
  spec: ViewerSpec;
}

const OPTIONS: Option[] = [
  ...JUMPS.filter((j) => j.listed).flatMap((j) => j.rotations.filter((r) => r >= 2).map((r) => ({ id: `${r}${j.id}`, label: `${r}${j.id} · ${j.name}`, spec: { kind: "jump" as const, slug: j.slug, rotations: r } }))),
  { id: "3Lz<", label: "3Lz< · under-rotated Lutz", spec: { kind: "jump", slug: "lutz", rotations: 3, call: "<" } },
  { id: "4T<<", label: "4T<< · downgraded toe loop", spec: { kind: "jump", slug: "toe-loop", rotations: 4, call: "<<" } },
  ...Object.keys(SPIN_PRESETS).filter((c) => !["variations", "windmills", "ChSp"].includes(c)).map((c) => ({ id: c, label: `${c} · ${SPIN_PRESETS[c].title}`, spec: { kind: "spin" as const, code: c } })),
  ...(Object.keys(TURN_SPECS) as TurnId[]).map((t) => ({ id: t, label: `${TURN_SPECS[t].label} (turn)`, spec: { kind: "turn" as const, id: t } })),
];

const PAIRS: [string, string][] = [
  ["3F", "3Lz"],
  ["3A", "4T"],
  ["4Lz", "4Lz"],
  ["3Lz<", "3Lz"],
  ["CSp", "SSp"],
  ["three-turn", "bracket"],
  ["rocker", "counter"],
];

export function Compare() {
  const [left, setLeft] = useState("3F");
  const [right, setRight] = useState("3Lz");
  const [camera, setCamera] = useState<CameraMode>("side");
  const optL = OPTIONS.find((o) => o.id === left) ?? OPTIONS[0];
  const optR = OPTIONS.find((o) => o.id === right) ?? OPTIONS[1];
  const tlL = useMemo(() => buildTimeline(optL.spec), [optL]);
  const tlR = useMemo(() => buildTimeline(optR.spec), [optR]);
  const [storeL, setStoreL] = useState<PlayerStore | null>(null);
  const [storeR, setStoreR] = useState<PlayerStore | null>(null);
  const onStoreL = useCallback((s: PlayerStore) => setStoreL(s), []);
  const onStoreR = useCallback((s: PlayerStore) => {
    s.getState().pause();
    setStoreR(s);
  }, []);
  // the right viewer follows the left one at the same fraction of its own duration
  useEffect(() => {
    if (!storeL || !storeR) return;
    const unsub = storeL.subscribe((state) => {
      const frac = state.duration ? state.time / state.duration : 0;
      const rs = storeR.getState();
      rs.setTime(frac * rs.duration);
      if (rs.camera !== state.camera) rs.setCamera(state.camera);
    });
    return unsub;
  }, [storeL, storeR]);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Pairs:</span>
        {PAIRS.map(([a, b]) => (
          <button
            key={a + b}
            type="button"
            onClick={() => {
              setLeft(a);
              setRight(b);
            }}
            className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-xs hover:border-accent hover:text-accent"
          >
            {a} vs {b}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1">
          Camera
          <select value={camera} onChange={(e) => setCamera(e.target.value as CameraMode)} className="rounded border border-border bg-surface px-1 py-0.5">
            {(["side", "follow", "front", "overhead"] as CameraMode[]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Side label="Left element" value={left} onChange={setLeft}>
          <ElementPlayer key={tlL.id + camera} timeline={tlL} camera={camera} autoplay height={420} showControls onStore={onStoreL} />
        </Side>
        <Side label="Right element" value={right} onChange={setRight}>
          <ElementPlayer key={tlR.id + camera} timeline={tlR} camera={camera} autoplay={false} height={420} showControls={false} onStore={onStoreR} />
        </Side>
      </div>
      <p className="mt-2 text-xs text-muted">The left controls drive both viewers. Durations differ between elements, so the right side plays at a slightly different speed to stay in step.</p>
    </div>
  );
}

function Side({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mb-2 w-full rounded border border-border bg-surface px-2 py-1 text-sm" aria-label={label}>
        {OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {children}
    </div>
  );
}
