"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Compass, FileText, Heart, Package, RotateCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { naira } from "@/lib/format";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

/**
 * The floor on show, over the room: what it is, what it costs, and the two
 * things people do next — turn it, or get a sample in their hands.
 */
export function ProductPill({
  material,
  isFavorite,
  onToggleFavorite,
  rotation,
  onRotation,
  onOrderSample,
  onRequestQuote,
}: {
  material: TextureChoice;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  rotation: number;
  onRotation: (degrees: number) => void;
  onOrderSample: () => void;
  onRequestQuote: () => void;
}) {
  // Samples are a per-product choice in the admin; without one, the next step
  // is a quote.
  const offersSample = material.samplesEnabled === true;
  const name = material.variantName ?? material.productName;
  const thumb = material.swatchUrl ?? material.textureUrl;

  return (
    <div
      className="pointer-events-auto flex max-w-[min(36rem,calc(100%-1rem))] items-center gap-2 rounded-full border border-white/60 bg-background/90 py-1.5 pl-1.5 pr-1.5 shadow-luxe backdrop-blur-md sm:gap-3"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
        <Image src={thumb} alt="" fill sizes="36px" className="object-cover" />
      </span>

      <span className="min-w-0 flex-1 leading-tight">
        <span className="hidden truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
          {material.categoryName ?? material.brandName ?? "Floor"}
        </span>
        <span className="block truncate text-sm font-semibold">
          {name}
          {material.variantName && (
            <span className="font-normal text-muted-foreground max-sm:hidden">
              {" "}
              · {material.productName}
            </span>
          )}
        </span>
      </span>

      {material.price !== null && (
        <span className="hidden shrink-0 text-right leading-tight md:block">
          <span className="block font-mono text-sm font-semibold">{naira(material.price)}</span>
          <span className="block text-[10px] text-muted-foreground">
            per {material.priceUnit ?? "m²"}
          </span>
        </span>
      )}

      <span className="contents max-sm:hidden">
        <DirectionControl rotation={rotation} onRotation={onRotation} />
      </span>

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold max-sm:hidden"
      >
        <Heart className={cn("h-4 w-4", isFavorite && "fill-gold text-gold")} aria-hidden />
      </button>

      <button
        type="button"
        onClick={offersSample ? onOrderSample : onRequestQuote}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-charcoal px-3 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-charcoal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:px-4"
      >
        {offersSample ? (
          <Package className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <FileText className="h-3.5 w-3.5" aria-hidden />
        )}
        <span className="max-sm:sr-only">{offersSample ? "Order sample" : "Get a quote"}</span>
      </button>
    </div>
  );
}

const PRESETS = [0, 45, 90, 135];

/**
 * Which way the boards run. A dial, because direction is an angle and people
 * think of it as one; presets for the four that installers actually lay.
 */
function DirectionControl({
  rotation,
  onRotation,
}: {
  rotation: number;
  onRotation: (degrees: number) => void;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const angleAt = (clientX: number, clientY: number) => {
    const box = dialRef.current?.getBoundingClientRect();
    if (!box) return rotation;
    const dx = clientX - (box.left + box.width / 2);
    const dy = clientY - (box.top + box.height / 2);
    // 0° points up; a floor's direction repeats every 180°.
    const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const snapped = Math.round(degrees / 5) * 5;
    return normalise(snapped);
  };

  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, [dragging]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Direction: ${rotation}°. Change direction`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-64 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Compass className="h-4 w-4" aria-hidden />
          Direction <span className="ml-auto font-mono text-muted-foreground">{rotation}°</span>
        </p>
        <div
          ref={dialRef}
          role="slider"
          tabIndex={0}
          aria-label="Direction of the floor"
          aria-valuemin={-90}
          aria-valuemax={90}
          aria-valuenow={rotation}
          aria-valuetext={`${rotation} degrees`}
          onPointerDown={(event) => {
            (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
            setDragging(true);
            onRotation(angleAt(event.clientX, event.clientY));
          }}
          onPointerMove={(event) => {
            if (dragging) onRotation(angleAt(event.clientX, event.clientY));
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 15 : 5;
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              onRotation(normalise(rotation + step));
            } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              onRotation(normalise(rotation - step));
            }
          }}
          className="relative mx-auto mt-3 h-32 w-32 cursor-grab touch-none rounded-full border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:cursor-grabbing"
        >
          {/* Board lines, turned with the floor, so the dial shows the floor itself. */}
          <span
            aria-hidden
            className="absolute inset-3 overflow-hidden rounded-full transition-transform duration-75"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {Array.from({ length: 7 }, (_, index) => (
              <span
                key={index}
                className="absolute inset-y-0 w-px bg-foreground/20"
                style={{ left: `${(index + 1) * 12.5}%` }}
              />
            ))}
            <span className="absolute left-1/2 top-0 h-1/2 w-0.5 -translate-x-1/2 bg-gold" />
          </span>
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow"
          />
        </div>
        <div
          className="mt-3 grid grid-cols-4 gap-1"
          role="radiogroup"
          aria-label="Common directions"
        >
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={rotation === normalise(preset)}
              onClick={() => onRotation(normalise(preset))}
              className={cn(
                "h-8 rounded-md border text-xs font-semibold transition",
                rotation === normalise(preset)
                  ? "border-charcoal bg-charcoal text-primary-foreground"
                  : "border-border hover:border-foreground/40",
              )}
            >
              {preset}°
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Into −90…90: a floor turned 180° is the same floor. */
function normalise(degrees: number): number {
  let value = ((degrees % 180) + 180) % 180;
  if (value > 90) value -= 180;
  return value === -90 ? 90 : value;
}
