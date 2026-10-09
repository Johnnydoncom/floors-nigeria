import type { Metadata } from "next";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { ContentEditor } from "@/components/admin/content/ContentEditor";
import { floorOptions } from "@/components/admin/content/content-pages";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import type { AdminList, AdminPortfolio } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditPortfolioProject({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!can(session, "content.view")) return <NoAccess what="the portfolio" />;

  const { id } = await params;
  const [{ data: project }, list, floors, lookups] = await Promise.all([
    adminGet<{ data: AdminPortfolio }>(`portfolio/${Number(id)}`),
    adminGet<AdminList<AdminPortfolio> & { sectors: string[] }>("portfolio", { per_page: 5 }),
    floorOptions(),
    getLookups(),
  ]);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/portfolio", label: "Portfolio" }}
        eyebrow={project.sector}
        title={project.title}
        description={project.project ? `From CRM project ${project.project.label}` : undefined}
      />
      <ContentEditor
        key={project.updated_at ?? project.id}
        kind="portfolio"
        record={project}
        editable={can(session, "content.update")}
        canDelete={can(session, "content.delete")}
        floorOptions={floors}
        sectors={list.sectors}
        states={lookups.states}
      />
    </>
  );
}
