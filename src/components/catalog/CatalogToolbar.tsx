"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SORT_LABELS } from "@/lib/catalog-filters";
import type { FilterOptions } from "@/lib/api/types";
import { FilterRail } from "./FilterRail";
import { useFilterNavigation } from "./useFilterNavigation";

/**
 * Search, sort and the mobile filter drawer (§7, §32).
 */
export function CatalogToolbar({
  options,
  activeCount,
  resultCount,
  hiddenGroups = [],
}: {
  options: FilterOptions;
  activeCount: number;
  resultCount: number;
  hiddenGroups?: string[];
}) {
  const { searchParams, set, isPending } = useFilterNavigation();
  const paramTerm = searchParams.get("q") ?? "";
  const [term, setTerm] = useState(paramTerm);
  const [lastParamTerm, setLastParamTerm] = useState(paramTerm);

  // Keep the input in step with back/forward navigation, adjusting state during
  // render rather than in an effect so no extra pass is scheduled.
  if (paramTerm !== lastParamTerm) {
    setLastParamTerm(paramTerm);
    setTerm(paramTerm);
  }

  const activeSort = searchParams.get("sort") ?? "newest";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          set("q", term.trim() || null);
        }}
        className="relative min-w-[220px] flex-1"
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search products, colours or SKU"
          aria-label="Search the catalogue"
          className="h-10 rounded-md bg-background pl-9"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              set("q", null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </form>

      <div className="flex items-center gap-2">
        <label htmlFor="catalog-sort" className="sr-only">
          Sort products
        </label>
        <select
          id="catalog-sort"
          value={activeSort}
          onChange={(event) => set("sort", event.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {options.sorts.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort] ?? sort}
            </option>
          ))}
        </select>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-10 rounded-md lg:hidden">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(22rem,90vw)] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter products</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-8">
              <FilterRail options={options} activeCount={activeCount} hiddenGroups={hiddenGroups} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <p
        aria-live="polite"
        className="w-full font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        {isPending ? "Updating results…" : `${resultCount} product${resultCount === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
