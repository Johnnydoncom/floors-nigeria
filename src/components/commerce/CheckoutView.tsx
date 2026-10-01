"use client";

import { CartLineImage } from "@/components/site/CartLineImage";
import Link from "next/link";
import { useState } from "react";
import { Check, CreditCard, Landmark, Lock, Truck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/format";

const steps = ["Delivery", "Installation", "Payment"];
const field =
  "h-12 w-full rounded-md border border-border bg-background px-4 text-sm outline-none focus:border-gold";

/**
 * The checkout steps. A client island: it reads the cart held in the browser
 * and walks through delivery, installation and payment without a reload.
 */
export function CheckoutView() {
  const cart = useCart();
  const [step, setStep] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [install, setInstall] = useState(true);
  const [pay, setPay] = useState("card");
  // Placeholder reference until checkout posts a real quote; generated on
  // submit rather than during render so the page still prerenders.
  const [orderRef, setOrderRef] = useState<string | null>(null);

  const installFee = install ? Math.round(cart.subtotal * 0.12) : 0;
  const vat = (cart.subtotal + installFee) * 0.075;
  const delivery = cart.subtotal > 500000 ? 0 : 45000;
  const total = cart.subtotal + installFee + vat + delivery;

  if (placed) {
    return (
      <div className="pt-header pb-32 container-fluid text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold text-charcoal-dark">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="mt-8 font-display text-4xl md:text-5xl tracking-tight">Order confirmed</h1>
        <p className="mt-4 text-muted-foreground">
          Reference <span className="font-mono text-foreground">FN-{orderRef}</span>. A specifier
          will call within 24 hours to confirm your site survey.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/account" className="btn btn-primary">
            Track in dashboard
          </Link>
          <Link href="/products" className="btn btn-outline">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-header pb-24">
      <div className="container-fluid">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
          Checkout step 2 of 2
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-tight">Secure checkout</h1>

        <div className="mt-8 flex items-center gap-3">
          {steps.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className="flex items-center gap-2">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full font-mono text-xs ${i <= step ? "bg-charcoal-dark text-primary-foreground" : "border border-border text-muted-foreground"}`}
              >
                {i + 1}
              </span>
              <span className={`text-sm ${i === step ? "font-semibold" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < steps.length - 1 && <span className="mx-2 h-px w-8 bg-border" />}
            </button>
          ))}
        </div>

        <div className="mt-10 grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 border border-border p-6 md:p-8">
            {step === 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <input className={field} placeholder="First name" />
                <input className={field} placeholder="Last name" />
                <input className={field} placeholder="Email address" type="email" />
                <input className={field} placeholder="Phone number" type="tel" />
                <input className={`${field} sm:col-span-2`} placeholder="Delivery address" />
                <input className={field} placeholder="City" />
                <select className={field} defaultValue="Lagos">
                  {["Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano", "Other state"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <textarea
                  className="sm:col-span-2 min-h-28 w-full border border-border bg-background p-4 text-sm outline-none focus:border-gold"
                  placeholder="Delivery notes (gate access, floor level, preferred time)"
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                {[
                  {
                    key: true,
                    title: "Professional installation",
                    desc: "Certified Floors NG crew, subfloor prep, 5-year workmanship warranty. 12% of material value.",
                  },
                  {
                    key: false,
                    title: "Supply only",
                    desc: "We deliver to site; your contractor installs. Installation guides included.",
                  },
                ].map((o) => (
                  <button
                    key={String(o.key)}
                    onClick={() => setInstall(o.key)}
                    className={`w-full text-left border p-5 transition ${install === o.key ? "border-gold bg-gold/5" : "border-border hover:border-foreground/30"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-gold" />
                      <span className="font-display text-lg">{o.title}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{o.desc}</p>
                  </button>
                ))}
                <input className={field} placeholder="Preferred installation date" type="date" />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {[
                  {
                    id: "card",
                    icon: CreditCard,
                    title: "Card payment",
                    desc: "Visa, Mastercard, Verve — processed by Paystack.",
                  },
                  {
                    id: "transfer",
                    icon: Landmark,
                    title: "Bank transfer",
                    desc: "Account details issued on order confirmation.",
                  },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setPay(o.id)}
                    className={`w-full text-left border p-5 transition ${pay === o.id ? "border-gold bg-gold/5" : "border-border hover:border-foreground/30"}`}
                  >
                    <div className="flex items-center gap-3">
                      <o.icon className="h-4 w-4 text-gold" />
                      <span className="font-display text-lg">{o.title}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{o.desc}</p>
                  </button>
                ))}
                {pay === "card" && (
                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <input
                      className={`${field} sm:col-span-2`}
                      placeholder="Card number"
                      inputMode="numeric"
                    />
                    <input className={field} placeholder="MM / YY" />
                    <input className={field} placeholder="CVC" inputMode="numeric" />
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex justify-between gap-3">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="h-12 px-6 border border-border text-sm disabled:opacity-40"
              >
                Back
              </button>
              {step < 2 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="h-12 px-8 bg-charcoal-dark text-primary-foreground text-sm font-semibold uppercase tracking-[0.08em] hover:bg-gold hover:text-charcoal-dark transition"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={() => {
                    setOrderRef(String(Math.floor(100000 + Math.random() * 899999)));
                    setPlaced(true);
                    cart.clear();
                  }}
                  className="h-12 px-8 inline-flex items-center gap-2 bg-gold text-charcoal-dark text-sm font-semibold uppercase tracking-[0.08em] hover:bg-charcoal-dark hover:text-primary-foreground transition"
                >
                  <Lock className="h-4 w-4" /> Pay {naira(Math.round(total))}
                </button>
              )}
            </div>
          </div>

          <aside className="lg:col-span-4 border border-border bg-surface p-6">
            <h2 className="font-display text-2xl">Summary</h2>
            <div className="mt-5 space-y-4">
              {cart.items.map((i) => (
                <div key={i.slug + i.finish} className="flex gap-3">
                  <CartLineImage src={i.img} alt="" sizes="56px" className="h-14 w-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.finish} · {i.qty} m²
                    </div>
                  </div>
                  <span className="font-mono text-sm">{naira(i.price * i.qty)}</span>
                </div>
              ))}
              {cart.items.length === 0 && (
                <p className="text-sm text-muted-foreground">Cart is empty.</p>
              )}
            </div>
            <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Materials</dt>
                <dd className="font-mono">{naira(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Installation</dt>
                <dd className="font-mono">{installFee ? naira(installFee) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-mono">{delivery ? naira(delivery) : "Free"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT (7.5%)</dt>
                <dd className="font-mono">{naira(Math.round(vat))}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="font-mono text-xl">{naira(Math.round(total))}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </div>
  );
}
