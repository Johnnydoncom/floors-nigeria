import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import type { ProductCard as ProductCardData } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const GRID_CLASSES = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

export function ProductGrid({
  products,
  className,
  emptyMessage = "No products match your filters yet.",
}: {
  products: ProductCardData[];
  className?: string;
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <p className="border border-dashed border-border py-24 text-center text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn(GRID_CLASSES, className)}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 3} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={GRID_CLASSES} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
