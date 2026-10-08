"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { naira } from "@/lib/format";
import { library, materialKey, useLibrary } from "@/lib/visualizer/library";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";

/** The filter choices the studio offers, trimmed from the catalogue's filter options. */
export type VisualizerFilters = {
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
  colour: {
    attribute: string;
    terms: { slug: string; label: string; hex: string | null }[];
  } | null;
  price: { min: number; max: number };
};

type Query = {
  q: string;
  category: string;
  brand: string;
  colour: string;
  price: string;
  sort: string;
};

const EMPTY_QUERY: Query = {
  q: "",
  category: "",
  brand: "",
  colour: "",
  price: "",
  sort: "popular",
};

type View = "all" | "favorites" | "recent";

type PageState = {
  key: string;
  items: TextureChoice[];
  page: number;
  lastPage: number;
  total: number | null;
};

/**
 * The catalogue inside the studio (§10): search it, filter it, keep a
 * shortlist, and switch floors without leaving the room.
 *
 * The first screen is the popular materials the page already shipped, so the
 * studio opens instantly; anything narrower is fetched from the catalogue as
 * the visitor types or filters. Favourites and recently tried floors live in
 * this browser (`library.ts`) and need no account.
 */
export function MaterialBrowser({
  initial,
  filters,
  selected,
  onSelect,
  header,
}: {
  initial: TextureChoice[];
  filters: VisualizerFilters;
  selected: TextureChoice | null;
  onSelect: (choice: TextureChoice) => void;
  /** Shown above the grid, e.g. which side of a comparison is being chosen. */
  header?: React.ReactNode;
}) {
  const [query, setQuery] = useState<Query>(EMPTY_QUERY);
  const [view, setView] = useState<View>("all");
  const [state, setState] = useState<PageState>({
    key: "",
    items: initial,
    page: 1,
    lastPage: 2,
    total: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const { favorites, recent } = useLibrary();
  const debouncedSearch = useDebounced(query.q, 300);

  const colourAttribute = filters.colour?.attribute ?? null;
  const searchKey = useMemo(
    () => buildSearch({ ...query, q: debouncedSearch }, colourAttribute),
    [debouncedSearch, query, colourAttribute],
  );
  const isFiltered = searchKey !== "";
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = async (page: number, key: string, append: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setFailed(false);

    try {
      const response = await fetch(`/api/catalog/materials?${key}&page=${page}`, {
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(String(response.status));

      const payload = (await response.json()) as {
        data: TextureChoice[];
        meta: { current_page: number; last_page: number; total: number };
      };

      setState((current) => ({
        key,
        items: append ? dedupe([...current.items, ...payload.data]) : payload.data,
        page: payload.meta.current_page,
        lastPage: payload.meta.last_page,
        total: payload.meta.total,
      }));
    } catch (error) {
      if ((error as Error).name !== "AbortError") setFailed(true);
    } finally {
      if (abortRef.current === controller) setIsLoading(false);
    }
  };

  // A new search or filter starts again from page one.
  useEffect(() => {
    if (!isFiltered) {
      abortRef.current?.abort();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- back to the shipped first page
      setState({ key: "", items: initial, page: 1, lastPage: 2, total: null });
      setIsLoading(false);
      return;
    }

    void fetchPage(1, searchKey, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, isFiltered]);

  const items = view === "favorites" ? favorites : view === "recent" ? recent : state.items;
  const canLoadMore = view === "all" && state.page < state.lastPage && !isLoading;

  const update = (patch: Partial<Query>) => {
    setView("all");
    setQuery((current) => ({ ...current, ...patch }));
  };

  const priceBuckets = useMemo(() => buckets(filters.price), [filters.price]);

  return (
    <div className="space-y-3">
      {header}

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="material-search" className="sr-only">
          Search floors
        </label>
        <input
          id="material-search"
          type="search"
          value={query.q}
          onChange={(event) => update({ q: event.target.value })}
          placeholder="Search oak, grey tile, SPC…"
          className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filters.categories.length > 0 && (
          <FilterSelect
            label="Type"
            value={query.category}
            onChange={(category) => update({ category })}
            options={filters.categories.map((category) => ({
              value: category.slug,
              label: category.name,
            }))}
          />
        )}
        {filters.colour && filters.colour.terms.length > 0 && (
          <FilterSelect
            label="Colour"
            value={query.colour}
            onChange={(colour) => update({ colour })}
            options={filters.colour.terms.map((term) => ({ value: term.slug, label: term.label }))}
          />
        )}
        {filters.brands.length > 0 && (
          <FilterSelect
            label="Brand"
            value={query.brand}
            onChange={(brand) => update({ brand })}
            options={filters.brands.map((brand) => ({ value: brand.slug, label: brand.name }))}
          />
        )}
        {priceBuckets.length > 0 && (
          <FilterSelect
            label="Price"
            value={query.price}
            onChange={(price) => update({ price })}
            options={priceBuckets}
          />
        )}
        <FilterSelect
          label="Sort"
          value={query.sort}
          allowEmpty={false}
          onChange={(sort) => update({ sort })}
          options={[
            { value: "popular", label: "Most popular" },
            { value: "newest", label: "Newest" },
            { value: "price_asc", label: "Price: low to high" },
            { value: "price_desc", label: "Price: high to low" },
            { value: "name", label: "Name A–Z" },
          ]}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div role="group" aria-label="Show" className="flex gap-1">
          <ViewTab active={view === "all"} onClick={() => setView("all")}>
            All
          </ViewTab>
          <ViewTab active={view === "favorites"} onClick={() => setView("favorites")}>
            Favourites{favorites.length > 0 && ` (${favorites.length})`}
          </ViewTab>
          <ViewTab active={view === "recent"} onClick={() => setView("recent")}>
            Recent
          </ViewTab>
        </div>
        {isFiltered && view === "all" && (
          <button
            type="button"
            onClick={() => setQuery(EMPTY_QUERY)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {isLoading ? "Loading floors" : `${items.length} floors shown`}
      </p>

      {items.length === 0 && !isLoading ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {view === "favorites"
            ? "Tap the heart on any floor to keep it here."
            : view === "recent"
              ? "Floors you try will appear here."
              : failed
                ? "The catalogue could not be reached. Try again in a moment."
                : "No floors match. Try fewer filters."}
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Choose a floor"
          className={cn(
            "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3",
            isLoading && "opacity-60",
          )}
        >
          {items.map((choice) => (
            <MaterialSwatch
              key={materialKey(choice)}
              choice={choice}
              isSelected={selected !== null && materialKey(selected) === materialKey(choice)}
              isFavorite={favorites.some((entry) => materialKey(entry) === materialKey(choice))}
              onSelect={() => onSelect(choice)}
              onToggleFavorite={() => toggleFavorite(choice)}
            />
          ))}
        </div>
      )}

      {view === "all" && (canLoadMore || isLoading) && (
        <Button
          variant="outline"
          className="h-10 w-full"
          disabled={isLoading}
          onClick={() => void fetchPage(state.page + 1, searchKey, true)}
        >
          {isLoading && <Loader2 className="animate-spin" aria-hidden />}
          {isLoading ? "Loading…" : "Show more floors"}
        </Button>
      )}
    </div>
  );
}

function MaterialSwatch({
  choice,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  choice: TextureChoice;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const name = `${choice.productName}${choice.variantName ? ` — ${choice.variantName}` : ""}`;

  return (
    <div className="relative">
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={name}
        onClick={onSelect}
        title={name}
        className={cn(
          "group block w-full rounded-md text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
          isSelected ? "ring-2 ring-gold ring-offset-2 ring-offset-background" : "hover:opacity-90",
        )}
      >
        <span className="relative block aspect-square overflow-hidden rounded-md bg-muted">
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
        {choice.variantName && (
          <span className="block truncate text-[10px] leading-tight text-muted-foreground">
            {choice.productName}
          </span>
        )}
        {choice.price !== null && (
          <span className="block font-mono text-[11px] text-muted-foreground">
            {naira(choice.price)}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
        className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/85 text-foreground shadow-sm transition hover:bg-background"
      >
        <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-gold text-gold")} aria-hidden />
      </button>
    </div>
  );
}

/**
 * Favourite a floor here, and on the account too when there is one — so it
 * appears in Saved next to the product page's Save button. Signed out, the
 * account call is refused and the browser's own list is all there is.
 */
export function toggleFavorite(choice: TextureChoice): void {
  const isNowFavorite = library.toggleFavorite(choice);

  if (isNowFavorite) {
    track("favorite_saved", { product: choice.productSlug, finish: choice.variantName });

    if (choice.productId) {
      void fetch("/api/account/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: choice.productId,
          product_variant_id: choice.variantId,
        }),
      }).catch(() => undefined);
    }

    return;
  }

  // The account keeps one favourite per product; only remove it there when no
  // other colour of the same product is still a favourite here.
  if (!library.hasFavoriteProduct(choice.productSlug)) {
    void fetch(`/api/account/favorites?slug=${encodeURIComponent(choice.productSlug)}`, {
      method: "DELETE",
    }).catch(() => undefined);
  }
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allowEmpty = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allowEmpty?: boolean;
}) {
  const id = `filter-${label.toLowerCase()}`;

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-9 w-full truncate rounded-md border border-border bg-background px-2 text-xs outline-none transition focus:border-gold",
          value ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {allowEmpty && <option value="">{`${label}: any`}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3 text-xs font-semibold transition",
        active
          ? "bg-charcoal text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function buildSearch(query: Query, colourAttribute: string | null): string {
  const params = new URLSearchParams();

  if (query.q.trim().length >= 2) params.set("q", query.q.trim());
  if (query.category) params.set("category", query.category);
  if (query.brand) params.set("brand", query.brand);
  if (query.sort && query.sort !== "popular") params.set("sort", query.sort);

  if (query.price) {
    const [min, max] = query.price.split("-");
    if (Number(min) > 0) params.set("min_price", min);
    if (Number(max) > 0) params.set("max_price", max);
  }

  // Colour is an attribute filter, sent as `attr.<attribute>=<term>`.
  if (query.colour && colourAttribute) params.set(`attr.${colourAttribute}`, query.colour);

  return params.toString();
}

/** Four price bands across the catalogue's range, rounded to friendly numbers. */
function buckets({ min, max }: { min: number; max: number }): { value: string; label: string }[] {
  if (!(max > min) || max <= 0) return [];

  const step = (max - min) / 4;
  const round = (value: number) => {
    const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(value, 1))) - 1);
    return Math.round(value / magnitude) * magnitude;
  };

  const edges = [0, round(min + step), round(min + step * 2), round(min + step * 3)];

  return edges.map((edge, index) => {
    const next = edges[index + 1];
    return next
      ? {
          value: `${edge}-${next}`,
          label: index === 0 ? `Under ${naira(next)}` : `${naira(edge)}–${naira(next)}`,
        }
      : { value: `${edge}-`, label: `${naira(edge)} and up` };
  });
}

function dedupe(items: TextureChoice[]): TextureChoice[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = materialKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
