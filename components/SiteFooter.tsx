"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/sources", label: "Sources" },
  { href: "/decoder", label: "Decoder" },
  { href: "/compare", label: "Compare" },
  { href: "/rink", label: "Rink" },
];

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/rink") return null;
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        <nav aria-label="Footer" className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="focus-ring rounded-md font-medium text-foreground hover:text-accent">
              {l.label}
            </Link>
          ))}
        </nav>
        <p>
          Rules, base values and definitions are paraphrased from the International Skating Union documents for the
          2026-27 season. See <Link href="/sources" className="text-accent underline-offset-2 hover:underline">Sources</Link> for the
          originals. This site is independent and not affiliated with the ISU.
        </p>
        <p className="mt-2">Jump feet are described for a counter-clockwise skater; clockwise skaters mirror everything.</p>
      </div>
    </footer>
  );
}
