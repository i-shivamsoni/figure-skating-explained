"use client";

import { useMemo, useState } from "react";
import { baseValueOf, goeValueOf, round2 } from "@/lib/scoring/sov";
import { panelGoeValue, trimmedMean } from "@/lib/scoring/panel";

const SAMPLES: { code: string; label: string }[] = [
  { code: "4T", label: "Quad toe loop" },
  { code: "4Lz", label: "Quad Lutz" },
  { code: "3A", label: "Triple Axel" },
  { code: "3Lz", label: "Triple Lutz" },
  { code: "3Lz<", label: "Triple Lutz, under-rotated" },
  { code: "2A", label: "Double Axel" },
  { code: "CCoSp4", label: "Combination spin, Level 4" },
  { code: "FCSp4", label: "Flying camel, Level 4" },
  { code: "StSq4", label: "Step sequence, Level 4" },
  { code: "ChSq1", label: "Choreographic sequence" },
];

export function ScoringLab() {
  const [code, setCode] = useState("4T");
  const [goe, setGoe] = useState(3);
  const [judges, setJudges] = useState<number[]>([3, 3, 4, 2, 5, 3, 3, 4, 1]);
  const base = baseValueOf(code);
  const value = goeValueOf(code, goe);
  const panel = useMemo(() => panelGoeValue(code, judges), [code, judges]);
  const mean = useMemo(() => trimmedMean(judges), [judges]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-4">
        <label className="block text-sm">
          Element
          <select value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 block w-full rounded border border-border bg-surface px-2 py-1">
            {SAMPLES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} · {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Panel GOE: <span className="font-mono font-semibold">{goe > 0 ? `+${goe}` : goe}</span>
          <input type="range" min={-5} max={5} step={1} value={goe} onChange={(e) => setGoe(Number(e.target.value))} className="mt-1 block w-full accent-accent" />
        </label>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs uppercase tracking-wide text-muted">Base value</p>
            <p className="font-mono text-2xl font-semibold">{base.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs uppercase tracking-wide text-muted">GOE</p>
            <p className={`font-mono text-2xl font-semibold ${value < 0 ? "text-highlight" : "text-ok"}`}>{value >= 0 ? "+" : ""}{value.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-accent-soft p-3">
            <p className="text-xs uppercase tracking-wide text-muted">Element score</p>
            <p className="font-mono text-2xl font-semibold">{round2(base + value).toFixed(2)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Each grade is 10% of the base value ({(base / 10).toFixed(2)} here), so a +5 adds half the base value and a -5 removes it. Choreographic elements use a flat 0.50 per grade.</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm">Nine judges, each giving a GOE for {code}:</p>
        <div className="mt-2 grid grid-cols-9 gap-1">
          {judges.map((j, i) => (
            <input
              key={i}
              type="number"
              min={-5}
              max={5}
              value={j}
              aria-label={`Judge ${i + 1}`}
              onChange={(e) => {
                const v = Math.max(-5, Math.min(5, Math.round(Number(e.target.value) || 0)));
                setJudges((prev) => prev.map((x, k) => (k === i ? v : x)));
              }}
              className="w-full rounded border border-border bg-surface px-1 py-1 text-center font-mono text-sm"
            />
          ))}
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-surface-2 p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Trimmed mean of the grades</dt>
            <dd className="font-mono text-xl font-semibold">{mean.toFixed(2)}</dd>
            <dd className="text-xs text-muted">highest and lowest dropped, then averaged</dd>
          </div>
          <div className="rounded-lg bg-accent-soft p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Panel GOE in points</dt>
            <dd className="font-mono text-xl font-semibold">{panel >= 0 ? "+" : ""}{panel.toFixed(2)}</dd>
            <dd className="text-xs text-muted">the rules average the numerical values, not the grades</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">Element score with this panel: {round2(base + panel).toFixed(2)}.</p>
      </div>
    </div>
  );
}
