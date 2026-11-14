"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export type SmartSearchResult = {
  query: string;
  href: string;
  summary: string;
  notice: string | null;
  total: number;
};

export const SMART_SEARCH_STORAGE_KEY = "floorsng.smart-search";

const SENTENCE_HINT =
  /\b(under|below|less than|between|above|over|for|with|cheap|cheapest|affordable|waterproof|my|that|which|look|looking|need|want)\b|\d\s*k\b|₦|naira/i;

/**
 * Does the query read like a request ("grey SPC for my kitchen under 15k")
 * rather than a product name or SKU? Only those go through smart search;
 * "SPC" or "FN0019" keep the instant keyword search.
 */
export function looksLikeSentence(term: string): boolean {
  const trimmed = term.trim();
  if (trimmed.length < 6) return false;
  return trimmed.split(/\s+/).length >= 4 || SENTENCE_HINT.test(trimmed);
}

/**
 * Plain-language search: the server reads the request, turns it into
 * catalogue filters that are known to return products, and the shopper lands
 * on that page. Falls back to an ordinary keyword search on any failure.
 */
export function useSmartSearch() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (term: string) => {
      const query = term.trim();
      if (!query) return;

      setPending(true);
      try {
        const response = await fetch("/api/ai-support/search/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ q: query }),
          // A slow network should never strand the shopper: fall back to a
          // plain keyword search instead.
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) throw new Error(`Search failed (${response.status})`);
        const { data } = (await response.json()) as { data: SmartSearchResult };

        try {
          sessionStorage.setItem(SMART_SEARCH_STORAGE_KEY, JSON.stringify(data));
        } catch {
          // Storage blocked: the results page simply shows no explanation.
        }
        router.push(data.href);
      } catch {
        router.push(`/products?q=${encodeURIComponent(query)}`);
      } finally {
        setPending(false);
      }
    },
    [router],
  );

  return { run, pending };
}
