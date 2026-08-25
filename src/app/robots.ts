import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/structured-data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Account and API routes hold personal data and never belong in an index.
        disallow: ["/account", "/admin", "/checkout", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
