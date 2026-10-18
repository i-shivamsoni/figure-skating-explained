"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "zustand";
import { captionFor, learnFor, toElementSpecs } from "@/three/animation/catalog";
import { programTotal, programWarnings, type Performed, type ProgramStore } from "@/three/animation/program";
import { useSkaterStore } from "@/three/skaterStore";
import { elementCode } from "@/lib/scoring/elements";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/components/ui/cn";
import { LearnCard } from "./LearnCard";

/**
 * The score dock: what is playing, what is queued, the card for the element you picked (or the
 * last one performed), the protocol with its values, the running total and what it means, the
 * rule checks, and the way into the calculator.
 */
export function Protocol({ program, selected, onSelect }: { program: ProgramStore; selected: Performed | null; onSelect: (id: number | null) => void }) {
  const playing = useStore(program, (s) => s.playing);
  const queue = useStore(program, (s) => s.queue);
  const history = useStore(program, (s) => s.history);
  const removeQueued = useStore(program, (s) => s.removeQueued);
  const resurface = useStore(program, (s) => s.resurface);
  const reset = useStore(program, (s) => s.reset);
  const variant = useSkaterStore((s) => s.variant);
  const total = programTotal(history);
  const warnings = useMemo(() => programWarnings(history, variant).filter((w) => w.severity === "error"), [history, variant]);
  const last = history.length ? history[history.length - 1] : null;
  const learn = selected ? learnFor(selected.spec) : null;
  const codes = history.flatMap((h) => toElementSpecs(h.spec)).map(elementCode);
  const eyebrow = "text-xs font-semibold tracking-widest text-muted uppercase";
  return (
    <div className="flex flex-col text-sm">
      <div className="border-b border-border px-3 py-2">
        <p className={eyebrow}>Now</p>
        <p className="font-medium" data-testid="rink-now">
          {playing.kind === "element" ? playing.caption : playing.kind === "link" ? (playing.caption ?? "Stroking") : "Skating around"}
        </p>
      </div>
      {queue.length > 0 && (
        <div className="border-b border-border px-3 py-2">
          <p className={eyebrow}>Up next</p>
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
      {learn && selected && (
        <div className="border-b border-border px-3 py-2">
          <LearnCard learn={learn} eyebrow={selected.id === last?.id ? "What you just saw" : `Performed, number ${history.findIndex((h) => h.id === selected.id) + 1}`} />
        </div>
      )}
      <div className="flex-1 px-3 py-2">
        <p className={eyebrow}>Protocol</p>
        {history.length === 0 ? (
          <p className="mt-1 text-muted">Nothing performed yet. Pick an element, or press 1 to 6 for a jump.</p>
        ) : (
          <ol className="mt-1 divide-y divide-border" data-testid="rink-protocol">
            {history.map((h, i) => (
              <li key={h.id}>
                <button type="button" onClick={() => onSelect(h.id)} aria-pressed={selected?.id === h.id} className={cn("focus-ring flex w-full items-baseline justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-surface-2", selected?.id === h.id && "bg-accent-soft/60")}>
                  <span>
                    <span className="mr-2 font-mono text-xs text-muted">{i + 1}</span>
                    {h.caption}
                  </span>
                  <span className="font-mono tabular-nums">{h.value !== undefined ? h.value.toFixed(2) : "—"}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
          <span className={eyebrow}>Technical score</span>
          <span className="font-mono text-lg font-semibold tabular-nums" data-testid="rink-total">
            {total.toFixed(2)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Base values only, every element at GOE 0. The judges&apos; Grade of Execution would add or take up to half of each base value.{" "}
          <Link href="/scoring#goe" className="font-medium text-accent hover:underline">
            How GOE works →
          </Link>
        </p>
        {warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-highlight">
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border p-2">
        <Link
          href={`/calculator?codes=${encodeURIComponent(codes.join(","))}`}
          aria-disabled={codes.length === 0}
          tabIndex={codes.length === 0 ? -1 : undefined}
          data-testid="open-calculator"
          className={cn("focus-ring inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-medium", codes.length ? "border-accent text-accent-strong hover:bg-accent-soft" : "pointer-events-none border-border text-muted opacity-60")}
        >
          Open in the calculator
        </Link>
        <Button size="sm" onClick={resurface}>
          Resurface
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            reset();
            onSelect(null);
          }}
        >
          Clear everything
        </Button>
      </div>
    </div>
  );
}
