import type { ReactNode } from "react";
import { cn } from "./cn";

export interface ChipProps {
  children: ReactNode;
  /** Makes the chip a toggle button. */
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
}

/** A small pill: a static tag, or a toggle when given onClick. */
export function Chip({ children, onClick, active, disabled, title, className }: ChipProps) {
  if (!onClick) return <span className={cn("inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-xs", className)}>{children}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active === undefined ? undefined : active}
      className={cn(
        "focus-ring inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-40",
        active ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-surface text-muted hover:border-accent hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
