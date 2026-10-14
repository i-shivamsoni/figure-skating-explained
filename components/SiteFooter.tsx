import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
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
