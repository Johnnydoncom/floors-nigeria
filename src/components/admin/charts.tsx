"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { compactNaira } from "@/lib/admin/format";
import { number } from "@/lib/format";

/** How values are written; a name rather than a function so server pages can pass it. */
export type ValueKind = "money" | "count";

function formatter(kind: ValueKind): (value: number) => string {
  return kind === "money" ? compactNaira : (value) => number(value, 0);
}

/**
 * Single-series charts for the dashboard and reports. One hue
 * (`--chart-accent`, validated for contrast in light and dark), thin marks
 * with a 4px rounded data end, a recessive hairline grid, a hover tooltip,
 * and a table view so no value is only visible as a shape.
 */

type Point = { label: string; value: number; detail?: string };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

export function ColumnChart({
  points,
  kind,
  label,
  height = 200,
}: {
  points: Point[];
  kind: ValueKind;
  /** What the chart shows; also the accessible name and table caption. */
  label: string;
  height?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const format = formatter(kind);

  if (points.every((point) => point.value === 0)) {
    return (
      <p
        className="grid place-items-center rounded-md border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        Nothing recorded in this period yet.
      </p>
    );
  }

  const max = niceMax(Math.max(...points.map((point) => point.value), 0));
  const ticks = [max, max / 2, 0];
  const peak = points.reduce(
    (best, point, index) => (point.value > (points[best]?.value ?? -1) ? index : best),
    0,
  );
  const lastIndex = points.length - 1;

  return (
    <figure>
      <div className="flex gap-3">
        <div
          className="flex shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-muted-foreground"
          style={{ height }}
          aria-hidden
        >
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {format(tick)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }} role="img" aria-label={label}>
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: `${(tick / max) * 100}%` }}
              aria-hidden
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5">
            {points.map((point, index) => {
              const showLabel = point.value > 0 && (index === peak || index === lastIndex);
              return (
                <div
                  key={point.label}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  aria-label={`${point.label}: ${format(point.value)}`}
                >
                  {showLabel && (
                    <span
                      className="absolute z-10 -translate-y-1 whitespace-nowrap text-[10px] font-semibold tabular-nums text-foreground"
                      style={{ bottom: `${(point.value / max) * 100}%` }}
                      aria-hidden
                    >
                      {format(point.value)}
                    </span>
                  )}
                  <div
                    className={cn(
                      "w-full max-w-6 rounded-t transition-opacity",
                      hovered !== null && hovered !== index && "opacity-50",
                    )}
                    style={{
                      height: `${Math.max((point.value / max) * 100, point.value > 0 ? 1 : 0)}%`,
                      background: "var(--chart-accent)",
                    }}
                  />
                  {hovered === index && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <p className="font-semibold">{point.label}</p>
                      <p className="tabular-nums">{format(point.value)}</p>
                      {point.detail && <p className="text-muted-foreground">{point.detail}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-12 mt-2 flex gap-0.5 text-[10px] text-muted-foreground" aria-hidden>
        {points.map((point, index) => (
          <span
            key={point.label}
            className={cn("flex-1 truncate text-center", index % 2 === 1 && "max-sm:invisible")}
          >
            {point.label.split(" ")[0]}
          </span>
        ))}
      </div>
      <TableView
        caption={label}
        rows={points.map((point) => [point.label, format(point.value), point.detail ?? ""])}
        headers={["Period", "Value", ""]}
      />
    </figure>
  );
}

/**
 * Ranked horizontal bars — lead sources, pipeline stages, top products.
 * Labels and values are text in the text colour; only the bar is coloured.
 */
export function BarList({
  items,
  kind,
  label,
  empty = "Nothing to show yet.",
}: {
  items: { key: string; label: string; value: number; detail?: string; href?: string }[];
  kind: ValueKind;
  label: string;
  empty?: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  const format = formatter(kind);
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <figure>
      <ul className="space-y-2.5" aria-label={label}>
        {items.map((item) => (
          <li key={item.key} title={item.detail} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              {item.href ? (
                <a href={item.href} className="truncate hover:underline">
                  {item.label}
                </a>
              ) : (
                <span className="truncate">{item.label}</span>
              )}
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {format(item.value)}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full"
                style={{ width: `${(item.value / max) * 100}%`, background: "var(--chart-accent)" }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function TableView({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        View as table
      </summary>
      <table className="mt-2 w-full">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-muted-foreground">
            {headers.map((header, index) => (
              <th key={index} scope="col" className="py-1 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-border">
              {row.map((cell, index) => (
                <td key={index} className="py-1 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
