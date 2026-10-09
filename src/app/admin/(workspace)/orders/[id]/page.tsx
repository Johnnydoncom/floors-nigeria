import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, RefreshCw } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { staffOptions } from "@/lib/admin/fields";
import { formatDate, formatDateTime, naira, number } from "@/lib/format";
import { ActivityPanel } from "@/components/admin/activity";
import { ActionButton, InlineSelect } from "@/components/admin/actions";
import { FormDialog } from "@/components/admin/forms";
import { DataTable, Facts, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import type { Activity, AdminOrder } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Order" };

/** One order: what was bought, how it is being paid for, and where it goes. */
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "orders.view")) return <NoAccess what="orders" />;

  const { id } = await params;
  const [{ data: order, related }, lookups] = await Promise.all([
    adminGet<{ data: AdminOrder; related: { activities: Activity[] } }>(`orders/${Number(id)}`),
    getLookups(),
  ]);
  const editable = can(session, "orders.update");
  const outstanding = Math.max(0, order.total - (order.amount_paid ?? 0));
  const paid = order.payment_status === "paid" || order.payment_status === "refunded";

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        eyebrow={`Placed ${formatDateTime(order.created_at)}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.reference}
            <StatusBadge value={order.status} label={order.status_label} />
            <StatusBadge value={order.payment_status} label={order.payment_status_label} />
          </span>
        }
        description={
          order.customer && can(session, "customers.view") ? (
            <Link href={`/admin/customers/${order.customer.id}`} className="hover:text-foreground">
              {order.full_name} · customer record
            </Link>
          ) : (
            order.full_name
          )
        }
        actions={
          editable && (
            <>
              <InlineSelect
                endpoint={`orders/${order.id}`}
                field="status"
                value={order.status}
                label="Order status"
                options={lookups.enums.order_status}
              />
              {paid && order.payment_status !== "refunded" && (
                <ActionButton
                  endpoint={`orders/${order.id}`}
                  method="PATCH"
                  body={{ payment_status: "refunded" }}
                  variant="outline"
                  success="Marked as refunded."
                >
                  Mark refunded
                </ActionButton>
              )}
            </>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Items" padded={false}>
            <DataTable
              caption="Order items"
              rows={order.items ?? []}
              columns={[
                {
                  key: "item",
                  header: "Item",
                  cell: (item) => (
                    <div className="flex items-center gap-3">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <span className="h-10 w-10 rounded bg-muted" />
                      )}
                      <div className="min-w-0">
                        {item.product_id && can(session, "products.view") ? (
                          <Link
                            href={`/admin/products/${item.product_id}`}
                            className="font-medium hover:underline"
                          >
                            {item.product_name}
                          </Link>
                        ) : (
                          <span className="font-medium">{item.product_name}</span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {[item.variant_name, item.sku].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "qty",
                  header: "Quantity",
                  className: "tabular-nums whitespace-nowrap",
                  cell: (item) =>
                    `${number(item.quantity)} ${item.unit_label.replace(/^per /, "")}`,
                },
                {
                  key: "price",
                  header: "Unit price",
                  className: "max-md:hidden text-right tabular-nums",
                  cell: (item) => naira(item.unit_price),
                },
                {
                  key: "total",
                  header: "Total",
                  className: "text-right tabular-nums",
                  cell: (item) => naira(item.line_total),
                },
              ]}
            />
            <dl className="space-y-1.5 border-t border-border p-5 text-sm">
              {[
                ["Materials", order.subtotal],
                ["Installation", order.installation_fee],
                [order.fulfilment === "pickup" ? "Collection" : "Delivery", order.delivery_fee],
                ...(order.vat_amount > 0
                  ? [[`VAT (${number(order.vat_rate)}%)`, order.vat_amount]]
                  : []),
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular-nums">{naira(value as number)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{naira(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel
            title="Payments"
            description={
              paid
                ? `Paid ${formatDate(order.paid_at)}.`
                : `${naira(order.amount_paid ?? 0)} received · ${naira(outstanding)} outstanding.`
            }
            actions={
              editable &&
              !paid &&
              order.status !== "cancelled" && (
                <FormDialog
                  title="Record a payment"
                  description="For a bank transfer, POS or cash payment taken outside the card gateways. The order is confirmed once payments cover the total."
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden /> Record payment
                    </button>
                  }
                  fields={[
                    {
                      name: "amount",
                      label: "Amount (₦)",
                      type: "number",
                      required: true,
                      min: 1,
                      step: "any",
                    },
                    {
                      name: "method",
                      label: "Method",
                      type: "select",
                      required: true,
                      options: [
                        { value: "bank_transfer", label: "Bank transfer" },
                        { value: "manual", label: "POS / cash / other" },
                      ],
                    },
                    {
                      name: "note",
                      label: "Note",
                      type: "textarea",
                      wide: true,
                      placeholder: "Bank, sender name, transaction reference…",
                    },
                  ]}
                  initial={{ amount: outstanding, method: "bank_transfer" }}
                  endpoint={`orders/${order.id}/payments`}
                  successMessage="Payment recorded."
                  columns={1}
                />
              )
            }
            padded={false}
          >
            {(order.payments ?? []).length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                {order.payment_method === "bank_transfer"
                  ? "Waiting for the customer's bank transfer."
                  : "No payment attempts yet."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {(order.payments ?? []).map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-start justify-between gap-3 p-5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {payment.gateway_label} · {naira(payment.amount)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{payment.reference}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[
                          payment.channel,
                          payment.gateway_transaction_id && `Txn ${payment.gateway_transaction_id}`,
                          payment.recorded_by && `by ${payment.recorded_by.name}`,
                          formatDateTime(payment.paid_at ?? payment.created_at),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {(payment.failure_reason || payment.note) && (
                        <p className="mt-1 text-xs">{payment.failure_reason ?? payment.note}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={payment.status} label={payment.status} />
                      {editable && payment.can_recheck && (
                        <ActionButton
                          endpoint={`orders/${order.id}/payments/${payment.id}/recheck`}
                          variant="ghost"
                        >
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Re-check
                        </ActionButton>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <ActivityPanel
            subjectType="order"
            subjectId={order.id}
            activities={related.activities}
            canLog={can(session, "activities.create")}
          />
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <Facts
              columns={1}
              items={[
                { label: "Name", value: order.full_name },
                {
                  label: "Email",
                  value: (
                    <a href={`mailto:${order.email}`} className="hover:underline">
                      {order.email}
                    </a>
                  ),
                },
                {
                  label: "Phone",
                  value: (
                    <a href={`tel:${order.phone}`} className="hover:underline">
                      {order.phone}
                    </a>
                  ),
                },
                {
                  label: "Account",
                  value: order.has_account ? "Signed-in customer" : "Guest checkout",
                },
              ]}
            />
          </Panel>

          <Panel title={order.fulfilment_label}>
            <Facts
              columns={1}
              items={[
                {
                  label: "Address",
                  value:
                    order.fulfilment === "pickup"
                      ? "Collecting from the showroom"
                      : [order.address_line, order.city, order.state].filter(Boolean).join(", "),
                },
                {
                  label: "Installation",
                  value: order.requires_installation
                    ? `Requested${order.preferred_installation_date ? ` — from ${formatDate(order.preferred_installation_date)}` : ""}`
                    : "Supply only",
                },
                { label: "Customer notes", value: order.notes },
              ]}
            />
          </Panel>

          <Panel
            title="Handling"
            actions={
              editable && (
                <FormDialog
                  title="Staff notes"
                  trigger={
                    <button
                      type="button"
                      aria-label="Edit staff notes"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  }
                  fields={[
                    {
                      name: "staff_notes",
                      label: "Notes for the team",
                      type: "textarea",
                      wide: true,
                    },
                  ]}
                  initial={order}
                  endpoint={`orders/${order.id}`}
                  method="PATCH"
                  columns={1}
                />
              )
            }
          >
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Owner</p>
                {editable ? (
                  <InlineSelect
                    endpoint={`orders/${order.id}`}
                    field="owner_id"
                    value={order.owner?.id ?? null}
                    label="Order owner"
                    nullable
                    options={staffOptions(lookups)}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-0.5">{order.owner?.name ?? "Unassigned"}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Staff notes</p>
                <p className="mt-0.5 whitespace-pre-line">{order.staff_notes || "—"}</p>
              </div>
              {order.requires_installation && can(session, "appointments.create") && (
                <Link
                  href="/admin/appointments"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Schedule the site visit in
                  Appointments
                </Link>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
