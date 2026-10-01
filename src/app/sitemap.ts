import type { MetadataRoute } from "next";
import { getCategories, getProducts, getTaxonomies } from "@/lib/api/catalog";
import { PROJECTS } from "@/lib/content/projects";
import { absoluteUrl } from "@/lib/structured-data";

const STATIC_ROUTES = [
  "/",
  "/products",
  "/categories",
  "/collections",
  "/visualizer",
  "/room-designer",
  "/calculator",
  "/projects",
  "/industries",
  "/blog",
  "/about",
  "/contact",
];

const MAX_PRODUCTS = 1000;

/** The API's largest page (`ProductIndexRequest::MAX_PER_PAGE`). */
const PRODUCTS_PER_PAGE = 60;

/**
 * Every published product up to {@link MAX_PRODUCTS}. One page is not enough:
 * the import mirrors 100 products by default, and the API caps a page at 60.
 */
async function allProducts() {
  const first = await getProducts({ per_page: PRODUCTS_PER_PAGE, sort: "newest" });
  const lastPage = Math.min(first.meta.last_page, Math.ceil(MAX_PRODUCTS / PRODUCTS_PER_PAGE));

  const rest = await Promise.all(
    Array.from({ length: Math.max(0, lastPage - 1) }, (_, index) =>
      getProducts({ per_page: PRODUCTS_PER_PAGE, sort: "newest", page: index + 2 }).then(
        (page) => page.data,
      ),
    ),
  );

  return [first.data, ...rest].flat();
}

/**
 * Sitemap generated from live catalogue data (§18), so newly published
 * products are discoverable without a code change.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A catalogue outage should degrade the sitemap, never fail the build.
  const [products, categories, rooms] = await Promise.all([
    allProducts().catch(() => []),
    getCategories().catch(() => []),
    getTaxonomies("room").catch(() => []),
  ]);

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: absoluteUrl(route),
      changeFrequency: "weekly" as const,
      priority: route === "/" ? 1 : 0.7,
    })),
    // Parents and their children each get a landing page.
    ...categories
      .flatMap((category) => [category, ...(category.children ?? [])])
      .map((category) => ({
        url: absoluteUrl(`/categories/${category.slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...rooms.map((room) => ({
      url: absoluteUrl(`/rooms/${room.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Collections have a listing page but no detail route yet, so their
    // slugs are not listed here — they would be 404s.
    ...PROJECTS.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
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
