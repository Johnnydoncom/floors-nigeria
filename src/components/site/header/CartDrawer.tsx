"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/format";

/**
 * The quote list drawer.
 *
 * Flooring is quoted, not checked out, so this reads as a shortlist a
 * consultant will price — not a shopping basket (§13).
 */
export function CartDrawer() {
  const cart = useCart();

  if (!cart.open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal aria-label="Your quote list">
      <button
        className="absolute inset-0 bg-charcoal-dark/50"
        aria-label="Close quote list"
        onClick={() => cart.setOpen(false)}
      />

      <aside className="absolute right-0 top-0 flex h-full w-[min(28rem,94vw)] flex-col bg-background shadow-elevated">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <h2 className="font-display text-lg">Your quote list ({cart.count})</h2>
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
              <div
                key={`${item.slug}-${item.finish}`}
                className="flex gap-4 border-b border-border p-5"
              >
                {item.img ? (
                  // eslint-disable-next-line @next/next/no-img-element -- cart items store a plain URL string
                  <img src={item.img} alt="" className="h-20 w-20 object-cover" />
                ) : (
                  <span className="h-20 w-20 bg-muted" aria-hidden />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <span className="truncate font-medium">{item.name}</span>
                    <button
                      onClick={() => cart.remove(item.slug, item.finish)}
                      aria-label={`Remove ${item.name}`}
                      className="text-muted-foreground transition hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.finish}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex h-9 items-center border border-border">
                      <button
                        onClick={() => cart.setQty(item.slug, item.finish, item.qty - 5)}
                        aria-label="Decrease area by 5 square metres"
                        className="grid h-full w-9 place-items-center transition hover:text-gold"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <span className="w-14 text-center font-mono text-sm">{item.qty} m²</span>
                      <button
                        onClick={() => cart.setQty(item.slug, item.finish, item.qty + 5)}
                        aria-label="Increase area by 5 square metres"
                        className="grid h-full w-9 place-items-center transition hover:text-gold"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
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
              <span className="text-sm text-muted-foreground">Estimated materials</span>
              <span className="font-mono text-lg">{naira(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Excludes installation, delivery and VAT. A consultant confirms the final price.
            </p>
            <Link
              href="/checkout"
              onClick={() => cart.setOpen(false)}
              className="mt-4 inline-flex h-12 w-full items-center justify-center bg-charcoal-dark text-sm font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-gold hover:text-charcoal-dark"
            >
              Request a quote
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
