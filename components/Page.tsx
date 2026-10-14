import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-6">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>}
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <div className="mt-3 max-w-3xl text-base text-muted prose-tight">{intro}</div>}
    </div>
  );
}

export function Section({ id, title, children, className = "" }: { id?: string; title?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-4 py-6 ${className}`}>
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
