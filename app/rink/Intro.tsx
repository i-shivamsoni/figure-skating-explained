"use client";

import { useState } from "react";
import { useLocalFlag } from "@/lib/useLocalFlag";
import { useUiStore } from "@/lib/uiStore";
import { Button } from "@/components/ui/Button";

export const INTRO_KEY = "fse-rink-intro";

/** The first-visit card over the ice: three lines on what to do here. Dismissed once, it stays away (the shortcuts panel can bring it back). */
export function Intro({ onShowMe, compact = false }: { onShowMe: () => void; compact?: boolean }) {
  const [dismissed, setDismissed] = useLocalFlag(INTRO_KEY, true);
  const version = useUiStore((s) => s.rinkIntroVersion);
  const [seen, setSeen] = useState(0);
  const open = version > seen || !dismissed;
  if (!open) return null;
  const close = () => {
    setDismissed(true);
    setSeen(version);
  };
  return (
    <div role="dialog" aria-label="Welcome to the rink" data-testid="rink-intro" className="absolute top-1/2 left-1/2 z-30 w-[min(92%,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur sm:p-5">
      <p className="text-xs font-semibold tracking-widest text-accent uppercase">Welcome to the rink</p>
      <h2 className="mt-1 text-lg font-semibold">Pick an element, steer, read the score</h2>
      <ol className="mt-3 space-y-1.5 text-sm text-muted">
        <li>
          <span className="font-medium text-foreground">Perform.</span> Choose a jump, a spin, a step or a pair element and the skater does it from where she is.
        </li>
        <li>
          <span className="font-medium text-foreground">Steer.</span> {compact ? "Hold the arrows in the bar to turn; the gear and the backward switch sit beside them." : "Hold ← → to turn, ↑ ↓ to change gear, B to skate backward. Drag to look around."}
        </li>
        <li>
          <span className="font-medium text-foreground">Score.</span> Every element lands in the protocol with its base value, and a card tells you what you just saw and where to read more.
        </li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => {
            close();
            onShowMe();
          }}
        >
          Show me
        </Button>
        <Button onClick={close}>Got it</Button>
      </div>
    </div>
  );
}
