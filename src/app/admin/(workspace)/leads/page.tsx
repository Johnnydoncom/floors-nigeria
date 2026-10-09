import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Plus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { leadFields, staffOptions } from "@/lib/admin/fields";
import { formatDate } from "@/lib/format";
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
} from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, Lead } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "leads.view")) return <NoAccess what="leads" />;

  const query = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<Lead>>("leads", query),
    getLookups(),
  ]);
  const counts = list.counts ?? {};
  const ownOnly = session.scopes.own_records_only;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Enquiries from the website, calculator, visualizer, phone, WhatsApp and the showroom. Contact new ones quickly — response time is on the dashboard."
        actions={
          can(session, "leads.create") && (
            <FormDialog
              title="Log a lead"
              description="For an enquiry that didn't come through the website."
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> Log a lead
                </button>
              }
              fields={leadFields(lookups, { creating: true, canAssign: !ownOnly })}
              initial={{ source: "phone" }}
              endpoint="leads"
              redirectTo="/admin/leads/:id"
              successMessage="Lead logged."
            />
          )
        }
      />

      <StatusTabs
        path="/admin/leads"
        query={query}
        tabs={[
          { value: "", label: "All", count: counts.all },
          { value: "open", label: "Open", count: counts.open },
          ...lookups.enums.lead_status.map((status) => ({
            ...status,
            count: counts[status.value],
          })),
        ]}
      />

      <FilterBar
        placeholder="Name, phone, email or project"
        filters={[
          { type: "select", name: "source", label: "Sources", options: lookups.enums.lead_source },
          ...(ownOnly
            ? []
            : [
                {
                  type: "select" as const,
                  name: "assigned",
                  label: "Assignees",
                  options: [
                    { value: "me", label: "Mine" },
                    { value: "none", label: "Unassigned" },
                    ...staffOptions(lookups),
                  ],
                },
              ]),
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
        ]}
      />

      <DataTable
        caption="Leads"
        rows={list.data}
        empty={
          <EmptyState icon={Inbox} title="No leads here">
            Nothing matches these filters.
          </EmptyState>
        }
        columns={[
          {
            key: "name",
            header: "Lead",
            cell: (lead) => (
              <div className="min-w-0">
                <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:underline">
                  {lead.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {[lead.phone, lead.email].filter(Boolean).join(" · ")}
                </p>
              </div>
            ),
          },
          {
            key: "project",
            header: "Project",
            className: "max-md:hidden",
            cell: (lead) => lead.project_type ?? "—",
          },
          { key: "source", header: "Source", cell: (lead) => lead.source_label },
          {
            key: "where",
            header: "Location",
            className: "max-lg:hidden",
            cell: (lead) => [lead.city, lead.state].filter(Boolean).join(", ") || "—",
          },
          {
            key: "assignee",
            header: "Assigned",
            className: "max-lg:hidden",
            cell: (lead) =>
              lead.assignee?.name ?? <span className="text-muted-foreground">Unassigned</span>,
          },
          {
            key: "date",
            header: "Received",
            className: "whitespace-nowrap max-sm:hidden",
            cell: (lead) => formatDate(lead.created_at),
          },
          {
            key: "status",
            header: "Status",
            cell: (lead) => <StatusBadge value={lead.status} label={lead.status_label} />,
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/leads" query={query} />
    </>
  );
}
