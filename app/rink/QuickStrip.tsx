"use client";

import Link from "next/link";
import { Maximize2 } from "lucide-react";
import { useStore } from "zustand";
import { captionFor, specFromCode } from "@/three/animation/catalog";
import type { ProgramStore } from "@/three/animation/program";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/components/ui/cn";
import { QUICK_CODES } from "./programs";

/** The hero's row of one-tap elements, with the way to the full rink. */
export function QuickStrip({ program, onProgram, className }: { program: ProgramStore; onProgram: () => void; className?: string }) {
  const perform = useStore(program, (s) => s.perform);
  return (
    <div data-testid="quick-strip" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="mr-0.5 text-[11px] font-semibold tracking-widest text-muted uppercase">Try</span>
      {QUICK_CODES.map((code) => {
        const spec = specFromCode(code);
        if (!spec) return null;
        const { caption, value } = captionFor(spec);
        return (
          <Chip key={code} onClick={() => perform(spec)} title={caption} className="shadow">
            <span className="font-mono">{code}</span>
            {value !== undefined && <span className="font-mono text-muted tabular-nums">{value.toFixed(2)}</span>}
          </Chip>
        );
      })}
      <Chip onClick={onProgram} className="border-accent text-accent-strong shadow">
        Mini program
      </Chip>
      <Link href="/rink" className="focus-ring ml-1 inline-flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-xs font-medium text-white shadow hover:bg-accent-strong">
        Full rink
        <Maximize2 className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
