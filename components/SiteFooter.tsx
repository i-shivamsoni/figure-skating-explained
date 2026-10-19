"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/lib/uiStore";
import { GitHubTextLink } from "./GitHubLink";

const LINKS = [
  { href: "/sources", label: "Sources" },
  { href: "/sources#changes", label: "What changed for 2026-27" },
  { href: "/sources#glossary", label: "Glossary" },
];

export function SiteFooter() {
  const pathname = usePathname();
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  if (pathname === "/rink") return null;
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        <nav aria-label="Footer" className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="focus-ring rounded-md font-medium text-foreground hover:text-accent">
              {l.label}
            </Link>
          ))}
          <button type="button" onClick={openShortcuts} className="focus-ring rounded-md font-medium text-foreground hover:text-accent">
            Keyboard shortcuts
          </button>
          <GitHubTextLink />
        </nav>
        <p>
          Rules, base values and definitions are paraphrased from the International Skating Union documents for the
          2026-27 season. See <Link href="/sources" className="text-accent underline-offset-2 hover:underline">Sources</Link> for the
          originals. This site is independent and not affiliated with the ISU; its code and content are open source.
        </p>
        <p className="mt-2">Jump feet are described for a counter-clockwise skater; clockwise skaters mirror everything.</p>
      </div>
    </footer>
  );
}
