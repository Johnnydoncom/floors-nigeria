import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cache Components: data is dynamic by default, and each catalogue fetch
   * opts into caching with `use cache` + `cacheLife`/`cacheTag`. Next.js
   * prerenders a static shell and streams the rest, which is what the PRD
   * asks for on SEO-critical catalogue pages (§19, §28).
   */
  cacheComponents: true,

  /**
   * Next 16.4 asks Cache Components apps to choose. `false` keeps prefetching
   * exactly as it was built and tested. Turning it on makes a `<Link>` prefetch
   * the route's static App Shell instead of the page — likely fewer function
   * invocations on Vercel — but it is a behaviour change to adopt deliberately
   * (see node_modules/next/dist/docs/01-app/02-guides/adopting-partial-prefetching.md).
   */
  partialPrefetching: false,

  /**
   * Product imagery is served straight from the media host (Laravel, a CDN or
   * an object store) — the URLs Laravel returns are used as they are. The room
   * visualizer's same-origin copies come from `app/media/[...path]/route.ts`
   * (see `lib/api/media.ts` for why that is a route, not a rewrite).
   */

  /**
   * Template rooms are fetched by the photo, the canvas and the preloader in
   * turn; without a lifetime each is a revalidation round trip, which on a
   * mobile connection is most of the wait. A day fresh, a week served stale
   * while it refreshes: a re-baked room reaches everyone within a day.
   *
   * (The self-hosted ONNX runtime in `public/vendor/ort/<version>` could be
   * cached for a year the same way — `scripts/vendor-ort.mjs`.)
   */
  async headers() {
    return [
      {
        source: "/rooms/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },

  images: {
    /**
     * Optimization is off: media is served from the Laravel/CDN origin, which
     * already delivers correctly sized files, and the storefront avoids paying
     * for a second resize. With this on, `next/image` serves `src` untouched.
     */
    unoptimized: true,
    // Only these local paths may be optimized; everything else is rejected.
    localPatterns: [{ pathname: "/images/**", search: "" }],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // formats: ["image/avif", "image/webp"],
  },

  // reactStrictMode: true,
};

export default nextConfig;
