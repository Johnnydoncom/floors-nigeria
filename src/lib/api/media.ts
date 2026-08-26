/**
 * Media URLs.
 *
 * Laravel returns absolute media URLs against its own origin. Next.js 16
 * refuses to optimize images whose host resolves to a private IP — an SSRF
 * guard — which rules out `http://localhost:8000/storage/...` in development
 * and any API on an internal network in production.
 *
 * Rather than opting out of that protection with `dangerouslyAllowLocalIP`,
 * media is served through this app's own origin: every media URL is rewritten
 * to `/media/...`, and `next.config.ts` proxies that path to the media host.
 * The optimizer then only ever sees a local path.
 */

export const MEDIA_PROXY_PREFIX = "/media";

/** Path Laravel's public disk is exposed at. */
export const MEDIA_SOURCE_PATH = "/storage";

/**
 * Origin that actually stores the media — the Laravel app in development, or a
 * CDN/object store in production.
 */
export function mediaOrigin(): string {
  const configured = process.env.MEDIA_BASE_URL ?? process.env.LARAVEL_API_URL;

  try {
    return new URL(configured ?? "http://localhost:8000").origin;
  } catch {
    return "http://localhost:8000";
  }
}

/**
 * Rewrite one absolute media URL to its same-origin proxy path. Anything that
 * is not a media URL — an external link, an already-relative path — is
 * returned untouched.
 */
export function toMediaPath(url: string): string {
  const origin = mediaOrigin();

  if (!url.startsWith(`${origin}${MEDIA_SOURCE_PATH}/`)) {
    return url;
  }

  return `${MEDIA_PROXY_PREFIX}${url.slice(origin.length + MEDIA_SOURCE_PATH.length)}`;
}

/**
 * Walk an API payload and rewrite every media URL it contains.
 *
 * Done once, centrally, so no resource or component has to remember: a new
 * image field on the API is proxied the day it ships.
 */
export function rewriteMediaUrls<T>(payload: T): T {
  if (typeof payload === "string") {
    return toMediaPath(payload) as T;
  }

  if (Array.isArray(payload)) {
    return payload.map(rewriteMediaUrls) as T;
  }

  if (payload !== null && typeof payload === "object") {
    return Object.fromEntries(
      Object.entries(payload as Record<string, unknown>).map(([key, value]) => [
        key,
        rewriteMediaUrls(value),
      ]),
    ) as T;
  }

  return payload;
}
