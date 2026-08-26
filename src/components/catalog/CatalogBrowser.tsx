import { Suspense } from "react";
import { getFilterOptions, getProducts, type ProductFilters } from "@/lib/api/catalog";
import { buildQuery } from "@/lib/api/client";
import { countActiveFilters, parseFilters, type SearchParamsRecord } from "@/lib/catalog-filters";
import { CatalogPagination } from "./CatalogPagination";
import { CatalogToolbar } from "./CatalogToolbar";
import { FilterRail } from "./FilterRail";
import { ProductGrid, ProductGridSkeleton } from "./ProductGrid";

export type CatalogBrowserProps = {
  /** Path the pagination and filter links are built from, e.g. `/categories/spc-vinyl`. */
  basePath: string;
  /**
   * Passed as a promise, not awaited by the caller: the filters are read
   * inside the streamed sections below, so the page around them — hero,
   * breadcrumbs, copy — still prerenders into the static shell (§19, §28).
   */
  searchParams: Promise<SearchParamsRecord>;
  /**
   * Filters implied by the page itself — the category or room it represents.
   * They are applied to the query but never rendered in the rail, because the
   * URL already says them.
   */
  baseFilters?: ProductFilters;
  /** Filter groups the rail should hide, since the page already fixes them. */
  hiddenGroups?: string[];
  emptyMessage?: string;
};

/**
 * The filter rail, toolbar, product grid and pagination, shared by the full
 * catalogue and by every category and room landing page (§7).
 *
 * Facets stay in the query string on purpose: a filtered view is a refinement
 * of this page, not a separate indexable page. The page's own identity —
 * category, room — lives in the path instead (§18).
 */
export function CatalogBrowser({
  basePath,
  searchParams,
  baseFilters = {},
  hiddenGroups = [],
  emptyMessage,
}: CatalogBrowserProps) {
  return (
    <div className="container-fluid grid gap-10 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-header-offset">
          <Suspense fallback={<FilterRailSkeleton />}>
            <FilterRailSection searchParams={searchParams} hiddenGroups={hiddenGroups} />
          </Suspense>
        </div>
      </aside>

      <div className="min-w-0">
        <Suspense fallback={<div className="mb-8 h-10 border-b border-border pb-6" />}>
          <ToolbarSection
            searchParams={searchParams}
            baseFilters={baseFilters}
            hiddenGroups={hiddenGroups}
          />
        </Suspense>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ResultsSection
            searchParams={searchParams}
            baseFilters={baseFilters}
            basePath={basePath}
            emptyMessage={emptyMessage}
          />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Page-level filters win over anything typed into the URL, so a category page
 * cannot be widened out of its own category.
 */
function mergeFilters(base: ProductFilters, fromUrl: ProductFilters): ProductFilters {
  return {
    ...fromUrl,
    ...base,
    categories: [...(base.categories ?? []), ...(fromUrl.categories ?? [])],
    taxonomies: [...(base.taxonomies ?? []), ...(fromUrl.taxonomies ?? [])],
  };
}

async function FilterRailSection({
  searchParams,
  hiddenGroups,
}: {
  searchParams: Promise<SearchParamsRecord>;
  hiddenGroups: string[];
}) {
  const [params, options] = await Promise.all([searchParams, getFilterOptions()]);

  return (
    <FilterRail
      options={options}
      activeCount={countActiveFilters(parseFilters(params))}
      hiddenGroups={hiddenGroups}
    />
  );
}

async function ToolbarSection({
  searchParams,
  baseFilters,
  hiddenGroups,
}: {
  searchParams: Promise<SearchParamsRecord>;
  baseFilters: ProductFilters;
  hiddenGroups: string[];
}) {
  const params = await searchParams;
  const urlFilters = parseFilters(params);

  const [options, products] = await Promise.all([
    getFilterOptions(),
    getProducts(mergeFilters(baseFilters, urlFilters)),
  ]);

  return (
    <div className="mb-8 border-b border-border pb-6">
      <CatalogToolbar
        options={options}
        activeCount={countActiveFilters(urlFilters)}
        resultCount={products.meta.total}
        hiddenGroups={hiddenGroups}
      />
    </div>
  );
}

async function ResultsSection({
  searchParams,
  baseFilters,
  basePath,
  emptyMessage,
}: {
  searchParams: Promise<SearchParamsRecord>;
  baseFilters: ProductFilters;
  basePath: string;
  emptyMessage?: string;
}) {
  const params = await searchParams;
  const filters = mergeFilters(baseFilters, parseFilters(params));
  const products = await getProducts(filters);

  return (
    <>
      <ProductGrid
        products={products.data}
        emptyMessage={
          filters.q
            ? `Nothing matches “${filters.q}”. Try a different colour, material or SKU.`
            : (emptyMessage ?? "No products match these filters. Try widening your selection.")
        }
      />

      <CatalogPagination
        currentPage={products.meta.current_page}
        lastPage={products.meta.last_page}
        buildHref={(page) =>
          `${basePath}${buildQuery({
            ...(params as Record<string, string>),
            page: page > 1 ? page : undefined,
          })}`
        }
      />
    </>
  );
}

function FilterRailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-12 animate-pulse border-b border-border bg-muted/40" />
      ))}
    </div>
  );
}
