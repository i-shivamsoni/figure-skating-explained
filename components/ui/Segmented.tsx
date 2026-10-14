import type { ReactNode } from "react";
import { cn } from "./cn";

export interface SegmentedOption<T extends string | number> {
  id: T;
  label: ReactNode;
  hint?: string;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** A row of mutually exclusive choices (rotations, level, camera preset). */
export function Segmented<T extends string | number>({ options, value, onChange, label, size = "md", className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border border-border bg-surface p-0.5", className)}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          disabled={o.disabled}
          title={o.hint}
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            "focus-ring rounded-md font-medium transition-colors disabled:opacity-40",
            size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm",
            o.id === value ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-2 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
