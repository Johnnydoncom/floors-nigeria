import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { projectFields, staffOptions } from "@/lib/admin/fields";
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
} from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, Project } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "projects.view")) return <NoAccess what="projects" />;

  const query = await searchParams;
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<Project>>("projects", query),
    getLookups(),
  ]);
  const counts = list.counts ?? {};

  return (
    <>
      <PageHeader
        title="Projects"
        description="Sold jobs — the orders of a business that sells by quote — from planning to completion."
        actions={
          can(session, "projects.create") && (
            <FormDialog
              wide
              title="New project"
              description="Usually opened from a won quote; use this for work agreed outside the quote flow."
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New project
                </button>
              }
              fields={projectFields(lookups, { creating: true })}
              initial={{ status: "planned", owner_id: session.user.id }}
              endpoint="projects"
              redirectTo="/admin/projects/:id"
              successMessage="Project created."
            />
          )
        }
      />
      <StatusTabs
        path="/admin/projects"
        query={query}
        tabs={[
          { value: "", label: "All", count: counts.all },
          ...lookups.enums.project_status.map((status) => ({
            ...status,
            count: counts[status.value],
          })),
        ]}
      />
      <FilterBar
        placeholder="Reference, name or customer"
        filters={[
          ...(session.scopes.assigned_jobs_only
            ? []
            : [
                {
                  type: "select" as const,
                  name: "owner",
                  label: "Owners",
                  options: [{ value: "me", label: "Mine" }, ...staffOptions(lookups)],
                },
              ]),
          {
            type: "select",
            name: "state",
            label: "States",
            options: lookups.states.map((state) => ({ value: state, label: state })),
          },
        ]}
      />
      <DataTable
        caption="Projects"
        rows={list.data}
        empty={<EmptyState icon={FolderKanban} title="No projects here" />}
        columns={[
          {
            key: "name",
            header: "Project",
            cell: (project) => (
              <div>
                <Link
                  href={`/admin/projects/${project.id}`}
                  className="font-medium hover:underline"
                >
                  {project.name}
                </Link>
                <p className="text-xs text-muted-foreground">{project.reference}</p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            className: "max-md:hidden",
            cell: (project) => project.customer?.full_name ?? "—",
          },
          {
            key: "where",
            header: "Location",
            className: "max-lg:hidden",
            cell: (project) => [project.city, project.state].filter(Boolean).join(", ") || "—",
          },
          {
            key: "dates",
            header: "Dates",
            className: "max-lg:hidden whitespace-nowrap",
            cell: (project) =>
              `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`,
          },
          {
            key: "value",
            header: "Value",
            className: "text-right tabular-nums",
            cell: (project) => naira(project.value),
          },
          {
            key: "status",
            header: "Status",
            cell: (project) => <StatusBadge value={project.status} label={project.status_label} />,
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/projects" query={query} />
    </>
  );
}
