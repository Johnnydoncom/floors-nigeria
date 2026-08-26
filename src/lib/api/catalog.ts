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

  return api.get<Paginated<ProductCard>>("/v1/products", { query: filters as QueryParams });
}

/**
 * Returns null when the product is missing or unpublished so callers can
 * render `notFound()` rather than a 500.
 */
export async function getProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.catalog, CacheTags.product(slug));

  try {
    const { data } = await api.get<Envelope<Product>>(`/v1/products/${slug}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.categories);

  const { data } = await api.get<Envelope<Category[]>>("/v1/categories");
  return data;
}

export async function getCategory(slug: string): Promise<Category | null> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.categories);

  try {
    const { data } = await api.get<Envelope<Category>>(`/v1/categories/${slug}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getCollections(featuredOnly = false): Promise<Collection[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.collections);

  const { data } = await api.get<Envelope<Collection[]>>("/v1/collections", {
    query: featuredOnly ? { featured: true } : undefined,
  });
  return data;
}

export async function getTaxonomies(type?: TaxonomyType): Promise<Taxonomy[]> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.taxonomies);

  const { data } = await api.get<Envelope<Taxonomy[]>>("/v1/taxonomies", {
    query: type ? { type } : undefined,
  });
  return data;
}

/**
 * One tag's landing page data. Slugs are unique per type, so the type is part
 * of the lookup.
 */
export async function getTaxonomy(type: TaxonomyType, slug: string): Promise<Taxonomy | null> {
  "use cache";
  cacheLife("days");
  cacheTag(CacheTags.taxonomies);

  try {
    const { data } = await api.get<Envelope<Taxonomy>>(`/v1/taxonomies/${type}/${slug}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getFilterOptions(): Promise<FilterOptions> {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.filterOptions);

  const { data } = await api.get<Envelope<FilterOptions>>("/v1/filter-options");
  return data;
}

/**
 * Autocomplete. Cached briefly: the same few queries repeat constantly, but
 * results should follow catalogue changes quickly.
 */
export async function searchCatalog(term: string): Promise<SearchResults> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.catalog);

  return api.get<SearchResults>("/v1/search", { query: { q: term } });
}
