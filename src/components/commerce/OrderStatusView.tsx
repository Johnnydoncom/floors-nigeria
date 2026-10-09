"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { CartLineImage } from "@/components/site/CartLineImage";
import { unitSymbol } from "@/lib/cart";
import { formatDate, naira, number } from "@/lib/format";
import { stateLabel } from "@/lib/nigeria";
import type { Order, PaymentMethodId } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Load =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "ready"; order: Order; notice: string | null };

/**
 * An order's status page — where the payment gateway returns the shopper and
 * where the confirmation email links. On return from a gateway it asks the
 * server to verify the payment with the provider before showing an outcome.
 */
export function OrderStatusView({ reference }: { reference: string }) {
  const params = useSearchParams();
  // The URL carries the token; a refresh without it can still find the one
  // kept in this tab at checkout.
  const [token] = useState<string | null>(() => params.get("token") ?? savedToken(reference));
  const verify = params.get("verify") === "1";
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [paying, setPaying] = useState<PaymentMethodId | null>(null);

  /** Read the order (verifying its payment first, after a gateway return). */
  const readOrder = useCallback(
    async (withVerification: boolean): Promise<Load> => {
      const response = withVerification
        ? await fetch(`/api/orders/${reference}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ token }),
          })
        : await fetch(
            `/api/orders/${reference}${token ? `?token=${encodeURIComponent(token)}` : ""}`,
            { headers: { Accept: "application/json" } },
          );

      if (!response.ok) return { state: "missing" };

      const payload = (await response.json()) as {
        data: Order;
        verification_error?: string | null;
      };
      return { state: "ready", order: payload.data, notice: payload.verification_error ?? null };
    },
    [reference, token],
  );

  useEffect(() => {
    let cancelled = false;
    readOrder(verify)
      .catch((): Load => ({ state: "missing" }))
      .then((result) => {
        if (!cancelled) setLoad(result);
      });
    return () => {
      cancelled = true;
    };
  }, [readOrder, verify]);

  async function payWith(gateway: PaymentMethodId) {
    setPaying(gateway);
    try {
      const response = await fetch(`/api/orders/${reference}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, gateway }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { redirect_url: string | null };
        message?: string;
      };

      if (response.ok && payload.data?.redirect_url) {
        window.location.assign(payload.data.redirect_url);
        return;
      }

      toast.error(payload.message ?? "We could not start the payment. Please try again.");
    } catch {
      toast.error("We could not reach our store. Check your connection and try again.");
    }
    setPaying(null);
  }

  if (load.state === "loading") {
    return (
      <div className="flex flex-col items-center py-24 text-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden />
        <p className="mt-4 text-muted-foreground">
          {verify ? "Confirming your payment with the bank…" : "Loading your order…"}
        </p>
      </div>
    );
  }

  if (load.state === "missing") {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="font-display text-3xl tracking-tight">We can&apos;t open this order</h1>
        <p className="mt-3 text-muted-foreground">
          Use the link in your order email, or sign in to the account you ordered with. If you paid
          and need help, contact us quoting <span className="font-mono">{reference}</span>.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/account/orders" className="btn btn-primary">
            My orders
          </Link>
          <Link href="/contact" className="btn btn-outline">
            Contact us
          </Link>
        </div>
      </div>
    );
  }

  const { order, notice } = load;
  const paid = order.payment_status === "paid" || order.payment_status === "refunded";
  const awaitingTransfer =
    !paid && order.payment_method === "bank_transfer" && order.status === "pending";
  const cancelled = order.status === "cancelled";
  const failed = !paid && !awaitingTransfer && !cancelled;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "grid h-14 w-14 shrink-0 place-items-center rounded-full",
              paid ? "bg-gold text-charcoal-dark" : cancelled ? "bg-muted" : "bg-surface text-gold",
            )}
          >
            {paid ? (
              <Check className="h-7 w-7" aria-hidden />
            ) : awaitingTransfer ? (
              <Landmark className="h-6 w-6" aria-hidden />
            ) : cancelled ? (
              <AlertTriangle className="h-6 w-6" aria-hidden />
            ) : (
              <Clock className="h-6 w-6" aria-hidden />
            )}
          </span>
          <div>
            <p className="eyebrow">Order {order.reference}</p>
            <h1 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
              {paid
                ? "Thank you — your order is confirmed"
                : awaitingTransfer
                  ? "Almost done — complete your transfer"
                  : cancelled
                    ? "This order was cancelled"
                    : "Your payment wasn't completed"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {paid
                ? `We've emailed a receipt to ${order.contact.email}. Our team will call you to arrange ${order.fulfilment === "pickup" ? "collection" : "delivery"}${order.requires_installation ? " and your site visit" : ""}.`
                : awaitingTransfer
                  ? "Your order is reserved. Transfer the total below using your order reference; we confirm it as soon as the money arrives."
                  : cancelled
                    ? "Contact us if you have any questions about this order."
                    : "No money has been taken for this order. You can try again below — your cart and prices are saved."}
            </p>
          </div>
        </div>

        {notice && (
          <p className="mt-6 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-sm">
            {notice} If you completed payment, refresh this page in a minute.
          </p>
        )}

        {failed && order.payment_failure && (
          <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
            Reason from the payment provider: {order.payment_failure}
          </p>
        )}

        {awaitingTransfer && order.bank_transfer_details && (
          <div className="mt-8 rounded-xl border border-gold/40 bg-gold/5 p-6">
            <h2 className="font-display text-lg">Bank transfer details</h2>
            <p className="mt-4 whitespace-pre-line font-mono text-sm leading-relaxed">
              {order.bank_transfer_details}
            </p>
            <dl className="mt-5 grid gap-3 border-t border-gold/30 pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-mono text-lg">{naira(order.totals.total)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Narration / reference</dt>
                <dd className="flex items-center gap-2 font-mono text-lg">
                  {order.reference}
                  <button
                    type="button"
                    aria-label="Copy order reference"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText(order.reference)
                        .then(() => toast.success("Reference copied"))
                        .catch(() => undefined)
                    }
                    className="grid h-8 w-8 place-items-center rounded-md hover:bg-background"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </button>
                </dd>
              </div>
            </dl>
          </div>
        )}

        {!paid && !cancelled && order.payment_options.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-lg">
              {awaitingTransfer ? "Or pay online now" : "Try paying again"}
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {order.payment_options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={paying !== null}
                  onClick={() => payWith(option.id)}
                  className="btn btn-primary disabled:opacity-60"
                >
                  {paying === option.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <CreditCard className="h-4 w-4" aria-hidden />
                  )}
                  Pay {naira(order.totals.total)} with {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setLoad({ state: "loading" });
                  readOrder(true)
                    .catch((): Load => ({ state: "missing" }))
                    .then(setLoad);
                }}
                className="btn btn-outline"
              >
                <RefreshCw className="h-4 w-4" aria-hidden /> I&apos;ve paid — check again
              </button>
            </div>
          </div>
        )}

        <dl className="mt-10 grid gap-6 rounded-xl border border-border p-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Status
            </dt>
            <dd className="mt-1 font-medium">
              {order.status_label} · {order.payment_status_label}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Placed
            </dt>
            <dd className="mt-1 font-medium">{formatDate(order.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {order.fulfilment_label}
            </dt>
            <dd className="mt-1 flex items-start gap-1.5 font-medium">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              {order.fulfilment === "pickup"
                ? "From our Lekki showroom"
                : [
                    order.address.address_line,
                    order.address.city,
                    order.address.state && stateLabel(order.address.state),
                  ]
                    .filter(Boolean)
                    .join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Installation
            </dt>
            <dd className="mt-1 font-medium">
              {order.requires_installation
                ? `Requested${order.preferred_installation_date ? ` · from ${formatDate(order.preferred_installation_date)}` : ""}`
                : "Supply only"}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/products" className="btn btn-outline">
            Continue shopping
          </Link>
          <Link href="/account/orders" className="btn btn-outline">
            My orders
          </Link>
        </div>
      </div>

      <aside className="rounded-xl border border-border bg-surface p-6 lg:col-span-5">
        <h2 className="font-display text-xl">Order summary</h2>
        <ul className="mt-5 space-y-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <CartLineImage
                src={item.image_url ?? ""}
                alt=""
                sizes="56px"
                className="h-14 w-14 shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.variant_name, `${number(item.quantity)} ${unitSymbol(item.unit)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="font-mono text-sm">{naira(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
          <SummaryRow label="Materials" value={naira(order.totals.subtotal)} />
          {order.totals.installation_fee > 0 && (
            <SummaryRow label="Installation" value={naira(order.totals.installation_fee)} />
          )}
          <SummaryRow
            label={order.fulfilment === "pickup" ? "Collection" : "Delivery"}
            value={order.totals.delivery_fee > 0 ? naira(order.totals.delivery_fee) : "Free"}
          />
          {order.totals.vat_amount > 0 && (
            <SummaryRow
              label={`VAT (${number(order.totals.vat_rate)}%)`}
              value={naira(order.totals.vat_amount)}
            />
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="font-mono text-xl">{naira(order.totals.total)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function savedToken(reference: string): string | null {
  try {
    return sessionStorage.getItem(`floorsng.order.${reference}`);
  } catch {
    return null;
  }
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
