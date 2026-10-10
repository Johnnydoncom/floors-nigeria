"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Loader2,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { CartLineImage } from "@/components/site/CartLineImage";
import { QuantityStepper } from "@/components/commerce/QuantityStepper";
import { useCart, unitSymbol } from "@/lib/cart";
import { useCartSummary } from "@/lib/commerce/use-cart-summary";
import { naira, number } from "@/lib/format";

/**
 * The cart's lines and totals, priced by the server as they change. A client
 * island because the cart lives in the browser; the page around it is a
 * Server Component.
 */
export function CartView() {
  const cart = useCart();
  const { summary, config, error, loading } = useCartSummary();
  const lines = new Map(summary?.lines.map((line) => [line.variant_id, line]) ?? []);
  const blocked = summary ? !summary.is_purchasable : true;
  const checkoutOff = config !== null && !config.enabled;

  if (!cart.ready) {
    return <div className="mt-10 h-64 animate-pulse rounded-xl bg-muted" aria-hidden />;
  }

  if (cart.items.length === 0) {
    return (
      <div className="mt-14 rounded-xl border border-border p-8 text-center md:p-14">
        <p className="font-display text-xl">Your cart is empty.</p>
        <p className="mt-2 text-muted-foreground">
          Choose a floor, set the area you need and add it here.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/products" className="btn btn-primary">
            Browse floors <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/calculator" className="btn btn-outline">
            Measure a room first
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-12">
      <div className="lg:col-span-8">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <ul className="overflow-hidden rounded-xl border border-border">
          {cart.items.map((item) => {
            const priced = lines.get(item.variantId);
            const lineTotal = priced?.line_total ?? item.price * item.qty;

            return (
              <li
                key={item.variantId}
                className="flex flex-col gap-5 border-b border-border p-5 last:border-0 sm:flex-row"
              >
                <Link href={`/product/${item.slug}`} className="shrink-0">
                  <CartLineImage
                    src={priced?.image_url ?? item.img}
                    alt={item.name}
                    sizes="(min-width: 640px) 128px, 100vw"
                    className="h-28 w-full rounded-md sm:w-32"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${item.slug}`}
                        className="block truncate font-display text-xl hover:text-gold"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.variant}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {naira(priced?.unit_price ?? item.price)} {item.unitLabel}
                        {item.sku ? ` · SKU ${item.sku}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.remove(item.variantId)}
                      aria-label={`Remove ${item.name} — ${item.variant}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border transition hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>

                  {priced?.issue && (
                    <p className="mt-3 flex items-start gap-2 rounded-md bg-orange-500/10 px-3 py-2 text-sm text-orange-800 dark:text-orange-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      {priced.issue}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <QuantityStepper
                      value={item.qty}
                      unit={item.unit}
                      label={`${item.name} — ${item.variant}`}
                      onChange={(qty) => cart.setQty(item.variantId, qty)}
                    />
                    <span className="font-mono text-lg">{naira(lineTotal)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={cart.clear}
          className="mt-3 text-sm text-muted-foreground underline-offset-4 transition hover:text-destructive hover:underline"
        >
          Empty cart
        </button>
      </div>

      <aside className="rounded-xl border border-border bg-surface p-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:col-span-4">
        <h2 className="flex items-center justify-between font-display text-2xl">
          Order summary
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Updating" />
          )}
        </h2>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Materials</dt>
            <dd className="font-mono">{naira(summary?.subtotal ?? cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="text-right font-mono">
              {summary && summary.delivery_fee === 0 ? "Free" : "Calculated at checkout"}
            </dd>
          </div>
          {config && config.vat_rate > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">VAT ({number(config.vat_rate)}%)</dt>
              <dd className="font-mono">Added at checkout</dd>
            </div>
          )}
        </dl>

        {checkoutOff ? (
          <>
            <p className="mt-6 rounded-md bg-background p-3 text-sm text-muted-foreground">
              Online payment isn&apos;t available right now. Send us your list and a consultant will
              confirm prices, delivery and installation.
            </p>
            <Link href="/contact?enquiry=quote" className="btn btn-primary mt-4 w-full">
              <FileText className="h-4 w-4" aria-hidden /> Request a quote
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/checkout"
              aria-disabled={blocked}
              tabIndex={blocked ? -1 : undefined}
              className={`btn btn-primary mt-6 w-full ${blocked ? "pointer-events-none opacity-50" : ""}`}
            >
              Proceed to checkout <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            {summary && !summary.is_purchasable && (
              <p className="mt-2 text-xs text-muted-foreground">
                Remove or adjust the highlighted items to continue.
              </p>
            )}
            <Link
              href="/contact?enquiry=quote"
              className="mt-3 block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Prefer a formal quotation? Request one
            </Link>
          </>
        )}

        <div className="mt-6 space-y-3 border-t border-border pt-5 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-gold" aria-hidden /> Secure payment by
            card, transfer or USSD
          </p>
          {config && config.free_delivery_threshold > 0 && (
            <p className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-gold" aria-hidden /> Free delivery on
              materials over {naira(config.free_delivery_threshold)}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

/** "20 m²", "3 packs" — a quantity with its unit. */
export function quantityLabel(quantity: number, unit: string): string {
  return `${number(quantity)} ${unitSymbol(unit)}`;
}
