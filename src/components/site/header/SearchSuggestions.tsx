"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import type { SearchResults } from "@/lib/api/types";
import { looksLikeSentence } from "@/hooks/use-smart-search";
import { naira } from "@/lib/format";

const POPULAR_TERMS = ["SPC", "Vinyl", "Artificial grass", "Epoxy", "Door mat", "Carpet"];

/**
 * The suggestion list behind both the desktop search field and the mobile
 * search sheet, so results look and behave identically in each (§23).
 */
export function SearchSuggestions({
  term,
  results,
  isSearching,
  onSelect,
  onTermChange,
  onSmartSearch,
  smartPending = false,
}: {
  term: string;
  results: SearchResults["data"];
  isSearching: boolean;
  onSelect: () => void;
  onTermChange: (term: string) => void;
  /** Read the query as a request and open matching, filtered results. */
  onSmartSearch?: () => void;
  smartPending?: boolean;
}) {
  const trimmed = term.trim();
  const smartRow =
    onSmartSearch && looksLikeSentence(trimmed) ? (
      <button
        type="button"
        onClick={onSmartSearch}
        disabled={smartPending}
        className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-muted disabled:opacity-60"
      >
        {smartPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold" aria-hidden />
        ) : (
          <Sparkles className="h-4 w-4 shrink-0 text-gold" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">Find floors for “{trimmed}”</span>
          <span className="block text-xs text-muted-foreground">
            Smart search reads your request and applies the right filters
          </span>
        </span>
      </button>
    ) : null;

  if (trimmed.length < 2) {
    return (
      <div className="p-4">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Popular searches
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {POPULAR_TERMS.map((popular) => (
            <button
              key={popular}
              type="button"
              onClick={() => onTermChange(popular)}
              className="border border-border px-3 py-1.5 text-xs transition hover:border-gold hover:text-gold"
            >
              {popular}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isSearching) {
    return (
      <>
        {smartRow}
        <p className="p-6 text-sm text-muted-foreground">Searching…</p>
      </>
    );
  }

  if (results.products.length === 0 && results.categories.length === 0) {
    return (
      <>
        {smartRow}
        {!smartRow && (
          <p className="p-6 text-sm text-muted-foreground">
            Nothing matches “{trimmed}”. Try a material, colour or SKU, or describe what you need.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="py-2">
      {smartRow}
      {results.products.map((product) => (
        <Link
          key={product.id}
          href={`/product/${product.slug}`}
          onClick={onSelect}
          className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-muted"
        >
          {product.thumb_url ? (
            <Image
              src={product.thumb_url}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-cover"
            />
          ) : (
            <span className="h-11 w-11 shrink-0 bg-muted" aria-hidden />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{product.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {product.category?.name}
              {product.swatch_preview.total > 0 && ` · ${product.swatch_preview.total} colours`}
            </span>
          </span>
          <span className="shrink-0 font-mono text-xs">{naira(product.price_from)}</span>
        </Link>
      ))}

      {results.categories.length > 0 && (
        <div className="mt-1 border-t border-border p-4">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Categories
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {results.categories.map((category) => (
              <Link
                key={category.slug}
                href={`/products/${category.slug}`}
                onClick={onSelect}
                className="border border-border px-3 py-1.5 text-xs transition hover:border-gold hover:text-gold"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/products?q=${encodeURIComponent(trimmed)}`}
        onClick={onSelect}
        className="block border-t border-border px-4 py-3 text-center text-sm font-semibold text-gold transition hover:bg-muted"
      >
        See all results for “{trimmed}”
      </Link>
    </div>
  );
}
