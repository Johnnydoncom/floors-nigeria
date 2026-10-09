import type { Metadata } from "next";
import Link from "next/link";
import { Hammer } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { staffOptions } from "@/lib/admin/fields";
import { formatDateTime } from "@/lib/format";
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
import type { AdminList, Installation } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Installations" };

export default async function InstallationsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "installations.view")) return <NoAccess what="installations" />;

  const query = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<Installation>>("installations", query),
    getLookups(),
  ]);
  const fieldOnly = session.scopes.assigned_jobs_only;

  return (
    <>
      <PageHeader
        title={fieldOnly ? "My jobs" : "Installations"}
        description={
          fieldOnly
            ? "Installations you lead or are crewed on. Open one to update progress and get sign-off."
            : "Every installation job. Schedule new ones from their project."
        }
      />
      <StatusTabs
        path="/admin/installations"
        query={query}
        tabs={[
          { value: "", label: "All" },
          { value: "upcoming", label: "Upcoming" },
          ...lookups.enums.installation_status,
        ]}
      />
      <FilterBar
        search={false}
        filters={[
          ...(fieldOnly
            ? []
            : [
                {
                  type: "select" as const,
                  name: "installer",
                  label: "Installers",
                  options: staffOptions(lookups, ["installer", "operations_manager"]),
                },
              ]),
          { type: "date", name: "from", label: "From" },
          { type: "date", name: "to", label: "To" },
        ]}
      />
      <DataTable
        caption="Installations"
        rows={list.data}
        empty={<EmptyState icon={Hammer} title="No installations here" />}
        columns={[
          {
            key: "job",
            header: "Job",
            cell: (job) => (
              <div>
                <Link
                  href={`/admin/installations/${job.id}`}
                  className="font-medium hover:underline"
                >
                  {job.project?.name ?? `Installation #${job.id}`}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {job.project?.reference} · {job.customer?.full_name}
                </p>
              </div>
            ),
          },
          {
            key: "when",
            header: "Starts",
            className: "whitespace-nowrap",
            cell: (job) => formatDateTime(job.scheduled_start),
          },
          {
            key: "where",
            header: "Site",
            className: "max-lg:hidden",
            cell: (job) =>
              [job.project?.city, job.project?.state].filter(Boolean).join(", ") || "—",
          },
          {
            key: "crew",
            header: "Crew",
            className: "max-md:hidden",
            cell: (job) =>
              [
                job.lead_installer?.name,
                ...job.crew
                  .filter((member) => member.id !== job.lead_installer_id)
                  .map((member) => member.name),
              ]
                .filter(Boolean)
                .join(", ") || "Unassigned",
          },
          {
            key: "progress",
            header: "Checklist",
            className: "tabular-nums max-sm:hidden",
            cell: (job) =>
              `${job.checklist.filter((item) => item.done).length}/${job.checklist.length}`,
          },
          {
            key: "status",
            header: "Status",
            cell: (job) => <StatusBadge value={job.status} label={job.status_label} />,
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/installations" query={query} />
    </>
  );
}
