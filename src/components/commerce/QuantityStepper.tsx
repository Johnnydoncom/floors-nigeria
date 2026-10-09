"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { quantityStep, unitSymbol } from "@/lib/cart";
import { cn } from "@/lib/utils";

/**
 * A quantity in its selling unit: +/- by a sensible step (5 m², 1 pack),
 * or typed exactly.
 */
export function QuantityStepper({
  value,
  unit,
  label,
  onChange,
  size = "md",
}: {
  value: number;
  unit: string;
  label: string;
  onChange: (value: number) => void;
  size?: "sm" | "md";
}) {
  const [draft, setDraft] = useState(String(value));
  const step = quantityStep(unit);
  const symbol = unitSymbol(unit);

  // Follow changes made elsewhere (the drawer, a server adjustment).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror the controlled value
    setDraft(String(value));
  }, [value]);

  const commit = (next: number) => {
    const clean = Number.isFinite(next) ? Math.max(1, Math.round(next * 100) / 100) : value;
    setDraft(String(clean));
    if (clean !== value) onChange(clean);
  };

  const box = size === "sm" ? "h-9" : "h-10";
  const button = size === "sm" ? "w-9" : "w-10";

  return (
    <div className={cn("inline-flex items-center rounded-md border border-border", box)}>
      <button
        type="button"
        className={cn("grid h-full place-items-center transition hover:text-gold", button)}
        onClick={() => commit(value - step)}
        aria-label={`Decrease ${label} by ${step} ${symbol}`}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <label className="flex h-full items-center gap-1 px-1">
        <span className="sr-only">Quantity of {label}</span>
        <input
          type="number"
          inputMode="decimal"
          min={1}
          step="any"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(Number(draft))}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(Number(draft));
          }}
          className="h-full w-14 bg-transparent text-center font-mono text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="font-mono text-xs text-muted-foreground">{symbol}</span>
      </label>
      <button
        type="button"
        className={cn("grid h-full place-items-center transition hover:text-gold", button)}
        onClick={() => commit(value + step)}
        aria-label={`Increase ${label} by ${step} ${symbol}`}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
