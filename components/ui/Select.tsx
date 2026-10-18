import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label: string;
  options: SelectOption[];
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  dense?: boolean;
}

/** A native select with its label; the label is always announced. */
export function Select({ label, options, hideLabel, dense, className, id, ...rest }: SelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <label htmlFor={selectId} className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className={hideLabel ? "sr-only" : "text-muted"}>{label}</span>
      <select id={selectId} className={cn("focus-ring min-w-0 max-w-full flex-1 rounded-lg border border-border bg-surface px-2", dense ? "h-8 text-xs" : "h-9 text-sm")} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
