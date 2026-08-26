import { Suspense } from "react";
import type { Metadata } from "next";
import { getFilterOptions, getProducts, type ProductFilters } from "@/lib/api/catalog";
import { countActiveFilters, parseFilters, type SearchParamsRecord } from "@/lib/catalog-filters";
import { buildQuery } from "@/lib/api/client";
import { ProductGrid, ProductGridSkeleton } from "@/components/catalog/ProductGrid";
import { CatalogPagination } from "@/components/catalog/CatalogPagination";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { FilterRail } from "@/components/catalog/FilterRail";

export const metadata: Metadata = {
  title: "Flooring Catalogue",
  description:
    "Browse engineered wood, SPC, luxury vinyl, natural stone, wall panels and outdoor decking — filter by room, style, finish, thickness and price.",
  alternates: { canonical: "/products" },
};

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const activeCount = countActiveFilters(filters);

  return (
    <>
      <section className="bg-charcoal-dark pt-header pb-14 text-primary-foreground">
        <div className="container-fluid">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold-light">
            Catalogue
          </p>
          <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl tracking-tight md:text-6xl">
            Every surface we supply, in one place.
          </h1>
          <p className="mt-4 max-w-xl text-primary-foreground/70">
            Specification-ready products across our material families — filter by room, look, finish
            and budget, then visualise your choice in your own space.
          </p>
        </div>
      </section>

      <div className="container-fluid grid gap-10 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-header-offset">
            <Suspense fallback={<FilterRailSkeleton />}>
              <FilterRailSection activeCount={activeCount} />
            </Suspense>
          </div>
        </aside>

        <div className="min-w-0">
          <Suspense fallback={<div className="h-10" />}>
            <ToolbarSection filters={filters} activeCount={activeCount} />
          </Suspense>

          <Suspense key={JSON.stringify(filters)} fallback={<ProductGridSkeleton />}>
            <ResultsSection filters={filters} params={params} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function FilterRailSection({ activeCount }: { activeCount: number }) {
  const options = await getFilterOptions();

  return <FilterRail options={options} activeCount={activeCount} />;
}

async function ToolbarSection({
  filters,
  activeCount,
}: {
  filters: ProductFilters;
  activeCount: number;
}) {
  const [options, products] = await Promise.all([getFilterOptions(), getProducts(filters)]);

  return (
    <div className="mb-8 border-b border-border pb-6">
      <CatalogToolbar
        options={options}
        activeCount={activeCount}
        resultCount={products.meta.total}
      />
    </div>
  );
}

async function ResultsSection({
  filters,
  params,
}: {
  filters: ProductFilters;
  params: SearchParamsRecord;
}) {
  const products = await getProducts(filters);

  return (
    <>
      <ProductGrid
        products={products.data}
        emptyMessage={
          filters.q
            ? `Nothing matches “${filters.q}”. Try a different colour, material or SKU.`
            : "No products match these filters. Try widening your selection."
        }
      />

      <CatalogPagination
        currentPage={products.meta.current_page}
        lastPage={products.meta.last_page}
        buildHref={(page) =>
          `/products${buildQuery({
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
