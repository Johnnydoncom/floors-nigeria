import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
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

  return {
    title: isRefined && params.q ? `Search: ${params.q}` : "Flooring Catalogue",
    description: DESCRIPTION,
    alternates: { canonical: "/products" },
    robots: isRefined ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <>
      <section className="bg-charcoal-dark pb-14 pt-header text-primary-foreground">
        <div className="container-fluid">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-light">
            Catalogue
          </p>
          <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl tracking-tight md:text-5xl">
            Every surface we supply, in one place.
          </h1>
          <p className="mt-4 max-w-xl text-primary-foreground/70">
            Specification-ready products across our material families — filter by room, look, finish
            and budget, then visualise your choice in your own space.
          </p>
        </div>
      </section>

      <CatalogBrowser basePath="/products" searchParams={Promise.resolve(params)} />
    </>
  );
}
