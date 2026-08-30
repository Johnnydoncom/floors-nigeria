"use client";

import { floorOutline, normalisePlan, ROOM_LIMITS, type RoomPlan } from "@/lib/room/plan";
import { number } from "@/lib/format";

/** Padding around the plan, in metres, so dimension labels have room. */
const MARGIN = 1.1;

/**
 * The room in plan, drawn to scale (§11).
 *
 * A flooring customer thinks in "the living room is about four and a half by
 * six", so the plan is dimension-led: type the numbers, see the shape. The
 * drawing is SVG and scales to its container, which keeps it sharp on a phone
 * and costs nothing to render.
 */
export function PlanEditor({
  plan,
  onChange,
  areaSqm,
}: {
  plan: RoomPlan;
  onChange: (plan: RoomPlan) => void;
  areaSqm: number;
}) {
  const outline = floorOutline(plan);
  const viewBox = `${-MARGIN} ${-MARGIN} ${plan.width + MARGIN * 2} ${plan.length + MARGIN * 2}`;
  const points = outline.map((point) => `${point.x},${point.y}`).join(" ");

  // Keep strokes and type a constant size on screen however big the room is.
  const scale = Math.max(plan.width, plan.length) / 10;
  const stroke = 0.04 * Math.max(1, scale * 2);
  const fontSize = 0.34 * Math.max(1, scale * 1.6);

  const update = (changes: Partial<RoomPlan>) => onChange(normalisePlan({ ...plan, ...changes }));

  return (
    <div className="space-y-4">
      <div className="border border-border bg-surface p-3">
        <svg
          viewBox={viewBox}
          className="h-auto w-full"
          role="img"
          aria-label={`Room plan, ${number(plan.width)} by ${number(plan.length)} metres`}
        >
          <defs>
            <pattern id="plan-grid" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
              <path
                d="M 0.5 0 L 0 0 0 0.5"
                fill="none"
                stroke="#00000010"
                strokeWidth={stroke / 3}
              />
            </pattern>
          </defs>

          <rect
            x={-MARGIN}
            y={-MARGIN}
            width={plan.width + MARGIN * 2}
            height={plan.length + MARGIN * 2}
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
            from={{ x: 0, y: plan.length + MARGIN * 0.55 }}
            to={{ x: plan.width, y: plan.length + MARGIN * 0.55 }}
            label={`${number(plan.width)} m`}
            stroke={stroke}
            fontSize={fontSize}
          />

          {/* Length, down the left edge. */}
          <Dimension
            from={{ x: -MARGIN * 0.55, y: 0 }}
            to={{ x: -MARGIN * 0.55, y: plan.length }}
            label={`${number(plan.length)} m`}
            stroke={stroke}
            fontSize={fontSize}
            vertical
          />

          <text
            x={plan.width / 2}
            y={plan.length / 2}
            textAnchor="middle"
            fontSize={fontSize * 1.15}
            className="fill-charcoal-dark font-semibold"
          >
            {number(areaSqm)} m²
          </text>
        </svg>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
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
    <div className="sm:col-span-2">
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
  return (
    <div>
      <label htmlFor={id} className="text-sm">
        {label} <span className="text-muted-foreground">(m)</span>
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={0.1}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-11 w-full border border-border bg-transparent px-3 outline-none transition focus:border-gold"
      />
    </div>
  );
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
        dominantBaseline={vertical ? "middle" : "hanging"}
        transform={vertical ? `rotate(-90 ${midX} ${midY})` : undefined}
        fontSize={fontSize}
        className="fill-muted-foreground stroke-none"
        dy={vertical ? -fontSize * 0.4 : fontSize * 0.3}
      >
        {label}
      </text>
    </g>
  );
}
