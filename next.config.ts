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
   * Product imagery is served from this app's own origin and proxied to
   * wherever the media actually lives — Laravel in development, a CDN or
   * object store in production.
   *
   * That keeps `next/image` working on a private-network API without
   * `dangerouslyAllowLocalIP`, which would opt the whole app out of Next.js's
   * SSRF protection just to unblock localhost (§24, §27).
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
  async headers() {
    return [
      {
        source: "/vendor/ort/:version/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  images: {
    // Only these local paths may be optimized; everything else is rejected.
    localPatterns: [
      { pathname: `${MEDIA_PROXY_PREFIX}/**`, search: "" },
      { pathname: "/images/**", search: "" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  reactStrictMode: true,
};

export default nextConfig;
