import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/structured-data";

/**
 * Page metadata in one shape (§18).
 *
 * Next.js merges `openGraph` and `twitter` shallowly: a page that sets its own
 * `openGraph` silently drops the site name, locale and image inherited from
 * the root layout. Every page builds its metadata here instead, so each one
 * ships a canonical URL and complete social cards.
 */

export const SITE_NAME = "Floors NG";

export const SITE_TAGLINE = "Premium Flooring Solutions in Nigeria";

export const DEFAULT_DESCRIPTION =
  "Nigeria's premium flooring house. SPC and luxury vinyl, engineered wood, natural stone, epoxy, artificial grass and wall panels — supplied, delivered and installed nationwide.";

/** 1200 × 630, the size every major network crops share cards to. */
export const DEFAULT_OG_IMAGE = {
  url: "/images/og-default.jpg",
  width: 1200,
  height: 630,
  alt: "Floors NG — premium flooring supplied and installed across Nigeria",
};

export const SEO_KEYWORDS = [
  "flooring Nigeria",
  "flooring Lagos",
  "SPC flooring",
  "vinyl flooring",
  "laminate flooring",
  "engineered wood flooring",
  "epoxy flooring",
  "artificial grass",
  "WPC wall panels",
  "floor installation",
  "Floor Nigeria",
];

type PageMetadataInput = {
  title: string;
  description?: string | null;
  /** Site-relative path of the canonical URL, e.g. `/products`. */
  path: string;
  /** Site-relative or absolute share image. Falls back to the brand card. */
  image?: string | null;
  imageAlt?: string;
  keywords?: string[];
  /** Keep the page out of search results (filtered views, carts, tokens). */
  noindex?: boolean;
  /** `noindex` pages still pass link equity unless this is false. */
  follow?: boolean;
  type?: "website" | "article";
};

export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  keywords,
  noindex = false,
  follow = true,
  type = "website",
}: PageMetadataInput): Metadata {
  const summary = description ?? DEFAULT_DESCRIPTION;
  const images = image
    ? [{ url: absoluteUrl(image), alt: imageAlt ?? title }]
    : [{ ...DEFAULT_OG_IMAGE, url: absoluteUrl(DEFAULT_OG_IMAGE.url) }];

  return {
    title,
    description: summary,
    keywords: keywords ?? undefined,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow } : undefined,
    openGraph: {
      title,
      description: summary,
      url: path,
      siteName: SITE_NAME,
      locale: "en_NG",
      type,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary,
      images: images.map((entry) => entry.url),
    },
  };
}
