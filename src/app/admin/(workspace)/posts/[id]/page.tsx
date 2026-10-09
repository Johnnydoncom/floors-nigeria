import type { Metadata } from "next";
import { adminGet, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { ContentEditor } from "@/components/admin/content/ContentEditor";
import { floorOptions } from "@/components/admin/content/content-pages";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import type { AdminList, AdminPost } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Edit article" };

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "content.view")) return <NoAccess what="the journal" />;

  const { id } = await params;
  const [{ data: post }, list, floors] = await Promise.all([
    adminGet<{ data: AdminPost }>(`posts/${Number(id)}`),
    adminGet<AdminList<AdminPost> & { categories: string[] }>("posts", { per_page: 5 }),
    floorOptions(),
  ]);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/posts", label: "Journal" }}
        eyebrow={post.category}
        title={post.title}
      />
      <ContentEditor
        key={post.updated_at ?? post.id}
        kind="posts"
        record={post}
        editable={can(session, "content.update")}
        canDelete={can(session, "content.delete")}
        floorOptions={floors}
        categories={list.categories}
      />
    </>
  );
}
