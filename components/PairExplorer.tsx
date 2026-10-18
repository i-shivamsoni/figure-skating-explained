"use client";

import { useState } from "react";
import { ElementViewer } from "./ElementViewer";
import { VIEWER_HEIGHT } from "./LessonLayout";
import { Chip } from "./ui/Chip";
import type { PairId } from "@/three/animation/pairs";
import type { CameraMode } from "@/three/animation/store";

export interface PairPresetChoice {
  id: PairId;
  label: string;
}

/** A 3D viewer for pair elements with a row of chips to switch between the presets of one family. */
export function PairExplorer({ presets, camera = "side", height = VIEWER_HEIGHT }: { presets: PairPresetChoice[]; camera?: CameraMode; height?: number | string }) {
  const [id, setId] = useState<PairId>(presets[0].id);
  return (
    <div>
      {presets.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {presets.map((p) => (
            <Chip key={p.id} onClick={() => setId(p.id)} active={id === p.id}>
              <span className="font-mono">{p.id}</span> · {p.label}
            </Chip>
          ))}
        </div>
      )}
      <ElementViewer spec={{ kind: "pair", id }} height={height} camera={camera} lazy={false} />
    </div>
  );
}
