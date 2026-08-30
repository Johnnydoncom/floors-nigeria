import type { ProductCard } from "@/lib/api/types";
import type { TextureChoice } from "@/lib/visualizer/types";

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

  const base = {
    productSlug: product.slug,
    productName: product.name,
    // Card payloads carry the default variation, which is where plank size and
    // pack coverage come from; a per-term variation would need the detail
    // endpoint, and the two rarely differ in dimensions.
    variant: product.default_variant ?? null,
    wastePercentage: product.waste_percentage,
  };

  const terms = product.swatch_preview.terms.filter((term) => term.preview_image_url);

  if (terms.length === 0) {
    return [
      {
        ...base,
        variantId: product.default_variant?.id ?? null,
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
