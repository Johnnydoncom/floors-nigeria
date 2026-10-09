import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { formatDate, naira } from "@/lib/format";
import { FilterBar } from "@/components/admin/FilterBar";
import {
  DataTable,
  EmptyState,
  NoAccess,
  PageHeader,
  Pagination,
  StatusBadge,
  StatusTabs,
} from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, AdminOrder } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Orders" };

const TABS = ["pending", "confirmed", "processing", "out_for_delivery", "completed", "cancelled"];

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "orders.view")) return <NoAccess what="orders" />;

  const filters = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<AdminOrder>>("orders", filters),
    getLookups(),
  ]);
  const counts = list.counts ?? {};
  const labels = new Map(lookups.enums.order_status.map((status) => [status.value, status.label]));

  return (
    <>
      <PageHeader
        title="Orders"
        description="Online orders from the storefront: payment, delivery and installation. Card payments confirm themselves; record bank transfers here."
      />

      <StatusTabs
        path="/admin/orders"
        query={filters}
        tabs={[
          { value: "", label: "All", count: counts.all },
          { value: "open", label: "Open", count: counts.open },
          ...TABS.map((status) => ({
            value: status,
            label: labels.get(status) ?? status,
            count: counts[status],
          })),
        ]}
      />

      <FilterBar
        placeholder="Reference, name, email or phone"
        filters={[
          {
            type: "select",
            name: "payment_status",
            label: "Payment",
            options: lookups.enums.payment_status,
          },
          {
            type: "select",
            name: "payment_method",
            label: "Methods",
            options: lookups.enums.payment_gateway,
          },
          {
            type: "select",
            name: "state",
            label: "States",
            options: lookups.states.map((state) => ({ value: state, label: state })),
          },
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
        ]}
      />

      <DataTable
        caption="Orders"
        rows={list.data}
        empty={
          <EmptyState icon={ShoppingBag} title="No orders here">
            Nothing matches these filters.
          </EmptyState>
        }
        columns={[
          {
            key: "ref",
            header: "Order",
            cell: (order) => (
              <div>
                <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                  {order.reference}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {order.item_count ?? 0} item{order.item_count === 1 ? "" : "s"} ·{" "}
                  {order.fulfilment_label}
                  {order.requires_installation ? " · install" : ""}
                </p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            cell: (order) =>
              order.customer && can(session, "customers.view") ? (
                <Link href={`/admin/customers/${order.customer.id}`} className="hover:underline">
                  {order.full_name}
                </Link>
              ) : (
                order.full_name
              ),
          },
          {
            key: "where",
            header: "Location",
            className: "max-lg:hidden",
            cell: (order) => [order.city, order.state].filter(Boolean).join(", ") || "Collection",
          },
          {
            key: "date",
            header: "Placed",
            className: "max-md:hidden whitespace-nowrap",
            cell: (order) => formatDate(order.created_at),
          },
          {
            key: "total",
            header: "Total",
            className: "text-right tabular-nums",
            cell: (order) => naira(order.total),
          },
          {
            key: "payment",
            header: "Payment",
            cell: (order) => (
              <div className="space-y-0.5">
                <StatusBadge value={order.payment_status} label={order.payment_status_label} />
                <p className="text-[11px] text-muted-foreground">{order.payment_method_label}</p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (order) => <StatusBadge value={order.status} label={order.status_label} />,
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/orders" query={filters} />
    </>
  );
}
