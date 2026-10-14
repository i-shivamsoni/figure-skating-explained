"use client";

import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { CHOREO, type ChoreoId } from "@/three/animation/steps";

const ORDER: ChoreoId[] = ["spiral", "arabesque", "spread-eagle", "ina-bauer", "layover-bauer", "hydroblade", "cantilever", "charlotte", "knee-slide"];

export function ChoreoExplorer() {
  const [id, setId] = useState<ChoreoId>("spiral");
  const spec = useMemo(() => ({ kind: "choreo" as const, id }), [id]);
  const m = CHOREO[id];
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER.map((x) => (
          <button key={x} type="button" onClick={() => setId(x)} aria-pressed={x === id} className={`rounded-full border px-3 py-1 text-sm ${x === id ? "border-accent bg-accent-soft text-accent-strong font-medium" : "border-border bg-surface hover:border-accent"}`}>
            {CHOREO[x].label}
          </button>
        ))}
      </div>
      <ElementViewer spec={spec} height={440} camera="follow" />
      <p className="mt-2 text-sm">
        <span className="font-semibold">{m.label}:</span> {m.detail}.{" "}
        {m.isuNamed ? <span className="text-muted">Named in the ISU texts.</span> : <span className="text-muted">A skaters’ name; the ISU texts do not define it.</span>} Any two different movements like these, linked by steps and turns, make a choreographic sequence.
      </p>
    </div>
  );
}
