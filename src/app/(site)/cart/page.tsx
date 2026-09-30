"use client";

import Image from "next/image";
import { CartLineImage } from "@/components/site/CartLineImage";
import Link from "next/link";
import { Minus, Plus, Trash2, ShieldCheck, Truck, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart";
import { PRODUCTS } from "@/lib/catalog";
import { naira } from "@/lib/format";

export default function CartPage() {
  const cart = useCart();
  const vat = cart.subtotal * 0.075;
  const delivery = cart.subtotal > 500000 || cart.subtotal === 0 ? 0 : 45000;
  const total = cart.subtotal + vat + delivery;

  return (
    <div className="pt-header pb-24">
      <div className="container-fluid">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
          Checkout step 1 of 2
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-tight">Your cart</h1>

        {cart.items.length === 0 ? (
          <div className="mt-14 border border-border p-14 text-center">
            <p className="text-muted-foreground">Your cart is empty. Start with a bestseller.</p>
            <div className="mt-8 grid sm:grid-cols-3 gap-5 text-left">
              {PRODUCTS.slice(0, 3).map((p) => (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  className="group border border-border hover:border-gold transition"
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
                    <div className="font-mono text-xs text-muted-foreground">
                      {naira(p.price)}/m²
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-10 grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8 border border-border">
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
                        className="h-9 w-9 grid place-items-center border border-border hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="inline-flex items-center border border-border">
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

            <aside className="lg:col-span-4 border border-border p-6 bg-surface">
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
              <Link
                href="/checkout"
                className="mt-6 flex h-12 items-center justify-center gap-2 bg-charcoal-dark text-primary-foreground text-sm font-semibold uppercase tracking-[0.08em] hover:bg-gold hover:text-charcoal-dark transition"
              >
                Proceed to checkout <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={cart.clear}
                className="mt-2 w-full h-11 border border-border text-sm hover:text-destructive transition"
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
      </div>
    </div>
  );
}
