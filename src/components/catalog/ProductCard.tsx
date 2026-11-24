"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Package, Sparkles, Star } from "lucide-react";
import { naira, whatsAppLink } from "@/lib/format";
import { orderEnquiry, WHATSAPP_NUMBER } from "@/lib/site-contact";
import { absoluteUrl } from "@/lib/structured-data";
import type { AttributeTerm, ProductCard as ProductCardData } from "@/lib/api/types";
import { isFloorCategory, toTextureChoices } from "@/lib/room/materials";
import { Swatch } from "./Swatch";
import WhatsAppIcon from "./WhatsAppIcon";
import { cn } from "@/lib/utils";

/** Fetched the first time anyone asks for a sample from a card. */
const LeadDialog = dynamic(
  () => import("@/components/visualizer/LeadDialog").then((module) => module.LeadDialog),
  { ssr: false },
);

/**
 * The product card used by listings, search and recommendations.
 *
 * A client component because picking a colour swaps the photograph and the
 * price in place — the expectation a shopper brings from any modern store, and
 * far quicker than opening each product to compare finishes (§7).
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardData;
  /** Set on above-the-fold cards so the LCP image is not lazy-loaded. */
  priority?: boolean;
  className?: string;
}) {
  const terms = product.swatch_preview.terms;
  const [selected, setSelected] = useState<AttributeTerm | null>(null);
  // A colour under the pointer previews without being chosen.
  const [hovered, setHovered] = useState<AttributeTerm | null>(null);
  const [isSampleOpen, setIsSampleOpen] = useState(false);
  const shown = hovered ?? selected;

  const href = `/product/${product.slug}`;
  const image = shown?.preview_image_url ?? product.image_url;
  const isFloor = [product.name, product.category?.name ?? ""].every(isFloorCategory);
  // Set per product in the admin.
  const offersSample = isFloor && product.samples_enabled === true;
  const roomHref = `/visualizer?product=${product.slug}`;
  // The sample is of the colour on show, so the card and the parcel agree.
  const sample = useMemo(() => {
    if (!isSampleOpen) return null;
    const choices = toTextureChoices(product);
    return choices.find((choice) => choice.variantName === selected?.label) ?? choices[0] ?? null;
  }, [isSampleOpen, product, selected]);
  const price = selected?.preview_price ?? product.price_from;
  const compareAtPrice = selected
    ? (selected.preview_compare_at_price ?? null)
    : product.compare_at_price;
  const isOnSale = compareAtPrice !== null && price !== null && compareAtPrice > price;
  const savedPercentage = isOnSale ? Math.round((1 - price / compareAtPrice) * 100) : null;
  const showFromPrice = product.has_price_range && selected === null;
  const badge = badgeFor(product, savedPercentage);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-luxe",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Link href={href} className="absolute inset-0" aria-label={product.name}>
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              priority={priority}
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="grid h-full place-items-center text-xs text-muted-foreground">
              Image coming soon
            </span>
          )}
        </Link>

        {badge && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-charcoal-dark/90 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-light backdrop-blur-sm">
            {badge}
          </span>
        )}

        {/* On a pointer device the room is one hover away. */}
        {isFloor && (
          <Link
            href={roomHref}
            className="absolute inset-x-3 bottom-3 hidden translate-y-2 items-center justify-center gap-1.5 rounded-full bg-background/95 py-2 text-xs font-semibold opacity-0 shadow-luxe backdrop-blur transition duration-300 focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:hover)]:flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
            See in my room
          </Link>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {product.category?.name ?? product.brand?.name ?? "Flooring"}
          </span>

          {product.rating.count > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px]">
              <Star className="h-3 w-3 fill-gold text-gold" aria-hidden />
              {product.rating.average.toFixed(1)}
              <span className="sr-only">out of 5 from {product.rating.count} reviews</span>
            </span>
          )}
        </div>

        {/* Imported titles run past 200 characters; two lines is the most a
            card can carry before the grid stops being scannable. */}
        <h3 className="mt-2 min-h-[2.75rem] font-display text-[15px] leading-snug tracking-tight">
          <Link href={href} className="line-clamp-2 transition hover:text-gold">
            {product.name}
          </Link>
        </h3>

        {terms.length > 0 && (
          <SwatchRow
            terms={terms}
            total={product.swatch_preview.total}
            selected={selected}
            shown={shown}
            onSelect={setSelected}
            onPreview={setHovered}
            optionName={product.swatch_preview.option ?? "Finish"}
            productName={product.name}
          />
        )}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {showFromPrice && <span className="text-xs text-muted-foreground">from</span>}
            <span className="font-mono text-xl font-semibold">{naira(price)}</span>

            {isOnSale && (
              <>
                <span className="font-mono text-sm text-muted-foreground line-through">
                  {naira(compareAtPrice)}
                </span>
                <span className="sr-only">
                  reduced from {naira(compareAtPrice)}, saving {savedPercentage}%
                </span>
              </>
            )}
          </div>

          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {product.default_variant?.pricing.unit_label ?? "per m²"}
            {selected && !selected.is_orderable
              ? " · Made to order"
              : product.default_variant
                ? ` · ${product.default_variant.availability.label}`
                : ""}
          </p>

          <div
            className={cn(
              "mt-3 grid gap-2",
              isFloor ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]",
            )}
          >
            {offersSample ? (
              <button
                type="button"
                onClick={() => setIsSampleOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-charcoal px-3 font-display text-[13px] font-semibold text-primary-foreground transition hover:bg-charcoal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
              >
                <Package className="h-3.5 w-3.5" aria-hidden />
                Order sample
              </button>
            ) : (
              <Link
                href={href}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-foreground/15 px-4 font-display text-[13px] font-semibold transition group-hover:border-charcoal group-hover:bg-charcoal group-hover:text-primary-foreground"
              >
                View details
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}

            {isFloor && (
              <Link
                href={roomHref}
                aria-label={`See ${product.name} in a room`}
                title="See in my room"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground transition hover:border-gold hover:bg-gold/10"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
              </Link>
            )}

            <a
              href={whatsAppLink(
                WHATSAPP_NUMBER,
                orderEnquiry({
                  productName: product.name,
                  variantName: selected?.label,
                  url: absoluteUrl(href),
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Order ${product.name} on WhatsApp`}
              title="Order on WhatsApp"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-[#1DAA53] transition hover:border-[#25D366] hover:bg-[#25D366] hover:text-white"
            >
              <WhatsAppIcon className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </div>

      {isSampleOpen && sample && (
        <LeadDialog
          kind="sample"
          open={isSampleOpen}
          onOpenChange={setIsSampleOpen}
          material={sample}
          areaSqm={null}
          render={noRender}
          shareUrl={null}
          designNote=""
        />
      )}
    </article>
  );
}

function noRender(): Promise<Blob | null> {
  return Promise.resolve(null);
}

/**
 * Colour and material choices. Selecting one previews that finish on the card
 * rather than navigating, so finishes can be compared without leaving the grid.
 */
function SwatchRow({
  terms,
  total,
  selected,
  shown,
  onSelect,
  onPreview,
  optionName,
  productName,
}: {
  terms: AttributeTerm[];
  total: number;
  selected: AttributeTerm | null;
  /** The colour on the card now: hovered, or else selected. */
  shown: AttributeTerm | null;
  onSelect: (term: AttributeTerm | null) => void;
  onPreview: (term: AttributeTerm | null) => void;
  optionName: string;
  productName: string;
}) {
  const remaining = total - terms.length;

  return (
    <div className="mt-3">
      <div
        role="radiogroup"
        aria-label={`${optionName} for ${productName}`}
        className="flex items-center gap-1.5"
      >
        {terms.map((term) => {
          const isSelected = selected?.id === term.id;

          return (
            <button
              key={term.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={term.label}
              title={term.label}
              onClick={() => onSelect(isSelected ? null : term)}
              onPointerEnter={(event) => event.pointerType === "mouse" && onPreview(term)}
              onPointerLeave={() => onPreview(null)}
              className={cn(
                "rounded-full p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                isSelected ? "ring-2 ring-gold" : "hover:ring-1 hover:ring-border",
              )}
            >
              <Swatch term={term} size="sm" className="rounded-full" />
            </button>
          );
        })}

        {remaining > 0 && (
          <span className="ml-0.5 font-mono text-[10px] text-muted-foreground">+{remaining}</span>
        )}
      </div>

      <p className="mt-1.5 h-4 truncate text-[11px] text-muted-foreground" aria-live="polite">
        {shown ? shown.label : `${total} ${total === 1 ? "finish" : "finishes"}`}
      </p>
    </div>
  );
}

/**
 * A discount is worth naming precisely; everything else is a soft signal.
 */
function badgeFor(product: ProductCardData, savedPercentage: number | null): string | null {
  if (savedPercentage !== null && savedPercentage > 0) return `Save ${savedPercentage}%`;
  if (product.is_on_sale) return "On offer";
  if (product.is_featured) return "Bestseller";
  if (product.default_variant?.availability.status === "made_to_order") return "Made to order";
  return null;
}

/**
 * Matching skeleton so a streaming grid does not shift layout.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-3 w-24 animate-pulse bg-muted" />
        <div className="h-4 w-full animate-pulse bg-muted" />
        <div className="h-4 w-2/3 animate-pulse bg-muted" />
        <div className="mt-auto h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
