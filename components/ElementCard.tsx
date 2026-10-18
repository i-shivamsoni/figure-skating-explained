import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./ui/cn";

export interface ElementCardProps {
  href: string;
  title: ReactNode;
  /** Protocol abbreviation shown beside the title. */
  id?: string;
  text: ReactNode;
  /** Small grey line under the text (take-off, example code). */
  meta?: ReactNode;
  /** Adds a "Perform on the rink" action. */
  performHref?: string;
  still?: { src: string; alt: string };
  /** Label of the main link; defaults to "Watch". */
  action?: string;
  className?: string;
}

/** A door to an element or a page: title, one line, and the two things to do with it (watch it, perform it). */
export function ElementCard({ href, title, id, text, meta, performHref, still, action = "Watch", className }: ElementCardProps) {
  return (
    <article className={cn("flex h-full gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent", className)}>
      {still && (
        // eslint-disable-next-line @next/next/no-img-element -- static PNG from /public
        <img src={still.src} alt={still.alt} width={108} height={132} loading="lazy" className="h-[132px] w-[108px] shrink-0 rounded-lg border border-border bg-ice object-cover max-sm:hidden" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">
            <Link href={href} className="focus-ring rounded-md text-accent-strong hover:underline">
              {title}
            </Link>
          </h3>
          {id && <span className="font-mono text-sm text-muted">{id}</span>}
        </div>
        <p className="mt-1 text-sm text-muted">{text}</p>
        {meta && <p className="mt-2 text-xs text-muted">{meta}</p>}
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-sm font-medium">
          <Link href={href} className="focus-ring inline-flex items-center gap-1 rounded-md text-accent hover:underline">
            {action}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {performHref && (
            <Link href={performHref} className="focus-ring inline-flex items-center gap-1 rounded-md text-accent hover:underline">
              <Play className="h-3.5 w-3.5" />
              Perform on the rink
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
