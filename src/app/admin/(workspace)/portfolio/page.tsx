import type { Metadata } from "next";
import { GalleryHorizontalEnd } from "lucide-react";
import { adminGet, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { FilterBar } from "@/components/admin/FilterBar";
import { DataTable, EmptyState, NoAccess, PageHeader, Pagination } from "@/components/admin/ui";
import {
  ContentStatus,
  ContentTabs,
  NewContentButton,
  TitleCell,
} from "@/components/admin/content/content-pages";
import { number } from "@/lib/format";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, AdminPortfolio } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "content.view")) return <NoAccess what="the portfolio" />;

  const filters = await searchParams;
  const list = await adminGet<AdminList<AdminPortfolio> & { sectors: string[] }>(
    "portfolio",
    filters,
  );

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Reference projects with photo galleries and before/after pairs. Only name a client who has agreed to be shown."
        actions={
          can(session, "content.create") && (
            <NewContentButton
              endpoint="portfolio"
              label="New project"
              redirectTo="/admin/portfolio/:id"
            />
          )
        }
      />
      <ContentTabs path="/admin/portfolio" query={filters} counts={list.counts ?? {}} />
      <FilterBar
        placeholder="Title or address"
        filters={[
          {
            type: "select",
            name: "sector",
            label: "Sectors",
            options: list.sectors.map((sector) => ({ value: sector, label: sector })),
          },
        ]}
      />
      <DataTable
        caption="Portfolio projects"
        rows={list.data}
        empty={
          <EmptyState icon={GalleryHorizontalEnd} title="No projects here">
            Add the first one with “New project”.
          </EmptyState>
        }
        columns={[
          {
            key: "title",
            header: "Project",
            cell: (project) => (
              <TitleCell
                href={`/admin/portfolio/${project.id}`}
                title={project.title}
                detail={[project.sector, project.location, project.city]
                  .filter(Boolean)
                  .join(" · ")}
                image={project.image_url}
              />
            ),
          },
          {
            key: "area",
            header: "Area",
            className: "max-md:hidden tabular-nums",
            cell: (project) => (project.area_sqm ? `${number(project.area_sqm, 0)} m²` : "—"),
          },
          {
            key: "photos",
            header: "Photos",
            className: "max-md:hidden tabular-nums",
            cell: (project) => project.photo_count,
          },
          {
            key: "status",
            header: "Status",
            cell: (project) => (
              <div className="space-y-0.5">
                <ContentStatus record={project} />
                {project.is_featured && (
                  <p className="text-[11px] text-muted-foreground">Featured</p>
                )}
              </div>
            ),
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/portfolio" query={filters} />
    </>
  );
}
