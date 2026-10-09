import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { customerFields, staffOptions } from "@/lib/admin/fields";
import { formatDate } from "@/lib/format";
import { FilterBar } from "@/components/admin/FilterBar";
import { FormDialog } from "@/components/admin/forms";
import { DataTable, EmptyState, NoAccess, PageHeader, Pagination } from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, Customer } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "customers.view")) return <NoAccess what="customers" />;

  const query = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<Customer>>("customers", query),
    getLookups(),
  ]);
  const ownOnly = session.scopes.own_records_only;

  return (
    <>
      <PageHeader
        title="Customers"
        description={
          ownOnly
            ? "The customers you look after."
            : "Everyone who has enquired, bought or registered — the unified customer record."
        }
        actions={
          can(session, "customers.create") && (
            <FormDialog
              title="New customer"
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New customer
                </button>
              }
              fields={customerFields(lookups, { canAssign: !ownOnly })}
              initial={{ customer_type: "homeowner" }}
              endpoint="customers"
              redirectTo="/admin/customers/:id"
              successMessage="Customer added."
            />
          )
        }
      />

      <FilterBar
        placeholder="Name, email, phone or company"
        filters={[
          { type: "select", name: "type", label: "Types", options: lookups.enums.customer_type },
          {
            type: "select",
            name: "state",
            label: "States",
            options: lookups.states.map((state) => ({ value: state, label: state })),
          },
          ...(ownOnly
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
            name: "account",
            label: "Accounts",
            allLabel: "With or without an account",
            options: [
              { value: "yes", label: "Has an online account" },
              { value: "no", label: "No online account" },
            ],
          },
        ]}
      />

      <DataTable
        caption="Customers"
        rows={list.data}
        empty={
          <EmptyState icon={Users} title="No customers match">
            Try a different search or filter.
          </EmptyState>
        }
        columns={[
          {
            key: "name",
            header: "Customer",
            cell: (customer) => (
              <div className="min-w-0">
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="font-medium hover:underline"
                >
                  {customer.full_name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {[customer.email, customer.phone].filter(Boolean).join(" · ")}
                </p>
              </div>
            ),
          },
          {
            key: "type",
            header: "Type",
            className: "max-md:hidden",
            cell: (customer) => customer.customer_type_label,
          },
          {
            key: "where",
            header: "Location",
            className: "max-lg:hidden",
            cell: (customer) => [customer.city, customer.state].filter(Boolean).join(", ") || "—",
          },
          {
            key: "owner",
            header: "Owner",
            className: "max-lg:hidden",
            cell: (customer) =>
              customer.owner?.name ?? <span className="text-muted-foreground">Unassigned</span>,
          },
          {
            key: "activity",
            header: "Quotes · deals",
            className: "tabular-nums",
            cell: (customer) =>
              `${customer.quotes_count ?? 0} · ${customer.open_opportunities_count ?? 0}`,
          },
          {
            key: "since",
            header: "Added",
            className: "max-md:hidden whitespace-nowrap",
            cell: (customer) => formatDate(customer.created_at),
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/customers" query={query} />
    </>
  );
}
