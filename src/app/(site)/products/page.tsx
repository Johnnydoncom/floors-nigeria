import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { CategoryTiles } from "@/components/catalog/CategoryTiles";
import { ShoppingSteps } from "@/components/catalog/ShoppingSteps";
import { hasRefinements, type SearchParamsRecord } from "@/lib/catalog-filters";

type PageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

const DESCRIPTION =
  "Browse every floor Floor Nigeria supplies — SPC and vinyl, engineered wood, artificial grass, epoxy, mats and wall panels. Filter by room, look, finish, thickness and price.";

/**
 * A filtered catalogue is a refinement of this page, not a page of its own, so
 * refined views stay out of the index and point back here (§18).
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const isRefined = hasRefinements(params);

  return pageMetadata({
    title: isRefined && params.q ? `Search: ${params.q}` : "Flooring Catalogue — Shop All Floors",
    description: DESCRIPTION,
    path: "/products",
    // Filtered and searched views point back to the full catalogue.
    noindex: isRefined,
  });
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <>
      {/* A short masthead: the families, how buying works, then the products. */}
      <section className="border-b border-border bg-surface/50 pt-header">
        <div className="container-fluid space-y-6 py-6 lg:py-8">
          <div className="max-w-3xl">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
              Catalogue
            </p>
            <h1 className="mt-1 text-balance font-display text-3xl tracking-tight md:text-4xl">
              Every floor we supply, in one place.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Filter by room, look, finish and budget — then see your choice in your own space.
            </p>
          </div>

          <Suspense fallback={<div className="h-[188px]" aria-hidden />}>
            <CategoryTiles />
          </Suspense>

          <ShoppingSteps />
        </div>
      </section>

      <div id="catalogue" className="scroll-mt-24">
        <CatalogBrowser basePath="/products" searchParams={Promise.resolve(params)} />
      </div>
    </>
  );
}
