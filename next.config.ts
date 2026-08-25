import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from any domain during development; lock down in production
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Expose the Laravel API URL to server-side code only
  env: {
    LARAVEL_API_URL: process.env.LARAVEL_API_URL,
  },

  // Enable React strict mode for development hygiene
  reactStrictMode: true,
};

export default nextConfig;
