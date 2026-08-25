"use client";

import { useEffect, useState } from "react";
import type { SearchResults } from "@/lib/api/types";

const DEBOUNCE_MS = 250;
const MINIMUM_TERM_LENGTH = 2;

const EMPTY: SearchResults["data"] = { query: "", products: [], categories: [], collections: [] };

/**
 * Debounced catalogue autocomplete against the same-origin search proxy (§23).
 *
 * Results are stored with the term they belong to, so a slow response for an
 * old term can never overwrite the current one, and `isSearching` is derived
 * rather than tracked in a second piece of state.
 */
export function useProductSearch(term: string) {
  const trimmed = term.trim();
  const isEnabled = trimmed.length >= MINIMUM_TERM_LENGTH;
  const [resolved, setResolved] = useState<{ term: string; data: SearchResults["data"] }>({
    term: "",
    data: EMPTY,
  });

  useEffect(() => {
    if (!isEnabled) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as SearchResults;
        setResolved({ term: trimmed, data: payload.data ?? EMPTY });
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResolved({ term: trimmed, data: EMPTY });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, isEnabled]);

  const isCurrent = isEnabled && resolved.term === trimmed;

  return {
    results: isCurrent ? resolved.data : EMPTY,
    isSearching: isEnabled && !isCurrent,
  };
}
