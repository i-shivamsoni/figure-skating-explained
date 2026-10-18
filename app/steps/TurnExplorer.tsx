"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { VIEWER_HEIGHT } from "@/components/LessonLayout";
import { Chip } from "@/components/ui/Chip";
import { TURN_SPECS, type TurnId } from "@/three/animation/steps";

const ORDER: TurnId[] = ["three-turn", "bracket", "rocker", "counter", "loop", "twizzle", "mohawk", "choctaw", "change-of-edge", "cross-roll", "chasse", "toe-step"];

/** Every turn and step from overhead; `?turn=bracket` (the rink's learn card) preselects one. */
export function TurnExplorer() {
  const params = useSearchParams();
  const wanted = params.get("turn");
  const [id, setId] = useState<TurnId>(wanted && wanted in TURN_SPECS ? (wanted as TurnId) : "three-turn");
  const spec = useMemo(() => ({ kind: "turn" as const, id }), [id]);
  const s = TURN_SPECS[id];
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ORDER.map((t) => (
          <Chip key={t} onClick={() => setId(t)} active={t === id} title={TURN_SPECS[t].difficult ? "Counts as a difficult turn or step" : undefined}>
            {TURN_SPECS[t].label}
            {TURN_SPECS[t].difficult && <span className="text-muted">★</span>}
          </Chip>
        ))}
      </div>
      <ElementViewer spec={spec} height={VIEWER_HEIGHT} camera="overhead" lazy={false} />
      <p className="mt-2 text-sm">
        <span className="font-semibold">{s.label}:</span> {s.detail}. {s.changesEdge ? "Changes edge" : "Keeps the edge"}, {s.changesLobe ? "changes lobe" : "stays on the lobe"}, {s.changesFoot ? "steps to the other foot" : "stays on one foot"}
        {s.noTurn ? ", no change of direction" : `, body turns ${s.rotation} the curve`}. {s.difficult ? "Counts as a difficult turn or step (★)." : "Not a difficult turn or step for levels."}
      </p>
    </div>
  );
}
