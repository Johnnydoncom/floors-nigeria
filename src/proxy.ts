import { NextResponse, type NextRequest } from "next/server";
import { soleCategoryRefinement } from "@/lib/catalog-filters";

/** Kept in step with `AUTH_COOKIE` in `lib/api/auth.ts` (server-only, so not importable here). */
const AUTH_COOKIE = "floorsng_token";

/** Account pages a signed-out visitor must be able to reach. */
const PUBLIC_ACCOUNT_PATHS = [
  "/account/login",
  "/account/register",
  "/account/forgot-password",
  "/account/reset-password",
  "/account/verify-email",
];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    return guardAccount(request);
  }

  return consolidateCatalogueUrl(request);
}

/**
 * An optimistic check: no session cookie means no account, so the visitor is
 * sent to sign in before anything renders — a real redirect, rather than the
 * client-side one a streamed page would have to fall back on. Whether the
 * token is still valid is checked against the API by the account layout.
 */
function guardAccount(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_ACCOUNT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublic || request.cookies.has(AUTH_COOKIE)) {
    return NextResponse.next();
  }

  const signIn = new URL("/account/login", request.url);
  if (pathname !== "/account") signIn.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(signIn);
}

/**
 * Consolidates legacy catalogue URLs onto their canonical paths.
 *
 * `/products?categories=accessories` predates the category landing pages and
 * serves the same products under a second URL. Redirecting here — before any
 * rendering — returns a real 308 and passes the link equity on; doing it inside
 * the page is too late, because Partial Prerendering has already sent the
 * static shell with a 200 (§18).
 */
function consolidateCatalogueUrl(request: NextRequest): NextResponse {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const category = soleCategoryRefinement(params);

  if (category) {
    const destination = new URL(`/categories/${category}`, request.url);

    // Keep pagination and sorting across the move.
    for (const key of ["page", "sort"]) {
      const value = request.nextUrl.searchParams.get(key);
      if (value) destination.searchParams.set(key, value);
    }

    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/products", "/account", "/account/:path*"],
};
