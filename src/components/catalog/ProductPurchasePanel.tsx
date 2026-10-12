"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calculator, Minus, Plus, Ruler, Sparkles, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart, unitSymbol } from "@/lib/cart";
import { naira, number } from "@/lib/format";
import type { Product } from "@/lib/api/types";
import { ProductGallery } from "./ProductGallery";
import { leadImage, productGallery } from "./gallery/items";
import { FavoriteButton } from "./FavoriteButton";
import { OptionPicker } from "./OptionPicker";
import { useVariantSelection } from "./useVariantSelection";
import { VisualizerQrButton } from "@/components/visualizer/VisualizerQrButton";

const MINIMUM_QUANTITY = 1;

/**
 * The interactive half of the product detail page (§9): gallery, option
 * picker, quantity, price transparency and the conversion CTAs.
 *
 * Everything static — description, specifications, documents, related products
 * — stays in the server component so this island stays small.
 */
export function ProductPurchasePanel({ product }: { product: Product }) {
  const { selection, selectedVariant, select, isTermAvailable } = useVariantSelection(product);
  const [quantity, setQuantity] = useState(20);
  const cart = useCart();

  const variant = selectedVariant;
  const media = useMemo(() => productGallery(product, variant), [product, variant]);
  const price = variant?.pricing.effective_price ?? product.price_from;
  const coverage = variant?.packaging.coverage_per_pack_sqm ?? null;
  const packs = coverage
    ? Math.ceil((quantity * (1 + product.waste_percentage / 100)) / coverage)
    : null;

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-7">
        {/* Keyed by variation: a new selection starts on its own lead photo. */}
        <ProductGallery
          key={variant?.id ?? "product"}
          items={media}
          title={product.name}
          badge={variant?.pricing.is_on_sale ? "On offer" : null}
        />
      </div>

      <div className="min-w-0 lg:col-span-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {product.brand?.name ?? product.category?.name}
          {variant && <span className="ml-2 text-foreground/60">SKU {variant.sku}</span>}
        </p>

        <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">{product.name}</h1>

        {product.short_description && (
          <p className="mt-3 text-muted-foreground">{product.short_description}</p>
        )}

        <div className="mt-6 flex items-baseline gap-3">
          <span className="font-mono text-3xl">{naira(price)}</span>
          {variant?.pricing.is_on_sale && variant.pricing.price !== null && (
            <span className="font-mono text-lg text-muted-foreground line-through">
              {naira(variant.pricing.price)}
            </span>
          )}
          {variant && (
            <span className="text-sm text-muted-foreground">{variant.pricing.unit_label}</span>
          )}
        </div>

        {variant && (
          <p className="mt-1 text-xs text-muted-foreground">
            {coverage
              ? `${number(coverage)} m² per pack · ${variant.packaging.pieces_per_pack ?? "—"} pieces`
              : "Sold per square metre"}
            {" · "}
            {variant.availability.label}
            {variant.availability.lead_time_days
              ? ` · ships in ~${variant.availability.lead_time_days} days`
              : ""}
          </p>
        )}

        {product.options.length > 0 && (
          <div className="mt-8">
            <OptionPicker
              options={product.options}
              selection={selection}
              onSelect={select}
              isTermAvailable={isTermAvailable}
            />
          </div>
        )}

        <div className="mt-8">
          <label
            htmlFor="quantity"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
          >
            Area required (m²)
          </label>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-12 items-center border border-border">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(MINIMUM_QUANTITY, current - 5))}
                className="grid h-full w-11 place-items-center transition hover:text-gold"
                aria-label="Decrease area by 5 square metres"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <input
                id="quantity"
                type="number"
                min={MINIMUM_QUANTITY}
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    Math.max(MINIMUM_QUANTITY, Number(event.target.value) || MINIMUM_QUANTITY),
                  )
                }
                className="h-full w-16 bg-transparent text-center font-mono outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((current) => current + 5)}
                className="grid h-full w-11 place-items-center transition hover:text-gold"
                aria-label="Increase area by 5 square metres"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {price !== null && (
              <div className="text-sm">
                <div className="font-mono text-lg">{naira(price * quantity)}</div>
                <div className="text-xs text-muted-foreground">
                  {packs !== null
                    ? `${packs} packs incl. ${number(product.waste_percentage)}% waste`
                    : "Excludes installation"}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Button
            size="lg"
            className="h-12 w-full rounded-none"
            disabled={!variant?.availability.is_orderable || !variant.pricing.effective_price}
            onClick={() => {
              if (!variant) return;
              cart.add({
                variantId: variant.id,
                slug: product.slug,
                name: product.name,
                variant: variant.name,
                sku: variant.sku,
                img: leadImage(media)?.url ?? product.image_url ?? "",
                unit: variant.pricing.unit,
                unitLabel: variant.pricing.unit_label,
                price: variant.pricing.effective_price ?? 0,
                qty: quantity,
              });
              toast.success(`${product.name} — ${variant.name} added to your cart`, {
                description: `${quantity} ${unitSymbol(variant.pricing.unit)}.`,
                action: { label: "View cart", onClick: () => cart.setOpen(true) },
              });
            }}
          >
            {!variant?.availability.is_orderable
              ? "Currently unavailable"
              : variant.pricing.effective_price
                ? "Add to cart"
                : "Price on request"}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex gap-2">
              <Button asChild variant="outline" className="h-12 min-w-0 flex-1 rounded-none">
                <Link
                  href={`/visualizer?product=${product.slug}${variant ? `&variant=${variant.sku}` : ""}`}
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  See it in your room
                </Link>
              </Button>
              <VisualizerQrButton
                productSlug={product.slug}
                productName={product.name}
                variantSku={variant?.sku}
              />
            </div>
            <Button asChild variant="outline" className="h-12 rounded-none">
              <Link
                href={`/calculator?product=${product.slug}${variant ? `&variant=${variant.sku}` : ""}`}
              >
                <Calculator className="h-4 w-4" aria-hidden />
                Calculate quantity
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="ghost" className="h-11 rounded-none">
              <Link href={`/contact?product=${product.slug}`}>
                <Ruler className="h-4 w-4" aria-hidden />
                Book a site survey
              </Link>
            </Button>
            <FavoriteButton
              productId={product.id}
              productSlug={product.slug}
              variantId={variant?.id}
            />
          </div>
        </div>

        <ul className="mt-8 space-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
          {product.warranty && (
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" aria-hidden />
              {product.warranty}
            </li>
          )}
          <li className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-gold" aria-hidden />
            Delivery and professional installation available nationwide
          </li>
        </ul>
      </div>
    </div>
  );
}
