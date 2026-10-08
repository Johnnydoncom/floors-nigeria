"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, MessageCircle, Package, ShoppingBag, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { useCart } from "@/lib/cart";
import { naira, number, whatsAppLink } from "@/lib/format";
import { orderEnquiry, WHATSAPP_NUMBER } from "@/lib/site-contact";
import type { TextureChoice } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";
import { AreaEstimator } from "./AreaEstimator";

/** Area added to the quote list when the visitor has not measured, as on the product page. */
const DEFAULT_QUANTITY_SQM = 20;

/**
 * The floor in the picture, as a product (§10): what it is, what it costs,
 * whether it can be had, and every next step — so the moment the room looks
 * right there is nothing to go and look up.
 */
export function MaterialDetails({
  material,
  isFavorite,
  onToggleFavorite,
  areaSqm,
  onAreaChange,
  onRequestQuote,
  onOrderSample,
  ar,
  pageUrl,
}: {
  material: TextureChoice;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  areaSqm: number | null;
  onAreaChange: (areaSqm: number | null) => void;
  onRequestQuote: () => void;
  onOrderSample: () => void;
  /** The "View in your room" control, which depends on the device. */
  ar: React.ReactNode;
  pageUrl: string;
}) {
  const cart = useCart();
  const variant = material.variant;
  const dimensions = variant?.dimensions;
  const isOrderable = material.availability?.isOrderable ?? true;
  const sku =
    material.variantId && variant?.id === material.variantId ? variant.sku : material.skuFamily;

  const specs = [
    sku ? { label: "SKU", value: sku } : null,
    dimensions?.length_mm && dimensions.width_mm
      ? {
          label: "Size",
          value: `${number(dimensions.length_mm, 0)} × ${number(dimensions.width_mm, 0)}${dimensions.thickness_mm ? ` × ${number(dimensions.thickness_mm, 1)}` : ""} mm`,
        }
      : dimensions?.label
        ? { label: "Size", value: dimensions.label }
        : null,
    dimensions?.wear_layer_mm
      ? { label: "Wear layer", value: `${number(dimensions.wear_layer_mm, 2)} mm` }
      : null,
    variant?.packaging.coverage_per_pack_sqm
      ? {
          label: "Pack",
          value: `${number(variant.packaging.coverage_per_pack_sqm)} m²${variant.packaging.pieces_per_pack ? ` · ${variant.packaging.pieces_per_pack} pieces` : ""}`,
        }
      : null,
  ].filter((spec): spec is { label: string; value: string } => spec !== null);

  const cta = (name: string) =>
    track("cta_clicked", { cta: name, product: material.productSlug, context: "visualizer" });

  const addToCart = () => {
    const quantity = Math.max(1, Math.ceil(areaSqm ?? DEFAULT_QUANTITY_SQM));

    cart.add({
      slug: material.productSlug,
      name: material.productName,
      img: material.imageUrl ?? material.swatchUrl ?? material.textureUrl,
      finish: material.variantName ?? variant?.name ?? "Standard",
      price: material.price ?? 0,
      qty: quantity,
    });

    cta("add_to_cart");
    toast.success(`${material.productName} added to your quote list`, {
      description: areaSqm
        ? `${quantity} m², from your room measurements.`
        : `${quantity} m² — adjust the quantity in your list, or measure your room first.`,
    });
  };

  return (
    <section aria-labelledby="material-name" className="rounded-lg border border-border p-4 sm:p-5">
      <div className="flex gap-4">
        <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
          <Image
            src={material.imageUrl ?? material.swatchUrl ?? material.textureUrl}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {[material.brandName, material.categoryName].filter(Boolean).join(" · ") ||
              "Floor Nigeria"}
          </p>
          <h2 id="material-name" className="mt-1 font-display text-lg leading-tight">
            {material.productName}
          </h2>
          {material.variantName && (
            <p className="text-sm text-muted-foreground">{material.variantName}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {material.price !== null && (
              <span className="font-mono text-base">
                {naira(material.price)}
                {material.priceUnit && (
                  <span className="text-xs text-muted-foreground"> / {material.priceUnit}</span>
                )}
              </span>
            )}
            {material.availability && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  material.availability.isOrderable
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {material.availability.label}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border transition hover:border-gold"
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-gold text-gold")} aria-hidden />
        </button>
      </div>

      {specs.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {specs.map((spec) => (
            <div key={spec.label}>
              <dt className="text-muted-foreground">{spec.label}</dt>
              <dd className="font-medium">{spec.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <AreaEstimator material={material} onAreaChange={onAreaChange} />
      </div>

      <div className="mt-5 grid gap-2">
        <Button className="h-11 w-full" disabled={!isOrderable} onClick={addToCart}>
          <ShoppingBag aria-hidden />
          {isOrderable ? "Add to quote list" : "Currently unavailable"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              cta("request_quote");
              onRequestQuote();
            }}
          >
            <FileText aria-hidden />
            Request quote
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              cta("order_sample");
              onOrderSample();
            }}
          >
            <Package aria-hidden />
            Order sample
          </Button>
        </div>
        {ar}
        <a
          href={whatsAppLink(
            WHATSAPP_NUMBER,
            orderEnquiry({
              productName: material.productName,
              variantName: material.variantName,
              url: pageUrl,
            }),
          )}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => cta("whatsapp")}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border text-sm font-semibold text-[#128C7E] transition hover:border-[#25D366] hover:bg-[#25D366]/10 dark:text-[#25D366]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Ask a consultant on WhatsApp
        </a>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Button asChild variant="ghost" className="h-10">
            <Link href={`/products/${material.productSlug}`} onClick={() => cta("view_product")}>
              View product
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-10">
            <Link href="/contact#showrooms" onClick={() => cta("find_showroom")}>
              <MapPin aria-hidden />
              Find a showroom
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
