"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTimeline, type ViewerSpec } from "@/three/animation/catalog";
import type { PlayerStore } from "@/three/animation/store";
import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Select";
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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">Pairs to try</span>
        {PAIRS.map(([a, b]) => (
          <Chip
            key={a + b}
            active={left === a && right === b}
            onClick={() => {
              setLeft(a);
              setRight(b);
            }}
          >
            <span className="font-mono">
              {a} vs {b}
            </span>
          </Chip>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Side label="Left element" value={left} onChange={setLeft}>
          <ElementPlayer key={tlL.id} timeline={tlL} camera="side" autoplay height={420} showControls onStore={onStoreL} />
        </Side>
        <Side label="Right element" value={right} onChange={setRight}>
          <ElementPlayer key={tlR.id} timeline={tlR} camera="side" autoplay={false} height={420} showControls={false} onStore={onStoreR} />
        </Side>
      </div>
      <p className="mt-2 text-xs text-muted">The left controls drive both viewers, the camera menu included: overhead to compare the edge curves, side for height and rotation. Durations differ between elements, so the right side plays at a slightly different speed to stay in step.</p>
    </div>
  );
}

function Side({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <Select label={label} hideLabel className="mb-2 w-full" value={value} onChange={(e) => onChange(e.target.value)} options={OPTIONS.map((o) => ({ value: o.id, label: o.label }))} />
      {children}
    </div>
  );
}
