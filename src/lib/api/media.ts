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
 * `/media/*` path, served by `app/media/[...path]/route.ts`: the texture stays
 * same-origin, so the canvas stays exportable.
 *
 * That path used to be a `next.config.ts` rewrite. The media host refused the
 * rewrite's forwarded requests (an empty 403 for every texture, Nov 2026)
 * while answering the storefront's own server-side fetches, so the proxy is
 * now a route that fetches like the API client does — and resizes on the way,
 * because a texture needs a fraction of a product photograph's pixels.
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

/** Widths a proxied image may be resized to. A short list keeps the CDN cache small. */
export const MEDIA_WIDTHS = [480, 960, 1280, 1920] as const;
export type MediaWidth = (typeof MEDIA_WIDTHS)[number];

/** File types the media proxy serves; anything else is not a product image. */
const MEDIA_EXTENSIONS = /\.(jpe?g|png|webp|avif|gif)$/i;

/**
 * The storage path a `/media/*` request asks for, or null when it is not a
 * plain image path inside the public disk — no `..`, no empty segment, no
 * query tricks. Segments arrive decoded from the router.
 */
export function mediaStoragePath(segments: readonly string[]): string | null {
  if (segments.length === 0 || segments.length > 6) return null;

  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || segment.length > 200) return null;
    if (/[\\/\u0000-\u001f?#]/.test(segment)) return null;
  }

  if (!MEDIA_EXTENSIONS.test(segments[segments.length - 1])) return null;

  return `${MEDIA_SOURCE_PATH}/${segments.map(encodeURIComponent).join("/")}`;
}

/** The nearest allowed width at or above the one asked for, or null for the original. */
export function mediaWidth(requested: string | null): MediaWidth | null {
  const value = Number(requested);
  if (!requested || !Number.isFinite(value) || value <= 0) return null;
  return MEDIA_WIDTHS.find((width) => width >= value) ?? MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1];
}

/**
 * A media URL on this origin, resized for the canvas. Non-media URLs (a room
 * photograph, a blob) are returned untouched.
 */
export function mediaTexturePath(url: string, width: MediaWidth): string {
  const path = mediaProxyPath(url);
  if (!path.startsWith(`${MEDIA_PROXY_PREFIX}/`)) return path;
  return `${path.split("?")[0]}?w=${width}`;
}
