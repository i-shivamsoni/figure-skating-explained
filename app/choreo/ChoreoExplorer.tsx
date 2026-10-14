"use client";

import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import type { ChoreoId } from "@/three/animation/steps";

const MOVES: { id: ChoreoId; label: string; text: string }[] = [
  { id: "spiral", label: "Spiral", text: "An arabesque on a long edge with the free leg above hip level." },
  { id: "spread-eagle", label: "Spread eagle", text: "Both blades on the ice, heels in, toes out, gliding sideways on matching inside or outside edges." },
  { id: "ina-bauer", label: "Ina Bauer", text: "Like a spread eagle but with the front knee bent and the feet on parallel lines, often with an arched back." },
  { id: "hydroblade", label: "Hydroblade", text: "An extreme lean on a deep edge with the body almost touching the ice." },
];

export function ChoreoExplorer() {
  const [id, setId] = useState<ChoreoId>("spiral");
  const spec = useMemo(() => ({ kind: "choreo" as const, id }), [id]);
  const m = MOVES.find((x) => x.id === id)!;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {MOVES.map((x) => (
          <button key={x.id} type="button" onClick={() => setId(x.id)} aria-pressed={x.id === id} className={`rounded-full border px-3 py-1 text-sm ${x.id === id ? "border-accent bg-accent-soft text-accent-strong font-medium" : "border-border bg-surface hover:border-accent"}`}>
            {x.label}
          </button>
        ))}
      </div>
      <ElementViewer spec={spec} height={440} camera="follow" />
      <p className="mt-2 text-sm">
        <span className="font-semibold">{m.label}:</span> {m.text} Any two different movements like these, linked by steps and turns, make a choreographic sequence.
      </p>
    </div>
  );
}
