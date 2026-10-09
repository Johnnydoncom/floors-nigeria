import type { Product } from "@/lib/api/types";
import { SHOWROOM_PHONE } from "@/lib/site-contact";

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
    // Media is served from our own origin, so schema.org needs it absolute.
    image: product.image_url ? [absoluteUrl(product.image_url)] : undefined,
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
    "@id": absoluteUrl("/#organization"),
    name: "Floor Nigeria",
    alternateName: "Floors NG",
    url: SITE_URL,
    logo: absoluteUrl("/images/floors-ng-logo.png"),
    image: absoluteUrl("/images/og-default.jpg"),
    description:
      "Premium flooring supplier and installer — SPC and vinyl, engineered wood, natural stone, epoxy, artificial grass and wall panels.",
    telephone: SHOWROOM_PHONE,
    priceRange: "₦₦",
    areaServed: { "@type": "Country", name: "Nigeria" },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Admiralty Way, Lekki Phase 1",
      addressLocality: "Lagos",
      addressRegion: "Lagos",
      addressCountry: "NG",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SHOWROOM_PHONE,
      contactType: "sales",
      areaServed: "NG",
      availableLanguage: ["en"],
    },
  };
}

/**
 * Declares the site and its search, which is what lets Google show a search
 * box under the homepage result.
 */
export function websiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: "Floors NG",
    url: SITE_URL,
    inLanguage: "en-NG",
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/products")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * A listing page's products, in order, so search engines read the grid as a
 * collection rather than a page of loose links.
 */
export function itemListSchema(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.url),
    })),
  };
}

/**
 * A journal article, credited to the business as publisher.
 */
export function articleSchema(article: {
  title: string;
  description: string | null;
  url: string;
  image: string | null;
  author: string;
  publishedAt: string | null;
  updatedAt: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description ?? undefined,
    url: absoluteUrl(article.url),
    mainEntityOfPage: absoluteUrl(article.url),
    image: article.image ? absoluteUrl(article.image) : undefined,
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
    author: { "@type": "Organization", name: article.author },
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en-NG",
  };
}

/**
 * Question-and-answer content, eligible for FAQ rich results (§18).
 */
export function faqSchema(faqs: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
