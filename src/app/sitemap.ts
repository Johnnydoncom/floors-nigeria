import type { MetadataRoute } from "next";
import { getCategories, getCollections, getProducts } from "@/lib/api/catalog";
import { absoluteUrl } from "@/lib/structured-data";

const STATIC_ROUTES = [
  "/",
  "/products",
  "/collections",
  "/visualizer",
  "/calculator",
  "/projects",
  "/industries",
  "/blog",
  "/about",
  "/contact",
];

const MAX_PRODUCTS = 1000;

/**
 * Sitemap generated from live catalogue data (§18), so newly published
 * products are discoverable without a code change.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A catalogue outage should degrade the sitemap, never fail the build.
  const [products, categories, collections] = await Promise.all([
    getProducts({ per_page: 60, sort: "newest" })
      .then((page) => page.data)
      .catch(() => []),
    getCategories().catch(() => []),
    getCollections().catch(() => []),
  ]);

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: absoluteUrl(route),
      changeFrequency: "weekly" as const,
      priority: route === "/" ? 1 : 0.7,
    })),
    ...categories.map((category) => ({
      url: absoluteUrl(`/products?categories=${category.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...collections.map((collection) => ({
      url: absoluteUrl(`/collections/${collection.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...products.slice(0, MAX_PRODUCTS).map((product) => ({
      url: absoluteUrl(`/products/${product.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
