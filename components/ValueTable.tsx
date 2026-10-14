import { SOV } from "@/lib/scoring/sov";

const GRADES = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];

/** Base value and GOE values for a list of Scale of Values codes. */
export function ValueTable({ codes, labels, compact = false, highlight }: { codes: string[]; labels?: Record<string, string>; compact?: boolean; highlight?: string }) {
  const grades = compact ? [-3, -1, 1, 3, 5] : GRADES;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2">Code</th>
            {labels && <th className="px-3 py-2">Element</th>}
            <th className="px-3 py-2 text-right">Base value</th>
            {grades.map((g) => (
              <th key={g} className="px-2 py-2 text-right font-mono">
                {g > 0 ? `+${g}` : g}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {codes.map((code) => {
            const e = SOV.elements[code];
            if (!e) return null;
            const active = code === highlight;
            return (
              <tr key={code} className={`border-t border-border ${active ? "bg-accent-soft/60" : "odd:bg-surface even:bg-surface-2/40"}`}>
                <td className="px-3 py-1.5 font-mono font-semibold">{code}</td>
                {labels && <td className="px-3 py-1.5 text-muted">{labels[code] ?? ""}</td>}
                <td className="px-3 py-1.5 text-right font-mono font-semibold">{e.base.toFixed(2)}</td>
                {grades.map((g) => (
                  <td key={g} className={`px-2 py-1.5 text-right font-mono ${g < 0 ? "text-highlight" : "text-ok"}`}>
                    {e.goe[g + 5].toFixed(2)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
