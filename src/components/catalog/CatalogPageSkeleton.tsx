import { ProductGridSkeleton } from "./ProductGrid";

/**
 * Route-level placeholder for category and room pages.
 *
 * Its presence also gives the route its Suspense boundary, which is what lets
 * Next.js prerender a static shell for a slug it does not know yet.
 */
export function CatalogPageSkeleton() {
  return (
    <>
      <div className="bg-charcoal-dark pb-12 pt-header" aria-hidden>
        <div className="container-fluid space-y-4 pt-8">
          <div className="h-3 w-48 animate-pulse bg-white/10" />
          <div className="h-10 w-2/3 max-w-xl animate-pulse bg-white/10" />
          <div className="h-4 w-full max-w-2xl animate-pulse bg-white/10" />
        </div>
      </div>

      <div className="container-fluid grid gap-10 py-12 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden space-y-4 lg:block" aria-hidden>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse border-b border-border bg-muted/40" />
          ))}
        </div>

        <div className="min-w-0">
          <p className="sr-only">Loading products…</p>
          <ProductGridSkeleton />
        </div>
      </div>
    </>
  );
}
