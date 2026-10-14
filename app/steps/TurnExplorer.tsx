"use client";

import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { TURN_SPECS, type TurnId } from "@/three/animation/steps";

const ORDER: TurnId[] = ["three-turn", "bracket", "rocker", "counter", "loop", "twizzle", "mohawk", "choctaw"];

export function TurnExplorer() {
  const [id, setId] = useState<TurnId>("three-turn");
  const spec = useMemo(() => ({ kind: "turn" as const, id }), [id]);
  const s = TURN_SPECS[id];
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER.map((t) => (
          <button key={t} type="button" onClick={() => setId(t)} aria-pressed={t === id} className={`rounded-full border px-3 py-1 text-sm ${t === id ? "border-accent bg-accent-soft text-accent-strong font-medium" : "border-border bg-surface hover:border-accent"}`}>
            {TURN_SPECS[t].label}
          </button>
        ))}
      </div>
      <ElementViewer spec={spec} height={460} camera="overhead" />
      <p className="mt-2 text-sm">
        <span className="font-semibold">{s.label}:</span> {s.detail}. {s.changesEdge ? "Changes edge" : "Keeps the edge"}, {s.changesLobe ? "changes lobe" : "stays on the lobe"}, {s.changesFoot ? "steps to the other foot" : "stays on one foot"}, body turns {s.rotation} the curve.
      </p>
    </div>
  );
}
