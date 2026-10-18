import type { ReactNode } from "react";
import { cn } from "./ui/cn";

/** The main viewer's height: most of the first screen on a desktop, about half of a phone's. */
export const VIEWER_HEIGHT = "clamp(380px, 58vh, 640px)";

/** Two columns on large screens: the viewer with its controls, and a sticky rail (value card, notes). */
export function LessonGrid({ children, rail, className }: { children: ReactNode; rail: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]", className)}>
      <div className="min-w-0">{children}</div>
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">{rail}</aside>
    </div>
  );
}

/** A labelled row of controls above a viewer. */
export function ControlRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span className="w-20 shrink-0 text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}
