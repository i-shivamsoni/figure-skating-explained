import type { ReactNode } from "react";

/**
 * The page title block. `compact` is the lesson-page form: a smaller title and a one-line intro,
 * so the viewer under it is still within the first screen.
 */
export function PageHeader({ eyebrow, title, intro, compact = false, aside }: { eyebrow?: string; title: string; intro?: ReactNode; compact?: boolean; aside?: ReactNode }) {
  return (
    <div className={`mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 ${compact ? "pt-6 pb-3" : "pt-10 pb-6"}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>}
        <h1 className={`mt-1 font-semibold tracking-tight ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}>{title}</h1>
        {intro && <div className={`mt-2 max-w-3xl text-muted prose-tight ${compact ? "text-sm sm:text-base" : "mt-3 text-base"}`}>{intro}</div>}
      </div>
      {aside}
    </div>
  );
}

export function Section({ id, title, children, className = "" }: { id?: string; title?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-4 py-6 ${id ? "scroll-mt-20" : ""} ${className}`}>
      {title && <h2 className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>}
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-surface p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Sig({ children }: { children: ReactNode }) {
  return <code className="sig">{children}</code>;
}
