import { ProductGridSkeleton } from "@/components/catalog/ProductGrid";

export default function Loading() {
  return (
    <>
      <div className="h-[280px] bg-charcoal-dark md:h-[340px]" aria-hidden />
      <div className="container-fluid py-12">
        <p className="sr-only">Loading the catalogue…</p>
        <ProductGridSkeleton />
      </div>
    </>
  );
}
