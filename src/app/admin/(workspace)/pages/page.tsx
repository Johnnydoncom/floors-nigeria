import type { Metadata } from "next";
import { Files } from "lucide-react";
import { adminGet, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { formatDate } from "@/lib/format";
import { FilterBar } from "@/components/admin/FilterBar";
import { DataTable, EmptyState, NoAccess, PageHeader, Pagination } from "@/components/admin/ui";
import {
  ContentStatus,
  ContentTabs,
  NewContentButton,
  TitleCell,
} from "@/components/admin/content/content-pages";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, AdminPage } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "content.view")) return <NoAccess what="website pages" />;

  const filters = await searchParams;
  const list = await adminGet<AdminList<AdminPage>>("pages", filters);

  return (
    <>
      <PageHeader
        title="Pages"
        description="Website pages at their own address — FAQs, delivery, terms, privacy and services. Flag a page to link it in the footer."
        actions={
          can(session, "content.create") && (
            <NewContentButton endpoint="pages" label="New page" redirectTo="/admin/pages/:id" />
          )
        }
      />
      <ContentTabs path="/admin/pages" query={filters} counts={list.counts ?? {}} />
      <FilterBar placeholder="Title or address" />
      <DataTable
        caption="Pages"
        rows={list.data}
        empty={
          <EmptyState icon={Files} title="No pages here">
            Create the first one with “New page”.
          </EmptyState>
        }
        columns={[
          {
            key: "title",
            header: "Page",
            cell: (page) => (
              <TitleCell
                href={`/admin/pages/${page.id}`}
                title={page.title}
                detail={`/${page.slug}`}
                image={page.image_url}
              />
            ),
          },
          {
            key: "footer",
            header: "Footer",
            className: "max-md:hidden",
            cell: (page) => (page.show_in_footer ? "Linked" : "—"),
          },
          {
            key: "updated",
            header: "Updated",
            className: "max-md:hidden whitespace-nowrap",
            cell: (page) => formatDate(page.updated_at),
          },
          { key: "status", header: "Status", cell: (page) => <ContentStatus record={page} /> },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/pages" query={filters} />
    </>
  );
}
