"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { useProductSearch } from "@/hooks/use-product-search";
import { naira } from "@/lib/format";

const POPULAR_TERMS = ["Oak", "Herringbone", "SPC", "Marble", "Wall panels", "Decking"];

/**
 * Catalogue search overlay: live product, category and collection suggestions
 * from the API, with SKU lookup (§23).
 */
/**
 * Mounted only while open, so the query resets on close without an effect.
 */
export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [term, setTerm] = useState("");
  const { results, isSearching } = useProductSearch(term);
  const router = useRouter();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!term.trim()) return;
    router.push(`/products?q=${encodeURIComponent(term.trim())}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal
      aria-label="Search the catalogue"
    >
      <button
        className="absolute inset-0 bg-charcoal-dark/50"
        aria-label="Close search"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 top-0 bg-background shadow-elevated">
        <div className="container-fluid">
          <form onSubmit={submit} className="flex items-center gap-3 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search oak, SPC, marble, wall panels or a SKU…"
              aria-label="Search the catalogue"
              className="h-16 flex-1 bg-transparent text-lg outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden />
              <span className="sr-only">Close search</span>
            </button>
          </form>

          <div className="max-h-[60vh] overflow-y-auto py-2">
            {isSearching && <p className="px-1 py-8 text-sm text-muted-foreground">Searching…</p>}

            {!isSearching && term.trim().length >= 2 && results.products.length === 0 && (
              <p className="px-1 py-8 text-sm text-muted-foreground">
                Nothing matches “{term}”. Try a material, colour or SKU.
              </p>
            )}

            {results.products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="flex items-center gap-4 px-1 py-3 transition hover:bg-muted"
              >
                {product.thumb_url ? (
                  <Image
                    src={product.thumb_url}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 object-cover"
                  />
                ) : (
                  <span className="h-12 w-12 bg-muted" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{product.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {product.category?.name}
                    {product.swatch_preview.total > 0 &&
                      ` · ${product.swatch_preview.total} finishes`}
                  </span>
                </span>
                <span className="font-mono text-xs">{naira(product.price_from)}</span>
              </Link>
            ))}

            {results.categories.length > 0 && (
              <div className="border-t border-border px-1 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Categories
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {results.categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/products?categories=${category.slug}`}
                      onClick={onClose}
                      className="border border-border px-3 py-1.5 text-xs transition hover:border-gold hover:text-gold"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {term.trim().length < 2 && (
              <div className="px-1 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Popular searches
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {POPULAR_TERMS.map((popular) => (
                    <button
                      key={popular}
                      type="button"
                      onClick={() => setTerm(popular)}
                      className="border border-border px-3 py-1.5 text-xs transition hover:border-gold hover:text-gold"
                    >
                      {popular}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
