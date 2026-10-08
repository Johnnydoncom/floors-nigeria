import type { Category, Product, ProductCard, Variant } from "@/lib/api/types";
import type { MaterialKind, TextureChoice } from "@/lib/visualizer/types";

/**
 * The catalogue, as materials the visualizer and the room designer can lay.
 *
 * A product becomes one entry per colour or décor it comes in, so switching
 * finish in either tool is the same act as switching it on the product page.
 * Shared by both so a material means the same thing wherever it is offered.
 */
export function toTextureChoices(product: ProductCard): TextureChoice[] {
  const texture = product.visualizer_texture_url ?? product.image_url;

  if (!texture) return [];

  const variant = product.default_variant ?? null;

  const base = {
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    // Card payloads carry the default variation, which is where plank size and
    // pack coverage come from; a per-term variation would need the detail
    // endpoint, and the two rarely differ in dimensions.
    variant,
    wastePercentage: product.waste_percentage,
    kind: materialKind(product, variant),
    isSeamless: product.visualizer_texture_is_dedicated ?? false,
    imageUrl: product.image_url,
    brandName: product.brand?.name ?? null,
    categoryName: product.category?.name ?? null,
    skuFamily: product.sku_family,
    priceUnit: variant?.pricing.unit_label ?? null,
    availability: variant
      ? {
          status: variant.availability.status,
          label: variant.availability.label,
          isOrderable: variant.availability.is_orderable,
        }
      : null,
  };

  const terms = product.swatch_preview.terms.filter((term) => term.preview_image_url);

  if (terms.length === 0) {
    return [
      {
        ...base,
        variantId: variant?.id ?? null,
        variantName: null,
        textureUrl: texture,
        swatchUrl: product.thumb_url,
        price: product.price_from,
      },
    ];
  }

  return terms.map((term) => ({
    ...base,
    variantId: null,
    variantName: term.label,
    textureUrl: term.preview_image_url ?? texture,
    swatchUrl: term.image_url ?? term.preview_image_url ?? product.thumb_url,
    price: term.preview_price ?? product.price_from,
  }));
}

/**
 * A product's materials with one variation picked out — for a link that names
 * a SKU, such as "See it in your room" on a product page.
 *
 * The detail payload carries every variation, so the chosen one replaces the
 * card's default: its own texture, price and plank size.
 */
export function choicesForProduct(
  product: Product,
  sku?: string | null,
): { choices: TextureChoice[]; selected: number } {
  const choices = toTextureChoices(product);
  const variant = sku ? product.variants.find((candidate) => candidate.sku === sku) : undefined;

  if (!variant) return { choices, selected: 0 };

  const labels = new Set(variant.options.map((option) => option.label));
  const index = choices.findIndex((choice) => choice.variantName && labels.has(choice.variantName));
  const exact = withVariant(choices[Math.max(index, 0)], variant, product.waste_percentage);

  if (!exact) return { choices, selected: 0 };

  const next = [...choices];
  next[Math.max(index, 0)] = exact;

  return { choices: next, selected: Math.max(index, 0) };
}

function withVariant(
  choice: TextureChoice | undefined,
  variant: Variant,
  wastePercentage: number,
): TextureChoice | null {
  if (!choice) return null;

  return {
    ...choice,
    variantId: variant.id,
    variantName: choice.variantName ?? variant.name,
    variant,
    wastePercentage,
    textureUrl: variant.visualizer_texture_url ?? choice.textureUrl,
    isSeamless: variant.visualizer_texture_is_dedicated ?? choice.isSeamless,
    price: variant.pricing.effective_price ?? choice.price,
    priceUnit: variant.pricing.unit_label,
    kind: materialKind(null, variant, choice.kind),
    availability: {
      status: variant.availability.status,
      label: variant.availability.label,
      isOrderable: variant.availability.is_orderable,
    },
  };
}

/** Category words that say what a floor is, most specific first. */
const KIND_WORDS: [MaterialKind, RegExp][] = [
  ["rug", /\b(rugs?|runners?|mats?)\b/],
  ["carpet", /\b(carpets?|carpeting|broadloom|grass|turf)\b/],
  [
    "tile",
    /\b(tiles?|porcelain|ceramic|marble|granite|stone|terrazzo|travertine|slate|epoxy|rubber)\b/,
  ],
  [
    "plank",
    /\b(wood|wooden|timber|laminate|vinyl|spc|lvp|lvt|wpc|parquet|engineered|bamboo|plank|herringbone)\b/,
  ],
];

/**
 * What sort of floor a product is.
 *
 * Read from its category names first — the catalogue is organised by exactly
 * this — and from the shape of its pieces when the categories do not say: a
 * long narrow piece is a plank, a squarish one a tile.
 */
export function materialKind(
  product: Pick<ProductCard, "category" | "categories" | "name"> | null,
  variant?: Variant | null,
  fallback: MaterialKind = "plank",
): MaterialKind {
  if (product) {
    const names = [product.category, ...(product.categories ?? [])]
      .filter((category): category is Category => Boolean(category))
      .map((category) => `${category.name} ${category.slug.replace(/-/g, " ")}`)
      .join(" ")
      .toLowerCase();

    for (const [kind, pattern] of KIND_WORDS) {
      if (pattern.test(names)) return kind;
    }
  }

  const length = variant?.dimensions.length_mm ?? null;
  const width = variant?.dimensions.width_mm ?? null;

  if (length && width) {
    const ratio = Math.max(length, width) / Math.min(length, width);
    return ratio >= 2 ? "plank" : "tile";
  }

  if (product) {
    for (const [kind, pattern] of KIND_WORDS) {
      if (pattern.test(product.name.toLowerCase())) return kind;
    }
  }

  return fallback;
}

/**
 * The material a saved design was made with: the product's materials, with the
 * saved variation's own data laid over the one it belongs to.
 */
export function choiceForVariant(
  product: ProductCard,
  variant: Variant | null | undefined,
): TextureChoice | null {
  const choices = toTextureChoices(product);

  if (!variant) return choices[0] ?? null;

  const labels = new Set(variant.options.map((option) => option.label));
  const index = choices.findIndex((choice) => choice.variantName && labels.has(choice.variantName));

  return withVariant(choices[Math.max(index, 0)], variant, product.waste_percentage);
}
