"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { Chip } from "@/components/ui/Chip";
import { SPECIALS, type SpecialId } from "@/three/animation/special";

const ORDER: SpecialId[] = ["walley", "split-jump", "inside-axel", "backflip"];

/** The non-listed jumps; `?special=backflip` (the rink's learn card) preselects one. */
export function SpecialExplorer() {
  const params = useSearchParams();
  const wanted = params.get("special");
  const [id, setId] = useState<SpecialId>(wanted && wanted in SPECIALS ? (wanted as SpecialId) : "walley");
  const spec = useMemo(() => ({ kind: "special" as const, id }), [id]);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER.map((s) => (
          <Chip key={s} onClick={() => setId(s)} active={s === id}>
            {SPECIALS[s].label}
          </Chip>
        ))}
      </div>
      <ElementViewer spec={spec} height={440} camera={id === "backflip" ? "side" : "follow"} lazy={!wanted} />
      <p className="mt-2 text-sm">
        <span className="font-semibold">{SPECIALS[id].label}:</span> {SPECIALS[id].detail}.
      </p>
    </div>
  );
}
