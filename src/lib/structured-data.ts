import type { Product } from "@/lib/api/types";

/**
 * schema.org payloads for SEO-critical pages (§18).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://floornigeria.com";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function productSchema(product: Product): Record<string, unknown> {
  const offers = product.variants
    .filter((variant) => variant.pricing.effective_price !== null)
    .map((variant) => ({
      "@type": "Offer",
      sku: variant.sku,
      name: variant.name,
      price: variant.pricing.effective_price,
      priceCurrency: variant.pricing.currency,
      availability: variant.availability.is_orderable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/products/${product.slug}`),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? product.description ?? undefined,
    sku: product.sku_family ?? undefined,
    image: product.image_url ? [product.image_url] : undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    category: product.category?.name,
    ...(offers.length > 0
      ? {
          offers:
            offers.length === 1
              ? offers[0]
              : {
                  "@type": "AggregateOffer",
                  priceCurrency: "NGN",
                  lowPrice: Math.min(...offers.map((offer) => Number(offer.price))),
                  highPrice: Math.max(...offers.map((offer) => Number(offer.price))),
                  offerCount: offers.length,
                  offers,
                },
        }
      : {}),
    ...(product.rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.average,
            reviewCount: product.rating.count,
          },
        }
      : {}),
  };
}

export function breadcrumbSchema(crumbs: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.url),
    })),
  };
}

export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Floor Nigeria",
    url: SITE_URL,
    areaServed: "NG",
    address: {
      "@type": "PostalAddress",
      addressCountry: "NG",
      addressRegion: "Lagos",
    },
  };
}
