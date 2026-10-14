import type { ReactNode } from "react";
import { cn } from "./cn";

/** A compact row of controls (the player bar). */
export function Toolbar({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div role={label ? "toolbar" : undefined} aria-label={label} className={cn("flex items-center gap-1.5 bg-surface/90 px-2 py-1.5 backdrop-blur", className)}>
      {children}
    </div>
  );
}

export function ToolbarSeparator() {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}
