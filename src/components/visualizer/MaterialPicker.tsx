"use client";

import Image from "next/image";
import { naira } from "@/lib/format";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

/**
 * The catalogue, as materials to try on the floor.
 *
 * Every entry is a real product with a real price, so the moment a room looks
 * right the visitor already knows what it costs and what to ask for (§10).
 */
export function MaterialPicker({
  choices,
  selected,
  onSelect,
}: {
  choices: TextureChoice[];
  selected: TextureChoice | null;
  onSelect: (choice: TextureChoice) => void;
}) {
  if (choices.length === 0) {
    return (
      <p className="border border-dashed border-border p-6 text-sm text-muted-foreground">
        No materials are available to preview yet.
      </p>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choose a material"
      className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3"
    >
      {choices.map((choice) => {
        // Colour terms carry no variation id, so their name tells them apart.
        const key = `${choice.productSlug}-${choice.variantId ?? choice.variantName ?? "base"}`;
        const isSelected =
          selected?.productSlug === choice.productSlug &&
          selected?.variantId === choice.variantId &&
          selected?.variantName === choice.variantName;

        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(choice)}
            title={`${choice.productName}${choice.variantName ? ` — ${choice.variantName}` : ""}`}
            className={cn(
              "group text-left transition focus-visible:outline-none",
              isSelected
                ? "ring-2 ring-gold ring-offset-2 ring-offset-background"
                : "hover:opacity-90",
            )}
          >
            <span className="relative block aspect-square overflow-hidden bg-muted">
              <Image
                src={choice.swatchUrl ?? choice.textureUrl}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </span>
            <span className="mt-1.5 block truncate text-[11px] leading-tight">
              {choice.variantName ?? choice.productName}
            </span>
            {choice.price !== null && (
              <span className="block font-mono text-[11px] text-muted-foreground">
                {naira(choice.price)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
