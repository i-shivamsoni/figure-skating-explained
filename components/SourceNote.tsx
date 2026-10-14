import { SOURCE_BY_ID } from "@/data/sources";
import type { SourceRef } from "@/data/types";

/** Compact citation chips linking to the ISU document a passage is paraphrased from. */
export function SourceNote({ refs, className = "" }: { refs: SourceRef[]; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted ${className}`}>
      <span>Source:</span>
      {refs.map((r, i) => {
        const doc = SOURCE_BY_ID[r.doc];
        return (
          <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="rounded-full border border-border bg-surface px-2 py-0.5 hover:border-accent hover:text-accent">
            {doc.title.split(":")[0].replace("Special Regulations & Technical Rules, Single & Pair Skating 2026", "ISU Rules 2026")}
            {r.where ? ` · ${r.where}` : ""}
          </a>
        );
      })}
    </p>
  );
}
