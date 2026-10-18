import Link from "next/link";
import { Play } from "lucide-react";
import type { ReactNode } from "react";
import type { SovEntry } from "@/lib/scoring/sov";
import { cn } from "./ui/cn";

export interface ValueCardProps {
  /** The protocol code as it would appear on a results sheet. */
  code: string;
  /** Plain-language name under the code. */
  name: ReactNode;
  /** The Scale of Values row, or undefined when the code does not exist. */
  entry?: SovEntry;
  /** Shown beside the base value (an "instead of" comparison, a GOE note). */
  valueNote?: ReactNode;
  /** Why there is no value, when `entry` is undefined. */
  missing?: ReactNode;
  /** Code for /rink?perform=; defaults to `code`. */
  rinkCode?: string;
  testId?: string;
  className?: string;
}

const GRADES = [5, 3, 1, -1, -3, -5];

/** The sticky value rail of an element page: code, perform button, base value and the GOE ladder. */
export function ValueCard({ code, name, entry, valueNote, missing, rinkCode = code, testId, className }: ValueCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
      <p className="text-xs font-semibold tracking-widest text-muted uppercase">Protocol code</p>
      <p className="font-mono text-3xl font-semibold" data-testid={testId ? `${testId}-code` : undefined}>
        {code}
      </p>
      <p className="mt-1 text-sm text-muted">{name}</p>
      <Link href={`/rink?perform=${encodeURIComponent(rinkCode)}`} className="focus-ring mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-medium text-white hover:bg-accent-strong">
        <Play className="h-4 w-4" />
        Perform on the rink
      </Link>
      {entry ? (
        <>
          <p className="mt-4 text-xs font-semibold tracking-widest text-muted uppercase">Base value</p>
          <p className="font-mono text-2xl font-semibold" data-testid={testId ? `${testId}-value` : undefined}>
            {entry.base.toFixed(2)}
            {valueNote && <span className="ml-2 text-sm font-normal text-muted">{valueNote}</span>}
          </p>
          <table className="mt-2 w-full text-xs">
            <caption className="sr-only">Value with each Grade of Execution</caption>
            <tbody>
              {GRADES.map((g) => (
                <tr key={g} className="border-t border-border">
                  <td className="py-1 font-mono text-muted">GOE {g > 0 ? `+${g}` : g}</td>
                  <td className="py-1 text-right font-mono">{(entry.base + entry.goe[g + 5]).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="mt-3 text-sm text-highlight">{missing ?? "Not in the Scale of Values."}</p>
      )}
    </div>
  );
}
