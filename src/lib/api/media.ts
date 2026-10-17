/**
 * Media URLs.
 *
 * Laravel returns absolute media URLs against its own origin — the Laravel app
 * in development, a CDN or object store in production. The storefront serves
 * those URLs as they are: product photography loads straight from the media
 * host, so it never travels through this app (and, on Vercel, never through a
 * rewrite).
 *
 * The room visualizer is the one exception. It reads a texture into a canvas
 * and exports the result, and a canvas that has drawn a cross-origin image is
 * "tainted" unless the host sends CORS — which Laravel's public disk does not.
 * For that consumer, `mediaProxyPath()` maps a media URL onto this app's own
 * `/media/*` path, which `next.config.ts` proxies to the media host so the
 * texture stays same-origin and the canvas stays exportable.
 */

export const MEDIA_PROXY_PREFIX = "/media";

/** Path Laravel's public disk is exposed at. */
export const MEDIA_SOURCE_PATH = "/storage";

/** The `/storage/` segment, used to recognise a media path structurally. */
const MEDIA_SEGMENT = `${MEDIA_SOURCE_PATH}/`;

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
 * Rewrite an absolute media URL to its same-origin proxy path. Anything that
 * is not a media URL — an external link, an already-relative path — is
 * returned untouched.
 *
 * Structural on purpose: it keys off the `/storage/` segment rather than a
 * configured host, so it behaves identically on the server and in the browser
 * (where `MEDIA_BASE_URL` is not available to client code).
 */
export function mediaProxyPath(url: string): string {
  let pathname = url;

  try {
    pathname = new URL(url).pathname;
  } catch {
    // Already a path, or not something a URL can represent; leave it alone.
  }

  const index = pathname.indexOf(MEDIA_SEGMENT);

  if (index === -1) {
    return url;
  }

  return `${MEDIA_PROXY_PREFIX}${pathname.slice(index + MEDIA_SOURCE_PATH.length)}`;
}
