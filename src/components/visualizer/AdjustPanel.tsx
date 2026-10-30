"use client";

import { RotateCcw } from "lucide-react";
import { LAYOUT_LABELS, layoutsFor } from "@/lib/visualizer/patterns";
import {
  FLOOR_WIDTH_RANGE,
  type Finish,
  type MaterialKind,
  type Placement,
} from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

const ROTATION_PRESETS = [0, 45, 90];
const FINISHES: { value: Finish; label: string }[] = [
  { value: "matte", label: "Matte" },
  { value: "satin", label: "Satin" },
  { value: "gloss", label: "Gloss" },
];

/**
 * How the floor is laid (§10): pattern, direction, size, finish and light.
 *
 * Plank size defaults to the product's real dimensions; "floor width" is the
 * one number a photograph cannot give, and dialling it in is what makes the
 * planks look the size they will be.
 */
export function AdjustPanel({
  placement,
  kind,
  productDimensions,
  onChange,
  onLayoutChange,
  onReset,
}: {
  placement: Placement;
  kind: MaterialKind;
  /** The product's own plank size, for "reset to product". */
  productDimensions: { lengthMm: number; widthMm: number; isMeasured: boolean };
  onChange: (placement: Placement) => void;
  onLayoutChange: (layout: Placement["layout"]) => void;
  onReset: () => void;
}) {
  const set = (patch: Partial<Placement>) => onChange({ ...placement, ...patch });
  const layouts = layoutsFor(kind);
  const showsPieces = placement.layout !== "natural";
  const isCustomSize =
    placement.plankLengthMm !== productDimensions.lengthMm ||
    placement.plankWidthMm !== productDimensions.widthMm;

  return (
    <div className="space-y-6">
      {layouts.length > 1 && (
        <fieldset>
          <legend className="text-sm font-semibold">Pattern</legend>
          <div
            className="mt-2 flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="Laying pattern"
          >
            {layouts.map((layout) => (
              <Chip
                key={layout}
                active={placement.layout === layout}
                onClick={() => onLayoutChange(layout)}
              >
                {LAYOUT_LABELS[layout]}
              </Chip>
            ))}
          </div>
          {placement.layout === "natural" && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Repeats the surface from the product photo. Choose a pattern to lay individual{" "}
              {kind === "tile" ? "tiles" : "planks"} at their real size.
            </p>
          )}
        </fieldset>
      )}

      <fieldset>
        <legend className="text-sm font-semibold">Direction</legend>
        <div
          className="mt-2 flex flex-wrap items-center gap-1.5"
          role="radiogroup"
          aria-label="Rotation"
        >
          {ROTATION_PRESETS.map((angle) => (
            <Chip
              key={angle}
              active={placement.rotation === angle}
              onClick={() => set({ rotation: angle })}
            >
              {angle}°
            </Chip>
          ))}
        </div>
        <Slider
          id="rotation"
          label="Fine rotation"
          hint={`${placement.rotation}°`}
          min={-90}
          max={90}
          step={1}
          value={placement.rotation}
          onChange={(rotation) => set({ rotation })}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Size</legend>
        <Slider
          id="floor-width"
          label="Floor width in the photo"
          hint={`≈ ${placement.widthM.toFixed(1)} m`}
          min={FLOOR_WIDTH_RANGE.min}
          max={FLOOR_WIDTH_RANGE.max}
          step={0.1}
          value={placement.widthM}
          onChange={(widthM) => set({ widthM })}
        />
        <p className="-mt-2 text-[11px] text-muted-foreground">
          Worked out from your photo. Adjust until the {kind === "tile" ? "tiles" : "planks"} look
          the right size against your furniture.
        </p>

        {showsPieces && (
          <div>
            <div className="grid grid-cols-2 gap-2">
              <MillimetreInput
                id="plank-length"
                label="Length (mm)"
                value={placement.plankLengthMm}
                onChange={(plankLengthMm) =>
                  set({ plankLengthMm: Math.max(plankLengthMm, placement.plankWidthMm) })
                }
              />
              <MillimetreInput
                id="plank-width"
                label="Width (mm)"
                value={placement.plankWidthMm}
                onChange={(plankWidthMm) =>
                  set({ plankWidthMm: Math.min(plankWidthMm, placement.plankLengthMm) })
                }
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {productDimensions.isMeasured
                ? isCustomSize
                  ? "Custom size."
                  : "The product's real size."
                : "This product has no size recorded, so a typical size is assumed."}
              {isCustomSize && (
                <button
                  type="button"
                  className="ml-1 underline underline-offset-2"
                  onClick={() =>
                    set({
                      plankLengthMm: productDimensions.lengthMm,
                      plankWidthMm: productDimensions.widthMm,
                    })
                  }
                >
                  Reset
                </button>
              )}
            </p>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Finish &amp; light</legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Finish">
          {FINISHES.map((finish) => (
            <Chip
              key={finish.value}
              active={placement.finish === finish.value}
              onClick={() => set({ finish: finish.value })}
            >
              {finish.label}
            </Chip>
          ))}
        </div>
        <Slider
          id="lighting"
          label="Room lighting & shadows"
          hint={`${Math.round(placement.lighting * 100)}%`}
          min={0}
          max={100}
          step={5}
          value={Math.round(placement.lighting * 100)}
          onChange={(value) => set({ lighting: value / 100 })}
        />
        <Slider
          id="brightness"
          label="Material brightness"
          hint={`${Math.round(placement.brightness * 100)}%`}
          min={60}
          max={140}
          step={5}
          value={Math.round(placement.brightness * 100)}
          onChange={(value) => set({ brightness: value / 100 })}
        />
      </fieldset>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        Reset adjustments
      </button>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        active
          ? "border-charcoal bg-charcoal text-primary-foreground"
          : "border-border bg-background hover:border-foreground/40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Slider({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-gold"
      />
    </div>
  );
}

function MillimetreInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={50}
        max={6000}
        step={1}
        // Keyed by value so an outside change (a new product) replaces the text.
        key={value}
        defaultValue={value}
        onBlur={(event) => {
          const next = Math.round(Number(event.target.value));
          if (next >= 50 && next <= 6000) onChange(next);
          else event.target.value = String(value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        }}
        className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10"
      />
    </label>
  );
}
