import type { NextConfig } from "next";
import { MEDIA_PROXY_PREFIX, MEDIA_SOURCE_PATH, mediaOrigin } from "./src/lib/api/media";

const nextConfig: NextConfig = {
  /**
   * Cache Components: data is dynamic by default, and each catalogue fetch
   * opts into caching with `use cache` + `cacheLife`/`cacheTag`. Next.js
   * prerenders a static shell and streams the rest, which is what the PRD
   * asks for on SEO-critical catalogue pages (§19, §28).
   */
  cacheComponents: true,

  /**
   * Product imagery is served straight from the media host (Laravel, a CDN or
   * an object store) — the URLs Laravel returns are used as they are.
   *
   * This rewrite exists for the one consumer that cannot do that: the room
   * visualizer reads a texture into a canvas and exports it, which needs the
   * image to be same-origin (a cross-origin image taints the canvas, and the
   * public disk sends no CORS headers). It maps `/media/*` back to the media
   * host so that path is served from this origin.
   */
  async rewrites() {
    return [
      {
        source: `${MEDIA_PROXY_PREFIX}/:path*`,
        destination: `${mediaOrigin()}${MEDIA_SOURCE_PATH}/:path*`,
      },
    ];
  },

  /**
   * The self-hosted ONNX runtime lives under a folder named for its version
   * (`scripts/vendor-ort.mjs`), so a new version is a new URL and the files can
   * be cached for a year. 13MB a visitor downloads once, not once per visit.
   */
  // async headers() {
  //   return [
  //     {
  //       source: "/vendor/ort/:version/:file*",
  //       headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
  //     },
  //   ];
  // },

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
