import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
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
import type { AdminList, AdminPost } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Journal" };

export default async function PostsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "content.view")) return <NoAccess what="the journal" />;

  const filters = await searchParams;
  const list = await adminGet<AdminList<AdminPost> & { categories: string[] }>("posts", filters);

  return (
    <>
      <PageHeader
        title="Journal"
        description="Buying guides, care advice and project stories. Date a published article in the future to schedule it."
        actions={
          can(session, "content.create") && (
            <NewContentButton endpoint="posts" label="New article" redirectTo="/admin/posts/:id" />
          )
        }
      />
      <ContentTabs path="/admin/posts" query={filters} counts={list.counts ?? {}} />
      <FilterBar
        placeholder="Title or address"
        filters={[
          {
            type: "select",
            name: "category",
            label: "Categories",
            options: list.categories.map((category) => ({
              value: category
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, ""),
              label: category,
            })),
          },
        ]}
      />
      <DataTable
        caption="Articles"
        rows={list.data}
        empty={
          <EmptyState icon={BookOpen} title="No articles here">
            Write the first one with “New article”.
          </EmptyState>
        }
        columns={[
          {
            key: "title",
            header: "Article",
            cell: (post) => (
              <TitleCell
                href={`/admin/posts/${post.id}`}
                title={post.title}
                detail={`${post.category}${post.is_featured ? " · featured" : ""} · ${post.reading_minutes} min`}
                image={post.image_url}
              />
            ),
          },
          {
            key: "byline",
            header: "Byline",
            className: "max-lg:hidden",
            cell: (post) => post.byline,
          },
          {
            key: "published",
            header: "Published",
            className: "max-md:hidden whitespace-nowrap",
            cell: (post) => (post.published_at ? formatDate(post.published_at) : "—"),
          },
          { key: "status", header: "Status", cell: (post) => <ContentStatus record={post} /> },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/posts" query={filters} />
    </>
  );
}
