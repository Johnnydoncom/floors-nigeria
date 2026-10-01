"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useProductSearch } from "@/hooks/use-product-search";
import { cn } from "@/lib/utils";
import { SearchSuggestions } from "./SearchSuggestions";

/**
 * Always-visible catalogue search.
 *
 * With a catalogue this size, search is the fastest route to a product, so it
 * sits in the header rather than behind an icon — and suggestions appear as
 * the visitor types (§7, §23).
 */
export function HeaderSearch({ className }: { className?: string }) {
  const [term, setTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { results, isSearching } = useProductSearch(term);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Clicking outside dismisses the suggestions without clearing the query.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsFocused(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!term.trim()) return;

    router.push(`/products?q=${encodeURIComponent(term.trim())}`);
    setIsFocused(false);
  };

  const isOpen = isFocused;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={submit} role="search">
        <label htmlFor="header-search" className="sr-only">
          Search the flooring catalogue
        </label>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          id="header-search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(event) => event.key === "Escape" && setIsFocused(false)}
          placeholder="Search SPC, vinyl, grass, epoxy or a SKU…"
          autoComplete="off"
          className="h-11 w-full rounded-full border border-transparent bg-surface pl-11 pr-10 text-sm outline-none transition placeholder:text-muted-foreground/80 hover:border-border focus:border-gold focus:bg-background focus:ring-4 focus:ring-gold/10"
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </form>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-background shadow-elevated">
          <SearchSuggestions
            term={term}
            results={results}
            isSearching={isSearching}
            onSelect={() => setIsFocused(false)}
            onTermChange={setTerm}
          />
        </div>
      )}
    </div>
  );
}
