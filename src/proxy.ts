import { NextResponse, type NextRequest } from "next/server";
import { soleCategoryRefinement } from "@/lib/catalog-filters";

/**
 * Consolidates legacy catalogue URLs onto their canonical paths.
 *
 * `/products?categories=accessories` predates the category landing pages and
 * serves the same products under a second URL. Redirecting here — before any
 * rendering — returns a real 308 and passes the link equity on; doing it inside
 * the page is too late, because Partial Prerendering has already sent the
 * static shell with a 200 (§18).
 */
export function proxy(request: NextRequest): NextResponse {
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
  matcher: "/products",
};
