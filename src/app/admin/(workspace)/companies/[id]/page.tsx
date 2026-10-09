import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { companyFields } from "@/lib/admin/fields";
import { naira } from "@/lib/format";
import { ConfirmAction } from "@/components/admin/actions";
import { FormDialog } from "@/components/admin/forms";
import { DataTable, Facts, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import type { Company, Customer, Opportunity } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Company" };

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "companies.view")) return <NoAccess what="companies" />;

  const { id } = await params;
  const [{ data: company, related }, lookups] = await Promise.all([
    adminGet<{ data: Company; related: { contacts: Customer[]; opportunities: Opportunity[] } }>(
      `companies/${Number(id)}`,
    ),
    getLookups(),
  ]);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/companies", label: "Companies" }}
        eyebrow={company.type ?? "Company"}
        title={company.name}
        actions={
          can(session, "companies.update") && (
            <FormDialog
              wide
              title="Edit company"
              trigger={
                <button
                  type="button"
                  className="btn btn-outline h-9 rounded-md bg-background px-4 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                </button>
              }
              fields={companyFields(lookups)}
              initial={company}
              endpoint={`companies/${company.id}`}
              method="PATCH"
            />
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Contacts" padded={false}>
            <DataTable
              caption="Contacts"
              rows={related.contacts}
              empty={
                <p className="p-5 text-sm text-muted-foreground">
                  No contacts linked. Set the company on a customer record to link them.
                </p>
              }
              columns={[
                {
                  key: "name",
                  header: "Name",
                  cell: (contact) => (
                    <Link
                      href={`/admin/customers/${contact.id}`}
                      className="font-medium hover:underline"
                    >
                      {contact.full_name}
                    </Link>
                  ),
                },
                {
                  key: "contact",
                  header: "Contact",
                  cell: (contact) =>
                    [contact.phone, contact.email].filter(Boolean).join(" · ") || "—",
                },
                {
                  key: "owner",
                  header: "Owner",
                  className: "max-md:hidden",
                  cell: (contact) => contact.owner?.name ?? "—",
                },
              ]}
            />
          </Panel>
          <Panel title="Deals" padded={false}>
            <DataTable
              caption="Deals"
              rows={related.opportunities}
              empty={<p className="p-5 text-sm text-muted-foreground">No deals yet.</p>}
              columns={[
                {
                  key: "title",
                  header: "Deal",
                  cell: (deal) => (
                    <Link
                      href={`/admin/pipeline/${deal.id}`}
                      className="font-medium hover:underline"
                    >
                      {deal.title}
                    </Link>
                  ),
                },
                {
                  key: "value",
                  header: "Value",
                  className: "text-right tabular-nums",
                  cell: (deal) => naira(deal.value),
                },
                {
                  key: "stage",
                  header: "Stage",
                  cell: (deal) => <StatusBadge value={deal.stage} label={deal.stage_label} />,
                },
              ]}
            />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Details">
            <Facts
              columns={1}
              items={[
                { label: "Email", value: company.email },
                { label: "Phone", value: company.phone },
                {
                  label: "Website",
                  value: company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener"
                      className="hover:underline"
                    >
                      {company.website}
                    </a>
                  ),
                },
                {
                  label: "Address",
                  value:
                    [company.address_line, company.city, company.state]
                      .filter(Boolean)
                      .join(", ") || null,
                },
              ]}
            />
            {company.notes && (
              <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm">
                {company.notes}
              </p>
            )}
          </Panel>
          {can(session, "companies.delete") && (
            <ConfirmAction
              endpoint={`companies/${company.id}`}
              title={`Delete ${company.name}?`}
              description="Contacts and deals are kept; they lose the company link."
              redirectTo="/admin/companies"
              success="Company deleted."
            >
              Delete company
            </ConfirmAction>
          )}
        </div>
      </div>
    </>
  );
}
