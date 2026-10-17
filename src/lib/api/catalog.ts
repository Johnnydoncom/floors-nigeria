import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api, ApiError, CacheTags, type QueryParams } from "./client";
import type {
  Category,
  Collection,
  Envelope,
  FilterOptions,
  Paginated,
  Product,
  ProductCard,
  SearchResults,
  Taxonomy,
  TaxonomyType,
} from "./types";

/**
 * Catalogue reads.
 *
 * Every function here is a `use cache` scope tagged so a catalogue change in
 * Laravel can be revalidated on demand (`revalidateTag`) rather than waiting
 * for a rebuild — the ISR behaviour the PRD asks for in §19.
 */

/**
 * Run an API read, degrading to `fallback` when the API is unreachable or
 * refuses the request (bot protection, outage, deploy-time network block).
 * A 404 is passed to `onNotFound` when given. Must be called inside a
 * `use cache` scope: a degraded result is cached for minutes only, so the
 * real data replaces it on the next request instead of sticking for days.
 */
async function withFallback<T>(
  read: () => Promise<T>,
  fallback: T,
  onNotFound?: () => T,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (onNotFound && error instanceof ApiError && error.status === 404) return onNotFound();
    console.error("[catalog] API read failed, serving fallback:", error);
    cacheLife("minutes");
    return fallback;
  }
}

/**
 * A list endpoint that answers 200 with something other than the expected
 * envelope — a paginated body, `null`, an error shape — must still read as an
 * empty list, not crash the page rendering it at build time.
 */
function asList<T>(envelope: Envelope<T[]> | null): T[] {
  return Array.isArray(envelope?.data) ? envelope.data : [];
}

const EMPTY_PAGE: Paginated<ProductCard> = {
  data: [],
  links: { first: null, last: null, prev: null, next: null },
  meta: { current_page: 1, from: null, last_page: 1, per_page: 0, to: null, total: 0 },
};

const EMPTY_FILTERS: FilterOptions = {
  categories: [],
  brands: [],
  taxonomies: {},
  attributes: [],
  availability: [],
  price: { min: 0, max: 0, currency: "NGN" },
  sorts: [],
};

const EMPTY_SEARCH: SearchResults = {
  data: { query: "", products: [], categories: [], collections: [] },
  meta: { total_products: 0, zero_results: true },
};

export type ProductFilters = {
  q?: string;
  categories?: string[];
  brands?: string[];
  collections?: string[];
  taxonomies?: string[];
  availability?: string[];
  type?: "simple" | "variable";
  attributes?: Record<string, string[]>;
  min_price?: number;
  max_price?: number;
  min_thickness?: number;
  max_thickness?: number;
  featured?: boolean;
  sort?: string;
  page?: number;
  per_page?: number;
};

export async function getProducts(filters: ProductFilters = {}): Promise<Paginated<ProductCard>> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.catalog);

  return withFallback(
    () => api.get<Paginated<ProductCard>>("/v1/products", { query: filters as QueryParams }),
    EMPTY_PAGE,
  );
}

/**
 * Returns null when the product is missing or unpublished so callers can
 * render `notFound()` rather than a 500.
 */
export async function getProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.catalog, CacheTags.product(slug));

  return withFallback(
    async () => (await api.get<Envelope<Product>>(`/v1/products/${slug}`)).data,
    null,
    () => null,
  );
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.categories);

  return withFallback(
    async () => asList(await api.get<Envelope<Category[]>>("/v1/categories")),
    [],
  );
}

export async function getCategory(slug: string): Promise<Category | null> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.categories);

  return withFallback(
    async () => (await api.get<Envelope<Category>>(`/v1/categories/${slug}`)).data,
    null,
    () => null,
  );
}

export async function getCollections(featuredOnly = false): Promise<Collection[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.collections);

  return withFallback(
    async () =>
      asList(
        await api.get<Envelope<Collection[]>>("/v1/collections", {
          query: featuredOnly ? { featured: true } : undefined,
        }),
      ),
    [],
  );
}

export async function getTaxonomies(type?: TaxonomyType): Promise<Taxonomy[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.taxonomies);

  return withFallback(
    async () =>
      asList(
        await api.get<Envelope<Taxonomy[]>>("/v1/taxonomies", {
          query: type ? { type } : undefined,
        }),
      ),
    [],
  );
}

/**
 * One tag's landing page data. Slugs are unique per type, so the type is part
 * of the lookup.
 */
export async function getTaxonomy(type: TaxonomyType, slug: string): Promise<Taxonomy | null> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.taxonomies);

  return withFallback(
    async () => (await api.get<Envelope<Taxonomy>>(`/v1/taxonomies/${type}/${slug}`)).data,
    null,
    () => null,
  );
}

export async function getFilterOptions(): Promise<FilterOptions> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.filterOptions);

  return withFallback(
    async () => (await api.get<Envelope<FilterOptions>>("/v1/filter-options")).data,
    EMPTY_FILTERS,
  );
}

/**
 * Autocomplete. Cached briefly: the same few queries repeat constantly, but
 * results should follow catalogue changes quickly.
 */
export async function searchCatalog(term: string): Promise<SearchResults> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.catalog);

  return withFallback(
    () => api.get<SearchResults>("/v1/search", { query: { q: term } }),
    EMPTY_SEARCH,
  );
}
