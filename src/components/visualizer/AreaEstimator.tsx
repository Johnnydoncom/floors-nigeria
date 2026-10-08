"use client";

import { useEffect, useState } from "react";
import { naira, number } from "@/lib/format";
import { estimateMaterial } from "@/lib/room/material";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

export type AreaUnit = "sqm" | "sqft";

const SQFT_PER_SQM = 10.7639;
const FT_PER_M = 3.28084;
const UNIT_KEY = "floorsng.area-unit";

/** Waste allowance when the product does not specify one (§12). */
const DEFAULT_WASTE = 10;

/**
 * How much floor, and what it costs (§12).
 *
 * The photograph cannot measure the room, so the visitor gives its length and
 * width — in metres or feet, as they measured it. Waste, packs and cost come
 * from the same arithmetic as the calculator and the room designer, so the
 * three can never disagree about the same room. A product with no pack
 * coverage or price shows only what is known, never an invented number.
 */
export function AreaEstimator({
  material,
  onAreaChange,
}: {
  material: TextureChoice | null;
  /** The area with waste, in m², for the quote and the quote list. */
  onAreaChange: (areaSqm: number | null) => void;
}) {
  const [unit, setUnit] = useState<AreaUnit>("sqm");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(UNIT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time preference from browser storage
      if (saved === "sqft" || saved === "sqm") setUnit(saved);
    } catch {
      /* Preference unavailable; metres it is. */
    }
  }, []);

  const lengthValue = Number(length);
  const widthValue = Number(width);
  const hasArea = lengthValue > 0 && widthValue > 0;
  const toMetres = unit === "sqft" ? 1 / FT_PER_M : 1;
  const areaSqm = hasArea ? lengthValue * toMetres * widthValue * toMetres : 0;

  // Priced at the colour shown, which may differ from the default variation
  // the card carries; packs and coverage are the variation's.
  const variant = material?.variant
    ? {
        ...material.variant,
        pricing: {
          ...material.variant.pricing,
          effective_price: material.price ?? material.variant.pricing.effective_price,
        },
      }
    : null;

  const estimate = hasArea
    ? estimateMaterial({
        areaSqm,
        wastePercentage: material?.wastePercentage ?? DEFAULT_WASTE,
        variant,
      })
    : null;

  useEffect(() => {
    onAreaChange(estimate ? estimate.areaWithWasteSqm : null);
  }, [estimate?.areaWithWasteSqm, onAreaChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeUnit = (next: AreaUnit) => {
    if (next === unit) return;

    // Convert what was typed rather than reinterpreting it.
    const factor = next === "sqft" ? FT_PER_M : 1 / FT_PER_M;
    const convert = (value: string) =>
      Number(value) > 0 ? String(Math.round(Number(value) * factor * 100) / 100) : value;

    setLength(convert(length));
    setWidth(convert(width));
    setUnit(next);

    try {
      window.localStorage.setItem(UNIT_KEY, next);
    } catch {
      /* Not remembered; still applied. */
    }
  };

  const showArea = (sqm: number) =>
    unit === "sqft" ? `${number(sqm * SQFT_PER_SQM, 0)} ft²` : `${number(sqm)} m²`;

  const lengthUnit = unit === "sqft" ? "ft" : "m";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">How much do I need?</p>
        <div
          role="radiogroup"
          aria-label="Units"
          className="flex rounded-md border border-border p-0.5"
        >
          {(["sqm", "sqft"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={unit === option}
              onClick={() => changeUnit(option)}
              className={cn(
                "h-7 rounded px-2.5 text-xs font-semibold transition",
                unit === option ? "bg-charcoal text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {option === "sqm" ? "m²" : "ft²"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <DimensionInput
          id="room-length"
          label={`Length (${lengthUnit})`}
          value={length}
          onChange={setLength}
        />
        <DimensionInput
          id="room-width"
          label={`Width (${lengthUnit})`}
          value={width}
          onChange={setWidth}
        />
      </div>

      {estimate && (
        <dl className="mt-3 space-y-1.5 text-sm" aria-live="polite">
          <Row label="Floor area">{showArea(estimate.areaSqm)}</Row>
          <Row label={`With ${number(estimate.wastePercentage)}% waste`}>
            {showArea(estimate.areaWithWasteSqm)}
          </Row>
          {estimate.packs !== null && <Row label="Packs">{estimate.packs}</Row>}
          {estimate.cost !== null && (
            <Row label="Estimated material">
              <span className="font-mono">{naira(Math.round(estimate.cost))}</span>
            </Row>
          )}
        </dl>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        An estimate for planning. Installation, underlay and delivery are quoted separately.
      </p>
    </div>
  );
}

function DimensionInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10"
      />
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
