"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { LearnLink } from "@/three/animation/catalog";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";

/** "What you just saw": the element's name, code and value, one line about it, and the way to its lesson and to the scoring page. */
export function LearnCard({ learn, eyebrow = "What you just saw", onClose, className }: { learn: LearnLink; eyebrow?: string; onClose?: () => void; className?: string }) {
  return (
    <div data-testid="learn-card" className={cn("rounded-xl border border-accent/40 bg-accent-soft/40 p-3 text-sm", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="pt-1 text-[11px] font-semibold tracking-widest text-accent uppercase">{eyebrow}</p>
        {onClose && (
          <IconButton size="sm" label="Dismiss" onClick={onClose} className="-mt-1 -mr-1">
            <X className="h-4 w-4" />
          </IconButton>
        )}
      </div>
      <p className="font-semibold">{learn.title}</p>
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 font-mono text-xs text-muted">
        {learn.code && <span>{learn.code}</span>}
        {learn.value !== undefined ? <span className="text-base font-semibold text-foreground tabular-nums">{learn.value.toFixed(2)}</span> : <span>no base value of its own</span>}
      </p>
      <p className="mt-1 text-muted">{learn.blurb}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-medium">
        <Link href={learn.href} className="focus-ring rounded-md text-accent hover:underline">
          About {learn.about} →
        </Link>
        {learn.scoringHref && (
          <Link href={learn.scoringHref} className="focus-ring rounded-md text-accent hover:underline">
            How it is scored →
          </Link>
        )}
      </div>
    </div>
  );
}
