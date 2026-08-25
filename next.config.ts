import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cache Components: data is dynamic by default, and each catalogue fetch
   * opts into caching with `use cache` + `cacheLife`/`cacheTag`. Next.js
   * prerenders a static shell and streams the rest, which is what the PRD
   * asks for on SEO-critical catalogue pages (§19, §28).
   */
  cacheComponents: true,

  images: {
    remotePatterns: [
      // Laravel media library in local development.
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
      // Production media/CDN host.
      { protocol: "https", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  reactStrictMode: true,
};

export default nextConfig;
