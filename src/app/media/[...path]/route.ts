import { mediaOrigin, mediaStoragePath, mediaWidth } from "@/lib/api/media";

/**
 * Product images on this origin, for the room visualizer (see `lib/api/media.ts`).
 *
 * Fetched from the media host the way the storefront's API client fetches —
 * server to server, no forwarded browser headers — then, when `?w=` asks for
 * it, resized to a WebP that is a texture's size rather than a photograph's.
 * The answer is cached at the CDN for a year: a media file's path changes when
 * its content does, so the first visitor's request is the only one that runs.
 */

const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

const CACHED = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "CDN-Cache-Control": "public, max-age=31536000, immutable",
};

/** A miss is cached briefly, so a broken image does not reach the host on every view. */
const MISS = { "Cache-Control": "public, max-age=60, s-maxage=600" };

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const storagePath = mediaStoragePath(path);

  if (!storagePath) return new Response(null, { status: 404, headers: MISS });

  const width = mediaWidth(new URL(request.url).searchParams.get("w"));

  let upstream: Response;

  try {
    upstream = await fetch(`${mediaOrigin()}${storagePath}`, {
      headers: {
        Accept: "image/avif,image/webp,image/*;q=0.8",
        "User-Agent": "FloorsNG-Storefront/1.0",
        ...(process.env.STOREFRONT_API_KEY
          ? { "X-Storefront-Key": process.env.STOREFRONT_API_KEY }
          : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return new Response(null, { status: 504, headers: MISS });
  }

  const type = upstream.headers.get("content-type") ?? "";

  if (!upstream.ok || !type.startsWith("image/")) {
    return new Response(null, { status: upstream.status === 404 ? 404 : 502, headers: MISS });
  }

  const source = Buffer.from(await upstream.arrayBuffer());

  if (source.byteLength > MAX_SOURCE_BYTES) {
    return new Response(null, { status: 413, headers: MISS });
  }

  if (width && !type.includes("gif")) {
    const resized = await resize(source, width);
    if (resized) {
      return new Response(new Uint8Array(resized), {
        headers: { ...CACHED, "Content-Type": "image/webp", Vary: "Accept" },
      });
    }
  }

  return new Response(new Uint8Array(source), { headers: { ...CACHED, "Content-Type": type } });
}

/** A WebP no wider than `width`, or null when the image cannot be decoded here. */
async function resize(source: Buffer, width: number): Promise<Buffer | null> {
  try {
    const { default: sharp } = await import("sharp");
    return await sharp(source, { failOn: "none" })
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch {
    return null;
  }
}
