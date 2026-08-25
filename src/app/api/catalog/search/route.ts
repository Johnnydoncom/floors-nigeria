import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/api/catalog";

/**
 * Autocomplete proxy for the header search.
 *
 * Keeps the Laravel base URL server-side and lets the browser hit a same-origin
 * endpoint, so no CORS configuration or public API URL is required.
 */
export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (term.length < 2) {
    return NextResponse.json({
      data: { query: term, products: [], categories: [], collections: [] },
      meta: { total_products: 0, zero_results: true },
    });
  }

  try {
    return NextResponse.json(await searchCatalog(term));
  } catch {
    return NextResponse.json({ message: "Search is unavailable right now." }, { status: 502 });
  }
}
