"use client";

import Image from "next/image";
import type { Variant } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Accessible variant picker (§8, §29): each swatch carries its colour name and
 * selected state, and the group behaves like a radio group for keyboard users.
 */
export function VariantSwatches({
  variants,
  selectedId,
  onSelect,
}: {
  variants: Variant[];
  selectedId: number;
  onSelect: (variant: Variant) => void;
}) {
  if (variants.length <= 1) return null;

  return (
    <div role="radiogroup" aria-label="Choose a finish" className="flex flex-wrap gap-3">
      {variants.map((variant) => {
        const selected = variant.id === selectedId;
        const image = variant.swatch_image_url ?? variant.swatches?.[0]?.image_url ?? null;
        const hex = variant.color.hex ?? variant.swatches?.[0]?.color_hex ?? undefined;

        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${variant.name}${variant.availability.is_orderable ? "" : ` — ${variant.availability.label}`}`}
            onClick={() => onSelect(variant)}
            className={cn(
              "group flex flex-col items-center gap-1.5 focus-visible:outline-none",
              !variant.availability.is_orderable && "opacity-60",
            )}
          >
            <span
              className={cn(
                "relative block h-12 w-12 overflow-hidden border transition",
                selected
                  ? "border-gold ring-2 ring-gold ring-offset-2 ring-offset-background"
                  : "border-border group-hover:border-gold group-focus-visible:ring-2 group-focus-visible:ring-gold",
              )}
              style={image ? undefined : { backgroundColor: hex }}
            >
              {image && <Image src={image} alt="" fill sizes="48px" className="object-cover" />}
            </span>
            <span className="max-w-[5.5rem] truncate text-[11px] text-muted-foreground">
              {variant.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
