"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A QR code for a link, drawn as SVG.
 *
 * The encoder is loaded only when a code is first shown — most visitors never
 * open one — and the modules are drawn as a single path rather than injected
 * markup, so nothing from the URL ever reaches the DOM as HTML.
 */
export function QrCode({
  value,
  size = 168,
  label,
  className,
}: {
  value: string;
  size?: number;
  /** Describes where the code leads, for screen readers. */
  label: string;
  className?: string;
}) {
  const [grid, setGrid] = useState<{ value: string; count: number; path: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("qrcode-generator").then(({ default: qrcode }) => {
      if (cancelled) return;

      // Error correction M: survives a smudged screen or a dim room, and a
      // share link still fits a small symbol.
      const code = qrcode(0, "M");
      code.addData(value);
      code.make();

      const count = code.getModuleCount();
      let path = "";

      for (let row = 0; row < count; row++) {
        for (let column = 0; column < count; column++) {
          if (code.isDark(row, column)) path += `M${column} ${row}h1v1h-1z`;
        }
      }

      setGrid({ value, count, path });
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  const quiet = 2;
  const current = grid?.value === value ? grid : null;

  return (
    <div
      className={cn("inline-block rounded-md bg-white p-2", className)}
      style={{ width: size, height: size }}
    >
      {current ? (
        <svg
          role="img"
          aria-label={label}
          viewBox={`${-quiet} ${-quiet} ${current.count + quiet * 2} ${current.count + quiet * 2}`}
          shapeRendering="crispEdges"
          className="h-full w-full"
        >
          <path d={current.path} fill="#121211" />
        </svg>
      ) : (
        <div className="h-full w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
      )}
    </div>
  );
}
