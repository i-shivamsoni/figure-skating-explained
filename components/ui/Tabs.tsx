"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface Tab {
  id: string;
  label: ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  /** Pairs the tab list with its panels when a page has several. */
  scope?: string;
  size?: "sm" | "md";
  /** Wrap onto more rows instead of scrolling sideways (narrow docks). */
  wrap?: boolean;
  className?: string;
}

/** A tab list with arrow-key navigation; render the matching TabPanel below it. */
export function Tabs({ tabs, value, onChange, label, scope = "tabs", size = "md", wrap = false, className }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === value);
    if (i < 0) return;
    let j = i;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[j].id);
    refs.current[j]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className={cn("flex gap-1 border-b border-border", wrap ? "flex-wrap" : "overflow-x-auto", className)}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`${scope}-tab-${t.id}`}
          aria-selected={t.id === value}
          aria-controls={`${scope}-panel-${t.id}`}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={cn("focus-ring -mb-px shrink-0 border-b-2 font-medium transition-colors", size === "sm" ? "h-9 px-2.5 text-xs" : "h-10 px-3 text-sm", t.id === value ? "border-accent text-accent-strong" : "border-transparent text-muted hover:text-foreground")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, active, scope = "tabs", children, className }: { id: string; active: boolean; scope?: string; children: ReactNode; className?: string }) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={`${scope}-panel-${id}`} aria-labelledby={`${scope}-tab-${id}`} className={className}>
      {children}
    </div>
  );
}
