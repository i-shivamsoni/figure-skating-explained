"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTimeline, captionFor, type ViewerSpec } from "@/three/animation/catalog";
import type { PlayerStore } from "@/three/animation/store";
import { ViewerPoster } from "@/components/ElementViewer";
import { useInView } from "@/lib/useInView";

const ElementPlayer = dynamic(() => import("@/three/ElementPlayer").then((m) => m.ElementPlayer), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted">Loading 3D viewer…</div>,
});

const FLIP: ViewerSpec = { kind: "jump", slug: "flip", rotations: 3 };
const LUTZ: ViewerSpec = { kind: "jump", slug: "lutz", rotations: 3 };

/**
 * The Flip and the Lutz on one clock, aligned at the take-off: the same right toe pick, the same
 * counter-clockwise rotation, but the Flip's left back inside edge curves with the rotation and the
 * Lutz's left back outside edge curves against it. The left viewer's controls (and its camera menu)
 * drive both. The players mount when the block scrolls into view.
 */
export function FlipVsLutz({ height = 400 }: { height?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [forced, setForced] = useState(false);
  const show = inView || forced;
  const flip = useMemo(() => buildTimeline(FLIP), []);
  const lutz = useMemo(() => buildTimeline(LUTZ), []);
  const flipLabel = useMemo(() => captionFor(FLIP), []);
  const lutzLabel = useMemo(() => captionFor(LUTZ), []);
  const [storeF, setStoreF] = useState<PlayerStore | null>(null);
  const [storeLz, setStoreLz] = useState<PlayerStore | null>(null);
  const onStoreF = useCallback((s: PlayerStore) => setStoreF(s), []);
  const onStoreLz = useCallback((s: PlayerStore) => {
    s.getState().pause();
    setStoreLz(s);
  }, []);
  // both flights last the same, so lining up the take-offs lines up the landings too
  const offset = (lutz.rotation?.start ?? 0) - (flip.rotation?.start ?? 0);
  useEffect(() => {
    if (!storeF || !storeLz) return;
    const unsub = storeF.subscribe((state) => {
      const lz = storeLz.getState();
      lz.setTime(Math.max(0, Math.min(lz.duration, state.time + offset)));
      if (lz.camera !== state.camera) lz.setCamera(state.camera);
    });
    return unsub;
  }, [storeF, storeLz, offset]);
  return (
    <div ref={ref}>
      <p className="mb-3 text-xs text-muted">The left controls drive both viewers, the camera menu included; the take-offs are lined up. Start from the overhead camera to compare the edge curves.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold">
            Flip <span className="font-mono text-muted">3F</span> · left back <span className="text-[#e0532f]">inside</span> edge
          </p>
          <div style={{ height }}>{show ? <ElementPlayer timeline={flip} camera="overhead" autoplay height={height} showControls onStore={onStoreF} caption={flipLabel.caption} value={flipLabel.value} /> : <ViewerPoster caption="the Flip and the Lutz together" onPlay={() => setForced(true)} />}</div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">
            Lutz <span className="font-mono text-muted">3Lz</span> · left back <span className="text-[#1f6fd6]">outside</span> edge
          </p>
          <div style={{ height }}>{show ? <ElementPlayer timeline={lutz} camera="overhead" autoplay={false} height={height} showControls={false} onStore={onStoreLz} caption={lutzLabel.caption} value={lutzLabel.value} /> : <ViewerPoster caption="the Lutz" onPlay={() => setForced(true)} />}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="font-semibold">Same pick, same rotation</p>
          <p className="mt-1 text-muted">Both jumps are vaulted off the right toe pick from the left foot and rotate counter-clockwise in the air, so from the pick onward they look the same. Everything that separates them happens on the ice before it.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="font-semibold">The edge curves with or against the rotation</p>
          <p className="mt-1 text-muted">
            The Flip comes out of a three turn on the <span className="text-[#e0532f]">inside</span> edge, whose lobe bends the way the jump rotates. The Lutz rides a long <span className="text-[#1f6fd6]">outside</span> edge whose lobe bends the other way: watch the grey edge arrow and the orange rotation arrow bend apart, and the skater lean the opposite way, with the shoulders held back against the turn.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="font-semibold">What the technical panel checks</p>
          <p className="mt-1 text-muted">Only the edge at the moment of the pick. A Lutz that rolls to the inside edge is a lip (3Lze), a Flip that rolls to the outside a flutz (3Fe): the base value drops to the &quot;e&quot; row of the Scale of Values and the GOE is reduced. A flat or doubtful edge is marked &quot;!&quot;: the value stays, the GOE still drops.</p>
        </div>
      </div>
    </div>
  );
}
