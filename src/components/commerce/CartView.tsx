"use client";

import Image from "next/image";
import { CartLineImage } from "@/components/site/CartLineImage";
import Link from "next/link";
import { Minus, Plus, Trash2, ShieldCheck, Truck, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart";
import { PRODUCTS } from "@/lib/catalog";
import { naira } from "@/lib/format";

/**
 * The cart's lines and totals. A client island because it reads the cart
 * held in the browser; the page around it is a Server Component.
 */
export function CartView() {
  const cart = useCart();
  const vat = cart.subtotal * 0.075;
  const delivery = cart.subtotal > 500000 || cart.subtotal === 0 ? 0 : 45000;
  const total = cart.subtotal + vat + delivery;

  return (
    <>
      {cart.items.length === 0 ? (
        <div className="mt-14 rounded-xl border border-border p-8 text-center md:p-14">
          <p className="text-muted-foreground">Your cart is empty. Start with a bestseller.</p>
          <div className="mt-8 grid sm:grid-cols-3 gap-5 text-left">
            {PRODUCTS.slice(0, 3).map((p) => (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className="group overflow-hidden rounded-lg border border-border transition hover:border-gold"
              >
                <span className="relative block aspect-[4/3] w-full overflow-hidden bg-muted">
                  <Image
                    src={p.img}
                    alt={p.name}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover"
                  />
                </span>
                <div className="p-4">
                  <div className="font-display text-lg">{p.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{naira(p.price)}/m²</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-10 grid lg:grid-cols-12 gap-10 items-start">
          <div className="overflow-hidden rounded-xl border border-border lg:col-span-8">
            {cart.items.map((i) => (
              <div
                key={i.slug + i.finish}
                className="flex flex-col sm:flex-row gap-5 p-5 border-b border-border last:border-0"
              >
                <CartLineImage
                  src={i.img}
                  alt={i.name}
                  sizes="(min-width: 640px) 128px, 100vw"
                  className="h-28 w-full shrink-0 sm:w-32"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-display text-xl truncate">{i.name}</div>
                      <div className="text-sm text-muted-foreground">Finish: {i.finish}</div>
                      <div className="font-mono text-xs text-muted-foreground mt-1">
                        {naira(i.price)} / m²
                      </div>
                    </div>
                    <button
                      onClick={() => cart.remove(i.slug, i.finish)}
                      aria-label="Remove item"
                      className="grid h-9 w-9 place-items-center rounded-md border border-border hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-md border border-border">
                      <button
                        className="h-10 w-10 grid place-items-center"
                        onClick={() => cart.setQty(i.slug, i.finish, i.qty - 5)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-20 text-center font-mono text-sm">{i.qty} m²</span>
                      <button
                        className="h-10 w-10 grid place-items-center"
                        onClick={() => cart.setQty(i.slug, i.finish, i.qty + 5)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-mono text-lg">{naira(i.price * i.qty)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-xl border border-border bg-surface p-6 lg:col-span-4">
            <h2 className="font-display text-2xl">Order summary</h2>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-mono">{naira(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT (7.5%)</dt>
                <dd className="font-mono">{naira(Math.round(vat))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-mono">{delivery === 0 ? "Free" : naira(delivery)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <dt className="font-medium">Total</dt>
                <dd className="font-mono text-xl">{naira(Math.round(total))}</dd>
              </div>
            </dl>
            <Link href="/checkout" className="btn btn-primary mt-6 w-full">
              Proceed to checkout <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={cart.clear}
              className="mt-2 h-11 w-full rounded-md border border-border text-sm transition hover:text-destructive"
            >
              Clear cart
            </button>
            <div className="mt-6 space-y-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gold" /> Secure payment · Paystack & bank
                transfer
              </p>
              <p className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-gold" /> Free delivery on orders above ₦500,000
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
