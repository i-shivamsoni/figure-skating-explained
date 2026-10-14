import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; also the tooltip. */
  label: string;
  /** Toggle state, when the button is a toggle. */
  active?: boolean;
  size?: "sm" | "md";
}

export function IconButton({ label, active, size = "md", className, children, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        active ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-2 hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
