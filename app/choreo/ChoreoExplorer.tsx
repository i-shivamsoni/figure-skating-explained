"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { VIEWER_HEIGHT } from "@/components/LessonLayout";
import { Chip } from "@/components/ui/Chip";
import { CHOREO, type ChoreoId } from "@/three/animation/steps";

const ORDER: ChoreoId[] = ["spiral", "arabesque", "spread-eagle", "ina-bauer", "layover-bauer", "hydroblade", "cantilever", "charlotte", "knee-slide"];

/** The movements of a choreographic sequence; `?move=spiral` (the rink's learn card) preselects one. */
export function ChoreoExplorer() {
  const params = useSearchParams();
  const wanted = params.get("move");
  const [id, setId] = useState<ChoreoId>(wanted && wanted in CHOREO ? (wanted as ChoreoId) : "spiral");
  const spec = useMemo(() => ({ kind: "choreo" as const, id }), [id]);
  const m = CHOREO[id];
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER.map((x) => (
          <Chip key={x} onClick={() => setId(x)} active={x === id}>
            {CHOREO[x].label}
          </Chip>
        ))}
      </div>
      <ElementViewer spec={spec} height={VIEWER_HEIGHT} camera="follow" lazy={false} />
      <p className="mt-2 text-sm">
        <span className="font-semibold">{m.label}:</span> {m.detail}.{" "}
        {m.isuNamed ? <span className="text-muted">Named in the ISU texts.</span> : <span className="text-muted">A skaters’ name; the ISU texts do not define it.</span>} Any two different movements like these, linked by steps and turns, make a choreographic sequence.
      </p>
    </div>
  );
}
