"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/jumps", label: "Jumps" },
  { href: "/spins", label: "Spins" },
  { href: "/steps", label: "Steps" },
  { href: "/choreo", label: "Choreo" },
  { href: "/scoring", label: "Scoring" },
  { href: "/calculator", label: "Calculator" },
  { href: "/compare", label: "Compare" },
  { href: "/decoder", label: "Decoder" },
  { href: "/sources", label: "Sources" },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="inline-block h-6 w-6 rounded-full bg-accent" />
          Figure Skating Explained
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap gap-1 text-sm">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-2 ${active ? "bg-accent-soft text-accent-strong font-medium" : "text-muted"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
