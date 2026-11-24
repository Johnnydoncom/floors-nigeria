import "server-only";
import { getProducts } from "@/lib/api/catalog";
import { naira } from "@/lib/format";

/**
 * "From ₦14,999 per m²": the cheapest priced product in the categories (their
 * subcategories included), or null when none has a price.
 */
export async function fromPrice(categories: string[]): Promise<string | null> {
  // Price-on-request products sort first, so look a little further than one.
  const { data } = await getProducts({ categories, sort: "price_asc", per_page: 8 });
  const product = data.find((item) => typeof item.price_from === "number" && item.price_from > 0);
  if (!product || product.price_from === null) return null;
  const unit = product.default_variant?.pricing.unit_label?.trim() || "m²";
  return `From ${naira(product.price_from)} ${unit.startsWith("per ") ? unit : `per ${unit}`}`;
}
