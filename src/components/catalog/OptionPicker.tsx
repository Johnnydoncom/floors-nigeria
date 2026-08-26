"use client";

import type { AttributeTerm, ProductOption } from "@/lib/api/types";
import { Swatch } from "./Swatch";
import { cn } from "@/lib/utils";

/**
 * The variation picker for a variable product (§8, §9).
 *
 * One group per option, each behaving as a radio group so keyboard and screen
 * reader users get the same experience as a pointer: every swatch announces
 * its term name, its selected state, and whether the combination it would
 * produce is actually available.
 */
export function OptionPicker({
  options,
  selection,
  onSelect,
  isTermAvailable,
}: {
  options: ProductOption[];
  /** Chosen term id per attribute id. */
  selection: Record<number, number>;
  onSelect: (attributeId: number, termId: number) => void;
  /** Whether picking this term still resolves to a real variation. */
  isTermAvailable: (attributeId: number, termId: number) => boolean;
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-6">
      {options.map((option) => {
        const selectedTerm = option.terms.find(
          (term) => term.id === selection[option.attribute_id],
        );

        return (
          <fieldset key={option.attribute_id}>
            <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {option.name}
              {selectedTerm && (
                <span className="ml-2 normal-case tracking-normal text-foreground">
                  {selectedTerm.label}
                </span>
              )}
            </legend>

            <div role="radiogroup" aria-label={option.name} className="mt-3 flex flex-wrap gap-3">
              {option.terms.map((term) => (
                <TermButton
                  key={term.id}
                  term={term}
                  optionName={option.name}
                  isSelected={selection[option.attribute_id] === term.id}
                  isAvailable={isTermAvailable(option.attribute_id, term.id)}
                  onSelect={() => onSelect(option.attribute_id, term.id)}
                />
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function TermButton({
  term,
  optionName,
  isSelected,
  isAvailable,
  onSelect,
}: {
  term: AttributeTerm;
  optionName: string;
  isSelected: boolean;
  isAvailable: boolean;
  onSelect: () => void;
}) {
  const isVisual = term.swatch_type === "color" || term.swatch_type === "image";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`${optionName}: ${term.label}${isAvailable ? "" : " — unavailable in this combination"}`}
      onClick={onSelect}
      className={cn(
        "group flex flex-col items-center gap-1.5 rounded-none focus-visible:outline-none",
        !isAvailable && "opacity-40",
      )}
    >
      <span
        className={cn(
          "relative block transition",
          isSelected
            ? "ring-2 ring-gold ring-offset-2 ring-offset-background"
            : "group-hover:ring-1 group-hover:ring-gold group-focus-visible:ring-2 group-focus-visible:ring-gold",
        )}
      >
        <Swatch term={term} size={isVisual ? "md" : "sm"} />
        {!isAvailable && (
          <span
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),var(--color-border)_50%,transparent_calc(50%+1px))]"
          />
        )}
      </span>

      {isVisual && (
        <span className="max-w-[5.5rem] truncate text-[11px] text-muted-foreground">
          {term.label}
        </span>
      )}
    </button>
  );
}
