"use client";

import { useCallback, useMemo, useState } from "react";
import type { Product, Variant } from "@/lib/api/types";

type Selection = Record<number, number>;

/**
 * Resolves the customer's option choices to a variation.
 *
 * Availability is computed the way a shopper expects: a term stays selectable
 * when some variation exists that combines it with the *other* choices already
 * made, so picking "Slate" then "5mm" never dead-ends on a combination the
 * catalogue does not stock.
 */
export function useVariantSelection(product: Product) {
  const variants = product.variants;

  const initial = useMemo<Selection>(() => {
    const defaultVariant = variants.find((variant) => variant.is_default) ?? variants[0];
    return toSelection(defaultVariant);
  }, [variants]);

  const [selection, setSelection] = useState<Selection>(initial);

  const selectedVariant = useMemo(
    () => variants.find((variant) => matches(variant, selection)) ?? undefined,
    [variants, selection],
  );

  const select = useCallback(
    (attributeId: number, termId: number) => {
      setSelection((current) => {
        const next = { ...current, [attributeId]: termId };

        // If the new pair has no variation, keep the term the customer just
        // clicked and fall back to the closest variation that includes it.
        if (variants.some((variant) => matches(variant, next))) return next;

        const fallback = variants.find((variant) =>
          variant.options.some(
            (option) => option.attribute_id === attributeId && option.term_id === termId,
          ),
        );

        return fallback ? toSelection(fallback) : next;
      });
    },
    [variants],
  );

  const isTermAvailable = useCallback(
    (attributeId: number, termId: number) => {
      const others = Object.entries(selection).filter(([key]) => Number(key) !== attributeId);

      return variants.some((variant) => {
        const map = toSelection(variant);
        return (
          map[attributeId] === termId && others.every(([key, value]) => map[Number(key)] === value)
        );
      });
    },
    [variants, selection],
  );

  return { selection, selectedVariant, select, isTermAvailable };
}

function toSelection(variant: Variant | undefined): Selection {
  if (!variant) return {};

  return Object.fromEntries(variant.options.map((option) => [option.attribute_id, option.term_id]));
}

function matches(variant: Variant, selection: Selection): boolean {
  const entries = Object.entries(selection);

  // A simple product has one variation and no options to match against.
  if (entries.length === 0) return variant.options.length === 0;

  return entries.every(([attributeId, termId]) =>
    variant.options.some(
      (option) => option.attribute_id === Number(attributeId) && option.term_id === termId,
    ),
  );
}
