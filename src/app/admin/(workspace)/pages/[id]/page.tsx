import type { Metadata } from "next";
import { adminGet, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { ContentEditor } from "@/components/admin/content/ContentEditor";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import type { AdminPage } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "content.view")) return <NoAccess what="website pages" />;

  const { id } = await params;
  const { data: page } = await adminGet<{ data: AdminPage }>(`pages/${Number(id)}`);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/pages", label: "Pages" }}
        eyebrow={`/${page.slug}`}
        title={page.title}
      />
      <ContentEditor
        key={page.updated_at ?? page.id}
        kind="pages"
        record={page}
        editable={can(session, "content.update")}
        canDelete={can(session, "content.delete")}
      />
    </>
  );
}
