import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { CacheTags, rawApiFetch } from "@/lib/api/client";
import { getClientIp, getToken } from "@/lib/api/auth";
import { rewriteMediaUrls } from "@/lib/api/media";

/**
 * The admin workspace's way to Laravel's `/v1/admin/*` from the browser.
 *
 * The bearer token lives in an HTTP-only cookie, so client components cannot
 * call Laravel directly; this handler attaches it server-side and passes the
 * request through. Laravel enforces every permission — this layer only
 * refuses cross-site writes and purges the storefront cache after catalogue
 * changes.
 */

type Params = { params: Promise<{ path: string[] }> };

const SEGMENT = /^[a-z0-9_-]{1,64}$/i;

/** First path segments whose writes change what the storefront shows. */
const CATALOGUE_PATHS = new Set([
  "products",
  "categories",
  "brands",
  "collections",
  "taxonomies",
  "attributes",
  "reviews",
  "media",
  "settings",
]);

/** First path segments whose writes change CMS pages, the journal or the portfolio. */
const CONTENT_PATHS = new Set(["pages", "posts", "portfolio", "media"]);

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;

async function forward(request: NextRequest, { params }: Params) {
  const method = request.method.toUpperCase();
  const { path } = await params;

  if (!path.every((segment) => SEGMENT.test(segment))) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  if (method !== "GET" && !isSameOrigin(request)) {
    return NextResponse.json({ message: "Cross-site requests are not allowed." }, { status: 403 });
  }

  const token = await getToken();

  if (!token) {
    return NextResponse.json(
      { message: "Your session has ended. Please sign in again." },
      { status: 401 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let body: BodyInit | undefined;
  const headers: Record<string, string> = {};

  if (method !== "GET" && method !== "DELETE") {
    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
    } else {
      body = await request.text();
      headers["Content-Type"] = "application/json";
    }
  }

  let upstream: Response;

  try {
    upstream = await rawApiFetch(`/v1/admin/${path.join("/")}${request.nextUrl.search}`, {
      method,
      body,
      headers,
      token,
      clientIp: await getClientIp(),
    });
  } catch (error) {
    console.error("[admin:proxy]", error);
    return NextResponse.json(
      { message: "The CRM is unavailable right now. Please try again." },
      { status: 502 },
    );
  }

  if (upstream.ok && method !== "GET" && CATALOGUE_PATHS.has(path[0])) {
    for (const tag of [
      CacheTags.catalog,
      CacheTags.categories,
      CacheTags.collections,
      CacheTags.taxonomies,
      CacheTags.filterOptions,
    ]) {
      revalidateTag(tag, "max");
    }
  }

  if (upstream.ok && method !== "GET" && CONTENT_PATHS.has(path[0])) {
    revalidateTag(CacheTags.content, "max");
  }

  const upstreamType = upstream.headers.get("content-type") ?? "";

  // Downloads (CSV exports, quote attachments) stream straight through.
  if (!upstreamType.includes("application/json")) {
    const passthrough = new Headers({ "Cache-Control": "private, no-store" });
    for (const name of ["content-type", "content-disposition", "content-length"]) {
      const value = upstream.headers.get(name);
      if (value) passthrough.set(name, value);
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers: passthrough });
  }

  const payload = await upstream
    .json()
    .catch(() => ({ message: "Unexpected response from the CRM." }));

  return NextResponse.json(rewriteMediaUrls(payload), {
    status: upstream.status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

/**
 * Browsers mark same-origin requests; anything else writing with the
 * workspace cookie is refused.
 */
function isSameOrigin(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");

  if (site && site !== "same-origin" && site !== "none") return false;

  const origin = request.headers.get("origin");

  return !origin || origin === request.nextUrl.origin;
}
