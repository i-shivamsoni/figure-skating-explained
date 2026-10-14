"use client";

import { cn } from "./cn";

export interface Swatch {
  id: string;
  hex: string;
  label: string;
}

export interface SwatchesProps {
  options: Swatch[];
  value: string;
  onChange: (hex: string) => void;
  label: string;
  /** Offer a colour picker beside the swatches. */
  custom?: boolean;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** A row of colour swatches with an optional free colour picker. */
export function Swatches({ options, value, onChange, label, custom = true }: SwatchesProps) {
  const preset = options.some((o) => same(o.hex, value));
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.label}
          aria-label={o.label}
          aria-pressed={same(o.hex, value)}
          onClick={() => onChange(o.hex)}
          className={cn("focus-ring h-7 w-7 rounded-full border-2 transition-transform", same(o.hex, value) ? "scale-110 border-accent" : "border-border hover:scale-105")}
          style={{ background: o.hex }}
        />
      ))}
      {custom && (
        <label className={cn("relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2", preset ? "border-border" : "scale-110 border-accent")} title="Custom colour" style={{ background: preset ? "conic-gradient(#f66, #fc6, #6f6, #6cf, #c6f, #f66)" : value }}>
          <span className="sr-only">Custom colour</span>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
      )}
    </div>
  );
}
