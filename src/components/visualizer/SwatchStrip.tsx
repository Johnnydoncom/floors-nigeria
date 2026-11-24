"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getTexture } from "@/lib/visualizer/images";
import { materialKey } from "@/lib/visualizer/library";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

/** A product's colourways, fetched once a visit per product. */
const cache = new Map<string, Promise<TextureChoice[]>>();

function colourways(slug: string): Promise<TextureChoice[]> {
  const existing = cache.get(slug);
  if (existing) return existing;

  const loading = fetch(`/api/catalog/materials?product=${encodeURIComponent(slug)}`)
    .then((response) => (response.ok ? response.json() : { data: [] }))
    .then((payload: { data?: TextureChoice[] }) => payload.data ?? [])
    .catch(() => {
      cache.delete(slug);
      return [] as TextureChoice[];
    });

  cache.set(slug, loading);
  return loading;
}

/** Every colourway of the product on show, as the studio has it or as the API lists it. */
export function useColourways(material: TextureChoice | null): TextureChoice[] {
  const slug = material?.productSlug ?? null;
  const [loaded, setLoaded] = useState<{ slug: string; items: TextureChoice[] } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void colourways(slug).then((items) => {
      if (!cancelled) setLoaded({ slug, items });
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return loaded && loaded.slug === slug ? loaded.items : [];
}

/**
 * The other colours of this floor, under the room: one tap swaps the colour
 * and keeps everything else — pattern, direction, room, paint — so colours are
 * compared like for like. Textures are warmed on hover so the swap is instant.
 */
export function SwatchStrip({
  items,
  selected,
  onSelect,
  className,
}: {
  items: TextureChoice[];
  selected: TextureChoice | null;
  onSelect: (choice: TextureChoice) => void;
  className?: string;
}) {
  if (items.length < 2) return null;

  const current = selected ? materialKey(selected) : null;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <p className="shrink-0 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {items.length} colours
      </p>
      <div
        role="radiogroup"
        aria-label="Colours of this floor"
        className="flex min-w-0 gap-2 overflow-x-auto py-1 [scrollbar-width:thin]"
      >
        {items.map((choice) => {
          const active = current === materialKey(choice);
          const label = choice.variantName ?? choice.productName;
          return (
            <button
              key={materialKey(choice)}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
              onClick={() => onSelect(choice)}
              onPointerEnter={() => void getTexture(choice.textureUrl).catch(() => undefined)}
              onFocus={() => void getTexture(choice.textureUrl).catch(() => undefined)}
              className={cn(
                "relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:h-12 sm:w-12",
                active
                  ? "ring-2 ring-charcoal ring-offset-2 ring-offset-background"
                  : "opacity-90 hover:-translate-y-0.5 hover:opacity-100",
              )}
            >
              <Image
                src={choice.swatchUrl ?? choice.textureUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
