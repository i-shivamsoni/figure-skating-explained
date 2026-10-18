import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface DisclosureProps {
  title: ReactNode;
  /** Short grey text beside the title (a count, a hint). */
  summary?: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
}

/** A native details/summary with the site's styling: long reference text folds away under a heading. */
export function Disclosure({ title, summary, defaultOpen, id, children, className }: DisclosureProps) {
  return (
    <details id={id} open={defaultOpen} className={cn("group rounded-xl border border-border bg-surface", className)}>
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 font-semibold select-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
        <span className="min-w-0 flex-1">{title}</span>
        {summary && <span className="shrink-0 text-xs font-normal text-muted">{summary}</span>}
      </summary>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </details>
  );
}
