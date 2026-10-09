import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { companyFields } from "@/lib/admin/fields";
import { FilterBar } from "@/components/admin/FilterBar";
import { FormDialog } from "@/components/admin/forms";
import { DataTable, EmptyState, NoAccess, PageHeader, Pagination } from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, Company } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "companies.view")) return <NoAccess what="companies" />;

  const query = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<Company>>("companies", query),
    getLookups(),
  ]);

  return (
    <>
      <PageHeader
        title="Companies"
        description="Developers, hotels, contractors and design studios, with their contacts and deals."
        actions={
          can(session, "companies.create") && (
            <FormDialog
              title="New company"
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New company
                </button>
              }
              fields={companyFields(lookups)}
              endpoint="companies"
              redirectTo="/admin/companies/:id"
              successMessage="Company added."
            />
          )
        }
      />
      <FilterBar
        placeholder="Company, email or phone"
        filters={[
          {
            type: "select",
            name: "state",
            label: "States",
            options: lookups.states.map((state) => ({ value: state, label: state })),
          },
        ]}
      />
      <DataTable
        caption="Companies"
        rows={list.data}
        empty={<EmptyState icon={Building2} title="No companies yet" />}
        columns={[
          {
            key: "name",
            header: "Company",
            cell: (company) => (
              <Link href={`/admin/companies/${company.id}`} className="font-medium hover:underline">
                {company.name}
              </Link>
            ),
          },
          {
            key: "type",
            header: "Type",
            className: "max-md:hidden",
            cell: (company) => company.type ?? "—",
          },
          {
            key: "where",
            header: "Location",
            className: "max-md:hidden",
            cell: (company) => [company.city, company.state].filter(Boolean).join(", ") || "—",
          },
          {
            key: "contacts",
            header: "Contacts",
            className: "tabular-nums",
            cell: (company) => company.contacts_count ?? 0,
          },
          {
            key: "deals",
            header: "Deals",
            className: "tabular-nums",
            cell: (company) => company.opportunities_count ?? 0,
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/companies" query={query} />
    </>
  );
}
