import type { ProductFilters } from "@/lib/api/catalog";

/**
 * Catalogue filter state lives entirely in the URL, so a filtered listing is
 * shareable, indexable and survives a refresh (§7, §18).
 *
 * This module is the single place that knows how filters are encoded, and is
 * imported by both the server page and the client filter rail.
 */

export const MULTI_VALUE_KEYS = [
  "categories",
  "brands",
  "collections",
  "taxonomies",
  "availability",
] as const;

export type MultiValueKey = (typeof MULTI_VALUE_KEYS)[number];

/** Attribute filters are encoded as `attr_<attribute-slug>=value-a,value-b`. */
export const ATTRIBUTE_PREFIX = "attr_";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toNumber(value: string | string[] | undefined): number | undefined {
  const parsed = Number(firstValue(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Turn URL search params into the API's filter payload.
 */
export function parseFilters(searchParams: SearchParamsRecord): ProductFilters {
  const attributes: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (!key.startsWith(ATTRIBUTE_PREFIX)) continue;
    const values = toList(value);
    if (values.length > 0) attributes[key.slice(ATTRIBUTE_PREFIX.length)] = values;
  }

  const filters: ProductFilters = {
    q: firstValue(searchParams.q) || undefined,
    sort: firstValue(searchParams.sort) || undefined,
    page: toNumber(searchParams.page),
    min_price: toNumber(searchParams.min_price),
    max_price: toNumber(searchParams.max_price),
    min_thickness: toNumber(searchParams.min_thickness),
    max_thickness: toNumber(searchParams.max_thickness),
  };

  for (const key of MULTI_VALUE_KEYS) {
    const values = toList(searchParams[key]);
    if (values.length > 0) filters[key] = values;
  }

  if (Object.keys(attributes).length > 0) filters.attributes = attributes;

  return filters;
}

/**
 * Count of filters applied, for the "Filters (3)" affordance on mobile.
 */
export function countActiveFilters(filters: ProductFilters): number {
  const listCount = MULTI_VALUE_KEYS.reduce((total, key) => total + (filters[key]?.length ?? 0), 0);
  const attributeCount = Object.values(filters.attributes ?? {}).reduce(
    (total, values) => total + values.length,
    0,
  );
  const priceCount = filters.min_price !== undefined || filters.max_price !== undefined ? 1 : 0;

  return listCount + attributeCount + priceCount;
}

/**
 * Toggle one value inside a comma-separated search param, returning the next
 * query string. Used by every filter control so behaviour stays consistent.
 */
export function toggleParamValue(
  params: URLSearchParams,
  key: string,
  value: string,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const current = toList(next.get(key) ?? undefined);
  const updated = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];

  if (updated.length > 0) {
    next.set(key, updated.join(","));
  } else {
    next.delete(key);
  }

  // Any filter change returns the visitor to the first page of results.
  next.delete("page");

  return next;
}

export function isParamValueActive(params: URLSearchParams, key: string, value: string): boolean {
  return toList(params.get(key) ?? undefined).includes(value);
}

export const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  rating: "Top rated",
  popular: "Most viewed",
  name: "Name A–Z",
};
