import { NextResponse, type NextRequest } from "next/server";
import { getProduct, getProducts, type ProductFilters } from "@/lib/api/catalog";
import { choicesForProduct, toTextureChoices } from "@/lib/room/materials";

/**
 * The catalogue as visualizer materials, for browsing inside the studio.
 *
 * The page ships the most popular materials for an instant first render; this
 * serves everything else — search, filters, further pages, and the exact
 * variation a product page links to — through the same cached catalogue reads
 * the storefront uses, so a material here is always the product for sale.
 *
 * `?product=slug&variant=sku` returns that product's materials with the
 * variation picked out; otherwise the query is a catalogue filter.
 */

const PER_PAGE = 24;
const SORTS = new Set(["popular", "newest", "price_asc", "price_desc", "rating", "name"]);
const SLUG = /^[a-z0-9-]{1,120}$/i;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const productSlug = params.get("product");

  try {
    if (productSlug) {
      if (!SLUG.test(productSlug)) {
        return NextResponse.json({ message: "Unknown product." }, { status: 400 });
      }

      const product = await getProduct(productSlug);

      if (!product) return NextResponse.json({ message: "Unknown product." }, { status: 404 });

      const { choices, selected } = choicesForProduct(product, params.get("variant"));

      return NextResponse.json({ data: choices, selected });
    }

    const page = await getProducts(filtersFrom(params));

    return NextResponse.json({
      data: page.data.flatMap(toTextureChoices),
      meta: {
        current_page: page.meta.current_page,
        last_page: page.meta.last_page,
        total: page.meta.total,
      },
    });
  } catch (error) {
    console.error("[catalog:materials]", error);
    return NextResponse.json(
      { message: "The catalogue is unavailable right now." },
      { status: 502 },
    );
  }
}

function filtersFrom(params: URLSearchParams): ProductFilters {
  const list = (key: string) =>
    params
      .getAll(key)
      .flatMap((value) => value.split(","))
      .filter((value) => SLUG.test(value))
      .slice(0, 12);

  const number = (key: string) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };

  // Attribute filters arrive as `attr.<attribute>=<term>`, e.g. attr.colour=oak.
  const attributes: Record<string, string[]> = {};

  for (const key of new Set(params.keys())) {
    const match = /^attr\.([a-z0-9-]{1,60})$/i.exec(key);
    if (!match) continue;
    const terms = list(key);
    if (terms.length) attributes[match[1]] = terms;
  }

  const sort = params.get("sort") ?? "popular";
  const q = params.get("q")?.trim().slice(0, 100);

  return {
    q: q || undefined,
    categories: list("category"),
    brands: list("brand"),
    attributes: Object.keys(attributes).length ? attributes : undefined,
    min_price: number("min_price"),
    max_price: number("max_price"),
    sort: SORTS.has(sort) ? sort : "popular",
    page: Math.min(200, Math.max(1, Math.floor(number("page") ?? 1))),
    per_page: PER_PAGE,
  };
}
