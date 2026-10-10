"use client";

import Image from "next/image";
import Link from "next/link";
import type { SearchResults } from "@/lib/api/types";
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
}: {
  term: string;
  results: SearchResults["data"];
  isSearching: boolean;
  onSelect: () => void;
  onTermChange: (term: string) => void;
}) {
  const trimmed = term.trim();

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
    return <p className="p-6 text-sm text-muted-foreground">Searching…</p>;
  }

  if (results.products.length === 0 && results.categories.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Nothing matches “{trimmed}”. Try a material, colour or SKU.
      </p>
    );
  }

  return (
    <div className="py-2">
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
