"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name of the panel. */
  label: string;
  /** The bar that stays visible when the sheet is collapsed (the "peek"). */
  peek: ReactNode;
  children: ReactNode;
  /** Tailwind max-height class of the open content. */
  maxHeight?: string;
  /** Tailwind bottom offset (room for a bar under the sheet). */
  position?: string;
  className?: string;
}

/**
 * A non-modal bottom sheet for phones: the peek bar is always visible, the content slides up when
 * open, and whatever is behind (the ice) stays usable. It positions itself at the bottom of its
 * nearest relative ancestor so it stays inside a full-screen player.
 */
export function Sheet({ open, onOpenChange, label, peek, children, maxHeight = "max-h-[52%]", position = "bottom-0", className }: SheetProps) {
  return (
    <section aria-label={label} data-sheet={open ? "open" : "collapsed"} className={cn("absolute inset-x-0 z-20 flex max-h-full flex-col", position, "rounded-t-2xl border-t border-border bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.18)]", className)}>
      <div className="flex items-center gap-2 pr-1.5 pl-3">
        <div className="min-w-0 flex-1 py-1.5">{peek}</div>
        <button type="button" aria-expanded={open} aria-label={open ? `Collapse ${label}` : `Expand ${label}`} onClick={() => onOpenChange(!open)} className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>
      </div>
      {open && <div className={cn("min-h-0 overflow-y-auto border-t border-border", maxHeight)}>{children}</div>}
    </section>
  );
}
