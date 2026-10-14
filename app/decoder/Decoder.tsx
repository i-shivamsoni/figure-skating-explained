"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { decode } from "@/lib/decoder/parse";

const EXAMPLES = ["4Lz+3T", "3A", "3F!q", "3Lz<+1Eu+3S", "2A+3T+SEQ", "4T<<", "3Lo+REP", "3Lz+COMBO", "FCCoSp4V", "LSp4", "CCSp3V", "StSq3", "ChSq1", "ChSp1", "4Tq+3T", "3Lze"];

export function Decoder() {
  const params = useSearchParams();
  const [input, setInput] = useState(params.get("code") ?? "4Lz+3T");
  const result = useMemo(() => decode(input), [input]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div>
        <label className="block text-sm">
          Element code
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xl"
            placeholder="4Lz+3T"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => setInput(e)} className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-xs hover:border-accent hover:text-accent">
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        {result.input === "" ? (
          <p className="text-sm text-muted">Enter a code.</p>
        ) : (
          <>
            <p className="text-lg font-semibold">{result.summary}</p>
            <p className="mt-1 font-mono text-3xl font-semibold">{result.baseValue.toFixed(2)}</p>
            <p className="text-xs uppercase tracking-wide text-muted">base value</p>
            <ul className="mt-3 space-y-2 text-sm">
              {result.parts.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-20 shrink-0 font-mono font-semibold">{p.token}</span>
                  <span>
                    {p.description}
                    {p.baseValue !== undefined && <span className="ml-1 font-mono text-xs text-muted">({p.baseValue.toFixed(2)})</span>}
                  </span>
                </li>
              ))}
            </ul>
            {result.errors.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-sm text-highlight">
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
