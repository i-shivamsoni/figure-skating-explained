"use client";

import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { SPECIALS, type SpecialId } from "@/three/animation/special";

const ORDER: SpecialId[] = ["walley", "split-jump", "inside-axel", "backflip"];

export function SpecialExplorer() {
  const [id, setId] = useState<SpecialId>("walley");
  const spec = useMemo(() => ({ kind: "special" as const, id }), [id]);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER.map((s) => (
          <button key={s} type="button" onClick={() => setId(s)} aria-pressed={s === id} className={`rounded-full border px-3 py-1 text-sm ${s === id ? "border-accent bg-accent-soft text-accent-strong font-medium" : "border-border bg-surface hover:border-accent"}`}>
            {SPECIALS[s].label}
          </button>
        ))}
      </div>
      <ElementViewer spec={spec} height={440} camera={id === "backflip" ? "side" : "follow"} />
      <p className="mt-2 text-sm">
        <span className="font-semibold">{SPECIALS[id].label}:</span> {SPECIALS[id].detail}.
      </p>
    </div>
  );
}
