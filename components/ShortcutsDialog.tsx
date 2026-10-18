"use client";

import { useUiStore } from "@/lib/uiStore";
import { Button } from "./ui/Button";
import { Drawer } from "./ui/Drawer";

const PLAYER: [string, string][] = [
  ["Space", "Play or pause"],
  ["← →", "Step back or forward by a twentieth of a second (in an element viewer)"],
  ["C", "Next camera preset"],
  ["T", "Follow the skater on or off"],
  ["F", "Full screen"],
  ["?", "This list"],
];
const RINK: [string, string][] = [
  ["← → (hold)", "Turn left or right while stroking"],
  ["↑ ↓", "Change gear: coast, stroke, run, sprint"],
  ["B", "Skate backward or forward"],
  ["1 … 6", "Perform a toe loop, Salchow, loop, flip, Lutz or Axel at the chosen rotations"],
  ["Q W E", "Camel spin, sit spin, change-foot combination spin"],
  ["R", "Resurface the ice (clear the traces)"],
];

function Keys({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {rows.map(([key, what]) => (
        <div key={key} className="flex items-baseline gap-3 py-1.5">
          <dt className="w-24 shrink-0">
            <kbd className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs">{key}</kbd>
          </dt>
          <dd className="text-muted">{what}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The keyboard shortcuts panel: opened with ?, from the footer, or from the player bar. */
export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcuts);
  const close = useUiStore((s) => s.closeShortcuts);
  const showIntro = useUiStore((s) => s.showRinkIntro);
  return (
    <Drawer open={open} onClose={close} title="Keyboard shortcuts" width="max-w-sm">
      <div className="space-y-6 p-4">
        <section>
          <h3 className="mb-1 text-xs font-semibold tracking-widest text-muted uppercase">Any viewer</h3>
          <Keys rows={PLAYER} />
        </section>
        <section>
          <h3 className="mb-1 text-xs font-semibold tracking-widest text-muted uppercase">On the rink</h3>
          <Keys rows={RINK} />
          <p className="mt-2 text-xs text-muted">Click the ice first so the keys reach it. Drag to look around, scroll or pinch to zoom.</p>
        </section>
        <Button size="sm" onClick={showIntro}>
          Show the rink introduction again
        </Button>
      </div>
    </Drawer>
  );
}
