import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { naira } from "@/lib/format";
import type { ProductCard as ProductCardData } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * The single product card used by the catalogue, category pages, search and
 * recommendations. Server component: no client JavaScript ships for a grid.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardData;
  /** Set on above-the-fold cards so the LCP image is not lazy-loaded. */
  priority?: boolean;
  className?: string;
}) {
  const href = `/products/${product.slug}`;
  const variant = product.default_variant;
  const badge = badgeFor(product);

  return (
    <article
      className={cn(
        "group flex h-full flex-col border border-border bg-card transition hover:border-gold/50 hover:shadow-luxe",
        className,
      )}
    >
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            Image coming soon
          </div>
        )}

        {badge && (
          <span className="absolute left-3 top-3 bg-gold px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-charcoal-dark">
            {badge}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>{product.category?.name ?? product.brand?.name ?? "Flooring"}</span>
          {product.rating.count > 0 && (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Star className="h-3 w-3 fill-gold text-gold" aria-hidden />
              {product.rating.average.toFixed(1)}
              <span className="sr-only">out of 5 from {product.rating.count} reviews</span>
            </span>
          )}
        </div>

        <h3 className="mt-2 font-display text-xl tracking-tight">
          <Link href={href} className="transition hover:text-gold">
            {product.name}
          </Link>
        </h3>

        {product.short_description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {product.short_description}
          </p>
        )}

        {(product.variant_count ?? 0) > 1 && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {product.variant_count} finishes
          </p>
        )}

        <div className="mt-auto flex items-end justify-between pt-5">
          <div>
            <div className="font-mono text-lg">
              {product.price_from !== null && (
                <span className="mr-1 text-xs text-muted-foreground">from</span>
              )}
              {naira(product.price_from)}
            </div>
            {variant && (
              <div className="text-[11px] text-muted-foreground">
                {variant.pricing.unit_label} · {variant.availability.label}
              </div>
            )}
          </div>

          <Link
            href={href}
            className="inline-flex h-10 items-center gap-1 bg-charcoal-dark px-4 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-gold hover:text-charcoal-dark"
          >
            View
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">{product.name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function badgeFor(product: ProductCardData): string | null {
  if (product.default_variant?.pricing.is_on_sale) return "On offer";
  if (product.is_featured) return "Featured";
  if (product.default_variant?.availability.status === "made_to_order") return "Made to order";
  return null;
}

/**
 * Matching skeleton so a streaming grid does not shift layout.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col border border-border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-3 w-24 animate-pulse bg-muted" />
        <div className="h-5 w-3/4 animate-pulse bg-muted" />
        <div className="h-4 w-full animate-pulse bg-muted" />
        <div className="mt-auto h-10 w-full animate-pulse bg-muted" />
      </div>
    </div>
  );
}
