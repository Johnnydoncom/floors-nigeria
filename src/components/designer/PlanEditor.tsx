"use client";

import { useState } from "react";
import { floorOutline, normalisePlan, ROOM_LIMITS, type RoomPlan } from "@/lib/room/plan";
import { number } from "@/lib/format";

/** Padding around the plan, as a share of the room's longer side, for the labels. */
const MARGIN_SHARE = 0.2;

/**
 * The measurements of the room (§11).
 *
 * A flooring customer thinks in "the living room is about four and a half by
 * six", so the room is dimension-led: type the numbers, see the shape — in the
 * plan and in 3D alike, which is why these sit above both views.
 */
export function RoomDimensions({
  plan,
  onChange,
}: {
  plan: RoomPlan;
  onChange: (plan: RoomPlan) => void;
}) {
  const update = (changes: Partial<RoomPlan>) => onChange(normalisePlan({ ...plan, ...changes }));

  return (
    <fieldset className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
      <legend className="sr-only">Room dimensions</legend>

      <ShapeChoice plan={plan} onChange={(shape) => update({ shape })} />

      <Field
        id="room-width"
        label="Width"
        value={plan.width}
        min={ROOM_LIMITS.width.min}
        max={ROOM_LIMITS.width.max}
        onChange={(width) => update({ width })}
      />
      <Field
        id="room-length"
        label="Length"
        value={plan.length}
        min={ROOM_LIMITS.length.min}
        max={ROOM_LIMITS.length.max}
        onChange={(length) => update({ length })}
      />
      <Field
        id="room-height"
        label="Ceiling height"
        value={plan.wallHeight}
        min={ROOM_LIMITS.wallHeight.min}
        max={ROOM_LIMITS.wallHeight.max}
        onChange={(wallHeight) => update({ wallHeight })}
      />

      {plan.shape === "l_shape" && (
        <>
          <Field
            id="notch-width"
            label="Cut-out width"
            value={plan.notchWidth}
            min={0.3}
            max={Math.max(0.3, plan.width - 0.5)}
            onChange={(notchWidth) => update({ notchWidth })}
          />
          <Field
            id="notch-length"
            label="Cut-out depth"
            value={plan.notchLength}
            min={0.3}
            max={Math.max(0.3, plan.length - 0.5)}
            onChange={(notchLength) => update({ notchLength })}
          />
        </>
      )}
    </fieldset>
  );
}

/**
 * The room in plan, drawn to scale.
 *
 * SVG that scales to its container, which keeps it sharp on a phone and costs
 * nothing to render. Capped in height so a long narrow room does not push
 * everything else off the screen.
 */
export function PlanEditor({ plan, areaSqm }: { plan: RoomPlan; areaSqm: number }) {
  const outline = floorOutline(plan);
  const points = outline.map((point) => `${point.x},${point.y}`).join(" ");

  // Type and strokes are sized against the drawing, so they read the same on
  // a box room and a hall.
  const span = Math.max(plan.width, plan.length);
  const margin = span * MARGIN_SHARE;
  const stroke = span * 0.006;
  const fontSize = span * 0.04;
  const grid = span > 12 ? 1 : 0.5;

  const viewBox = `${-margin} ${-margin} ${plan.width + margin * 2} ${plan.length + margin * 2}`;

  return (
    <div className="border border-border bg-surface p-3">
      <svg
        viewBox={viewBox}
        className="mx-auto block h-auto w-full max-lg:max-h-[calc(46dvh-1.5rem)] lg:max-h-[max(100dvh-var(--header-height)-11rem,22rem)]"
        role="img"
        aria-label={`Room plan, ${number(plan.width)} by ${number(plan.length)} metres`}
      >
        <defs>
          <pattern id="plan-grid" width={grid} height={grid} patternUnits="userSpaceOnUse">
            <path
              d={`M ${grid} 0 L 0 0 0 ${grid}`}
              fill="none"
              stroke="#00000012"
              strokeWidth={stroke / 3}
            />
          </pattern>
        </defs>

        <rect
          x={-margin}
          y={-margin}
          width={plan.width + margin * 2}
          height={plan.length + margin * 2}
          fill="url(#plan-grid)"
        />

        <polygon
          points={points}
          className="fill-gold/15 stroke-charcoal-dark"
          strokeWidth={stroke}
          strokeLinejoin="round"
        />

        {/* Width, along the near edge. */}
        <Dimension
          from={{ x: 0, y: plan.length + margin * 0.45 }}
          to={{ x: plan.width, y: plan.length + margin * 0.45 }}
          label={`${number(plan.width)} m`}
          stroke={stroke}
          fontSize={fontSize}
        />

        {/* Length, down the left edge. */}
        <Dimension
          from={{ x: -margin * 0.45, y: 0 }}
          to={{ x: -margin * 0.45, y: plan.length }}
          label={`${number(plan.length)} m`}
          stroke={stroke}
          fontSize={fontSize}
          vertical
        />

        <text
          x={(plan.shape === "l_shape" ? plan.width - plan.notchWidth : plan.width) / 2}
          y={plan.length / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize * 1.2}
          className="fill-charcoal-dark font-semibold"
        >
          {number(areaSqm)} m²
        </text>
      </svg>
    </div>
  );
}

function ShapeChoice({
  plan,
  onChange,
}: {
  plan: RoomPlan;
  onChange: (shape: RoomPlan["shape"]) => void;
}) {
  return (
    <div className="col-span-2 sm:col-span-3">
      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Room shape
      </span>
      <div role="radiogroup" aria-label="Room shape" className="mt-2 flex gap-2">
        {(
          [
            ["rectangle", "Rectangular"],
            ["l_shape", "L-shaped"],
          ] as const
        ).map(([shape, label]) => (
          <button
            key={shape}
            type="button"
            role="radio"
            aria-checked={plan.shape === shape}
            onClick={() => onChange(shape)}
            className={
              plan.shape === shape
                ? "h-10 flex-1 border border-charcoal-dark bg-charcoal-dark text-sm font-semibold text-primary-foreground"
                : "h-10 flex-1 border border-border text-sm transition hover:border-gold hover:text-gold"
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * A measurement in metres.
 *
 * Edited as text and only committed once it is a number in range, so typing
 * "12" passes through "1" without being clamped to the minimum on the way, and
 * clearing the box to retype does not snap it back. Leaving the box settles
 * whatever was typed into range.
 */
function Field({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const parsed = draft === null ? value : parseMetres(draft);
  const isInRange = parsed !== null && parsed >= min && parsed <= max;

  return (
    <div>
      <label htmlFor={id} className="text-sm">
        {label} <span className="text-muted-foreground">(m)</span>
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft ?? String(value)}
        aria-invalid={!isInRange}
        aria-describedby={`${id}-range`}
        onFocus={(event) => {
          setDraft(String(value));
          event.target.select();
        }}
        onChange={(event) => {
          const text = event.target.value;
          const metres = parseMetres(text);
          setDraft(text);
          if (metres !== null && metres >= min && metres <= max) onChange(metres);
        }}
        onBlur={() => {
          const metres = draft === null ? null : parseMetres(draft);
          if (metres !== null) onChange(metres);
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="mt-1 h-11 w-full border border-border bg-transparent px-3 outline-none transition focus:border-gold aria-[invalid=true]:border-destructive"
      />
      <p
        id={`${id}-range`}
        className={isInRange ? "sr-only" : "mt-1 text-[11px] leading-tight text-destructive"}
      >
        Between {number(min)} and {number(max)} m
      </p>
    </div>
  );
}

/** A typed length, accepting a decimal comma; null when it is not a number yet. */
function parseMetres(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;

  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function Dimension({
  from,
  to,
  label,
  stroke,
  fontSize,
  vertical = false,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
  stroke: number;
  fontSize: number;
  vertical?: boolean;
}) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  return (
    <g className="stroke-muted-foreground">
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeWidth={stroke / 1.6} />
      <text
        x={midX}
        y={midY}
        textAnchor="middle"
        dominantBaseline={vertical ? "auto" : "hanging"}
        transform={vertical ? `rotate(-90 ${midX} ${midY})` : undefined}
        fontSize={fontSize}
        className="fill-muted-foreground stroke-none"
        dy={vertical ? -fontSize * 0.35 : fontSize * 0.35}
      >
        {label}
      </text>
    </g>
  );
}
