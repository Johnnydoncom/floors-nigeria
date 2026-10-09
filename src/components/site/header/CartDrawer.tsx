"use client";

import { CartLineImage } from "@/components/site/CartLineImage";
import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { QuantityStepper } from "@/components/commerce/QuantityStepper";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/format";

/**
 * The cart drawer: a quick look at what is in the cart, with the way on to
 * the full cart and checkout.
 */
export function CartDrawer() {
  const cart = useCart();

  if (!cart.open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal aria-label="Your cart">
      <button
        className="absolute inset-0 bg-charcoal-dark/50"
        aria-label="Close cart"
        onClick={() => cart.setOpen(false)}
      />

      <aside className="absolute right-0 top-0 flex h-full w-[min(28rem,94vw)] flex-col bg-background shadow-elevated">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <h2 className="font-display text-lg">Your cart ({cart.count})</h2>
          <button onClick={() => cart.setOpen(false)} aria-label="Close">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nothing here yet.
              <Link
                href="/products"
                onClick={() => cart.setOpen(false)}
                className="mt-4 block font-medium text-gold"
              >
                Browse the catalogue →
              </Link>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.variantId} className="flex gap-4 border-b border-border p-5">
                <CartLineImage
                  src={item.img}
                  alt=""
                  sizes="80px"
                  className="h-20 w-20 shrink-0 rounded-md"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={() => cart.setOpen(false)}
                      className="truncate font-medium hover:text-gold"
                    >
                      {item.name}
                    </Link>
                    <button
                      onClick={() => cart.remove(item.variantId)}
                      aria-label={`Remove ${item.name}`}
                      className="text-muted-foreground transition hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.variant}</p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <QuantityStepper
                      size="sm"
                      value={item.qty}
                      unit={item.unit}
                      label={item.name}
                      onChange={(qty) => cart.setQty(item.variantId, qty)}
                    />
                    <span className="font-mono text-sm">{naira(item.price * item.qty)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t border-border p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Materials</span>
              <span className="font-mono text-lg">{naira(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Delivery, installation and VAT are worked out at checkout.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/cart"
                onClick={() => cart.setOpen(false)}
                className="btn btn-outline w-full"
              >
                View cart
              </Link>
              <Link
                href="/checkout"
                onClick={() => cart.setOpen(false)}
                className="btn btn-primary w-full"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
