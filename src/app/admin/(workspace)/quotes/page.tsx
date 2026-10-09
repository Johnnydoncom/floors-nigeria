import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { quoteFields, staffOptions } from "@/lib/admin/fields";
import { formatDate, naira } from "@/lib/format";
import { FilterBar } from "@/components/admin/FilterBar";
import { FormDialog } from "@/components/admin/forms";
import {
  DataTable,
  EmptyState,
  NoAccess,
  PageHeader,
  Pagination,
  StatusBadge,
  StatusTabs,
  first,
} from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, Customer, Quote } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Quotes" };

const TABS = [
  "submitted",
  "contacted",
  "survey_scheduled",
  "measured",
  "prepared",
  "sent",
  "negotiation",
  "won",
  "lost",
];

export default async function QuotesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "quotes.view")) return <NoAccess what="quotes" />;

  const query = await searchParams;
  const customerId = Number(first(query.customer));
  const { new: _new, customer: _customer, ...filters } = query;
  const [list, lookups, customer] = await Promise.all([
    adminGet<AdminList<Quote>>("quotes", filters),
    getLookups(),
    Number.isInteger(customerId) && customerId > 0
      ? adminGet<{ data: Customer }>(`customers/${customerId}`).then((response) => response.data)
      : Promise.resolve(null),
  ]);
  const counts = list.counts ?? {};
  const statuses = new Map(
    lookups.enums.quote_status.map((status) => [status.value, status.label]),
  );

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Every quote request and staff-raised quote, from submission to won or lost."
        actions={
          can(session, "quotes.create") && (
            <FormDialog
              wide
              defaultOpen={first(query.new) === "1"}
              title="New quote"
              description="Starts as a draft. Add the priced lines on the next screen."
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New quote
                </button>
              }
              fields={quoteFields(lookups, { creating: true }).map((field) =>
                field.name === "customer_profile_id" && customer
                  ? { ...field, searchLabel: customer.full_name }
                  : field,
              )}
              initial={{
                source: "phone",
                customer_profile_id: customer?.id,
                address_line: customer?.address_line,
                city: customer?.city,
                state: customer?.state,
                owner_id: session.user.id,
              }}
              endpoint="quotes"
              redirectTo="/admin/quotes/:id"
              successMessage="Draft quote created."
            />
          )
        }
      />

      <StatusTabs
        path="/admin/quotes"
        query={filters}
        tabs={[
          { value: "", label: "All", count: counts.all },
          { value: "open", label: "Open", count: counts.open },
          ...TABS.map((status) => ({
            value: status,
            label: statuses.get(status) ?? status,
            count: counts[status],
          })),
        ]}
      />

      <FilterBar
        placeholder="Reference, customer, phone or project"
        filters={[
          { type: "select", name: "source", label: "Sources", options: lookups.enums.lead_source },
          ...(session.scopes.own_records_only
            ? []
            : [
                {
                  type: "select" as const,
                  name: "owner",
                  label: "Owners",
                  options: [
                    { value: "me", label: "Mine" },
                    { value: "none", label: "Unassigned" },
                    ...staffOptions(lookups),
                  ],
                },
              ]),
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
        caption="Quotes"
        rows={list.data}
        empty={
          <EmptyState icon={FileText} title="No quotes here">
            Nothing matches these filters.
          </EmptyState>
        }
        columns={[
          {
            key: "ref",
            header: "Quote",
            cell: (quote) => (
              <div>
                <Link href={`/admin/quotes/${quote.id}`} className="font-medium hover:underline">
                  {quote.reference}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {quote.project_type ?? quote.source_label}
                </p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            cell: (quote) =>
              quote.customer ? (
                <Link href={`/admin/customers/${quote.customer.id}`} className="hover:underline">
                  {quote.customer.full_name}
                </Link>
              ) : (
                "—"
              ),
          },
          {
            key: "where",
            header: "Location",
            className: "max-lg:hidden",
            cell: (quote) => [quote.city, quote.state].filter(Boolean).join(", ") || "—",
          },
          {
            key: "owner",
            header: "Owner",
            className: "max-lg:hidden",
            cell: (quote) =>
              quote.owner?.name ?? <span className="text-muted-foreground">Unassigned</span>,
          },
          {
            key: "date",
            header: "Requested",
            className: "max-md:hidden whitespace-nowrap",
            cell: (quote) => formatDate(quote.submitted_at ?? quote.created_at),
          },
          {
            key: "total",
            header: "Value",
            className: "text-right tabular-nums",
            cell: (quote) => naira(quote.total),
          },
          {
            key: "status",
            header: "Status",
            cell: (quote) => <StatusBadge value={quote.status} label={quote.status_label} />,
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/quotes" query={filters} />
    </>
  );
}
