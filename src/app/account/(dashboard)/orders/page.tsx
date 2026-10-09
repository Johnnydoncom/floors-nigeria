import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { getOrders } from "@/lib/api/account";
import { firstParam, type SearchParams } from "@/lib/account/form-state";
import { EmptyState, SectionHeading, StatusBadge } from "@/components/account/display";
import { formatDate, naira } from "@/lib/format";
import type { Order } from "@/lib/api/types";

export const metadata: Metadata = { title: "Your orders" };

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const requested = Number(firstParam((await searchParams).page) ?? 1);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const { data: orders, meta } = await getOrders(page);

  return (
    <section>
      <SectionHeading
        title="Orders"
        description="Everything you've bought online, with payment and delivery status."
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          action={{ href: "/products", label: "Browse floors" }}
        >
          Orders you place while signed in appear here. Orders placed as a guest can be opened from
          the link in your confirmation email.
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-border border border-border">
            {orders.map((order) => (
              <OrderRow key={order.reference} order={order} />
            ))}
          </ul>

          {meta.last_page > 1 && (
            <nav
              aria-label="Order pages"
              className="mt-6 flex items-center justify-between text-sm"
            >
              {meta.current_page > 1 ? (
                <Link
                  href={`/account/orders?page=${meta.current_page - 1}`}
                  className="hover:text-gold"
                >
                  ← Newer
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                Page {meta.current_page} of {meta.last_page}
              </span>
              {meta.current_page < meta.last_page ? (
                <Link
                  href={`/account/orders?page=${meta.current_page + 1}`}
                  className="hover:text-gold"
                >
                  Older →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function OrderRow({ order }: { order: Order }) {
  const first = order.items[0];
  const summary = first
    ? `${first.product_name}${order.items.length > 1 ? ` and ${order.items.length - 1} more` : ""}`
    : "Order";
  const needsPayment = order.payment_options.length > 0 && order.payment_status !== "paid";

  return (
    <li>
      <Link
        href={`/checkout/order/${encodeURIComponent(order.reference)}`}
        className="flex flex-wrap items-center justify-between gap-4 p-5 transition hover:bg-surface"
      >
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">
            {order.reference} · {formatDate(order.created_at)}
          </p>
          <p className="mt-1 truncate font-medium">{summary}</p>
          {needsPayment && <p className="mt-1 text-xs text-gold">Awaiting payment</p>}
        </div>
        <div className="flex items-center gap-5">
          <span className="font-mono text-sm">{naira(order.totals.total)}</span>
          <StatusBadge status={order.status} label={order.status_label} />
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </Link>
    </li>
  );
}
