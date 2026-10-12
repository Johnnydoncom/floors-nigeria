import type { MetadataRoute } from "next";
import { getCategories, getProducts, getTaxonomies } from "@/lib/api/catalog";
import { getPages, getPortfolio, getPosts } from "@/lib/api/content";
import { PUBLISHED_BRANCHES } from "@/lib/branches";
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
  "/branches",
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
  const [products, categories, rooms, projects, posts, pages] = await Promise.all([
    allProducts().catch(() => []),
    getCategories().catch(() => []),
    getTaxonomies("room").catch(() => []),
    getPortfolio().catch(() => []),
    getPosts({ per_page: 48 }).catch(() => null),
    getPages().catch(() => []),
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
        url: absoluteUrl(`/products/${category.slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...PUBLISHED_BRANCHES.map((branch) => ({
      url: absoluteUrl(`/branches/${branch.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...rooms.map((room) => ({
      url: absoluteUrl(`/rooms/${room.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Collections have a listing page but no detail route yet, so their
    // slugs are not listed here — they would be 404s.
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: project.updated_at ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...(posts?.data ?? []).map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updated_at ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...(posts?.categories ?? []).map((category) => ({
      url: absoluteUrl(`/blog/category/${category.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...pages.map((page) => ({
      url: absoluteUrl(`/${page.slug}`),
      lastModified: page.updated_at ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...products.slice(0, MAX_PRODUCTS).map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
