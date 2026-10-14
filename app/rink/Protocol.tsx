"use client";

import { useMemo } from "react";
import { useStore } from "zustand";
import { captionFor } from "@/three/animation/catalog";
import { programTotal, programWarnings, type ProgramStore } from "@/three/animation/program";
import { useSkaterStore } from "@/three/skaterStore";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

/** What is playing, what is queued, what was performed with its value, the running total and the rule checks. */
export function Protocol({ program }: { program: ProgramStore }) {
  const playing = useStore(program, (s) => s.playing);
  const queue = useStore(program, (s) => s.queue);
  const history = useStore(program, (s) => s.history);
  const removeQueued = useStore(program, (s) => s.removeQueued);
  const resurface = useStore(program, (s) => s.resurface);
  const reset = useStore(program, (s) => s.reset);
  const variant = useSkaterStore((s) => s.variant);
  const total = programTotal(history);
  const warnings = useMemo(() => programWarnings(history, variant).filter((w) => w.severity === "error"), [history, variant]);
  return (
    <div className="flex flex-col rounded-b-xl border border-border bg-surface text-sm">
      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">Now</p>
        <p className="font-medium" data-testid="rink-now">
          {playing.kind === "element" ? playing.caption : playing.kind === "link" ? "Stroking" : "Skating around"}
        </p>
      </div>
      {queue.length > 0 && (
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">Up next</p>
          <ul className="mt-1 flex flex-wrap gap-1">
            {queue.map((q, i) => (
              <li key={i}>
                <Chip onClick={() => removeQueued(i)} title="Remove from the queue">
                  {captionFor(q).caption} ×
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex-1 px-3 py-2">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">Protocol</p>
        {history.length === 0 ? (
          <p className="mt-1 text-muted">Nothing performed yet. Pick an element, or press 1 to 6 for a jump.</p>
        ) : (
          <ol className="mt-1 divide-y divide-border" data-testid="rink-protocol">
            {history.map((h, i) => (
              <li key={h.id} className="flex items-baseline justify-between gap-2 py-1">
                <span>
                  <span className="mr-2 font-mono text-xs text-muted">{i + 1}</span>
                  {h.caption}
                </span>
                <span className="font-mono tabular-nums">{h.value !== undefined ? h.value.toFixed(2) : "—"}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
          <span className="text-xs font-semibold tracking-widest text-muted uppercase">Technical score, GOE 0</span>
          <span className="font-mono text-lg font-semibold tabular-nums" data-testid="rink-total">
            {total.toFixed(2)}
          </span>
        </div>
        {warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-highlight">
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2 border-t border-border p-2">
        <Button size="sm" onClick={resurface}>
          Resurface
        </Button>
        <Button size="sm" variant="ghost" onClick={() => reset()}>
          Clear everything
        </Button>
      </div>
    </div>
  );
}
