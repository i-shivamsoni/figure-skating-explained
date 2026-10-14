"use client";

import { useState } from "react";
import { ElementViewer } from "./ElementViewer";
import type { PairId } from "@/three/animation/pairs";
import type { CameraMode } from "@/three/animation/store";

export interface PairPresetChoice {
  id: PairId;
  label: string;
}

/** A 3D viewer for pair elements with a row of buttons to switch between the presets of one family. */
export function PairExplorer({ presets, camera = "side", height = 460 }: { presets: PairPresetChoice[]; camera?: CameraMode; height?: number }) {
  const [id, setId] = useState<PairId>(presets[0].id);
  return (
    <div>
      {presets.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p.id} type="button" onClick={() => setId(p.id)} aria-pressed={id === p.id} className={`rounded-full border px-3 py-1 text-sm ${id === p.id ? "border-accent bg-accent/10 text-accent-strong" : "border-border bg-surface text-muted hover:border-accent"}`}>
              <span className="font-mono">{p.id}</span> · {p.label}
            </button>
          ))}
        </div>
      )}
      <ElementViewer spec={{ kind: "pair", id }} height={height} camera={camera} />
    </div>
  );
}
