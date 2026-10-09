import type { Metadata } from "next";
import { Pencil, Plus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { ConfirmAction } from "@/components/admin/actions";
import { ImageButton } from "@/components/admin/catalogue/ImageButton";
import { FormDialog, type FieldSpec } from "@/components/admin/forms";
import { DataTable, NoAccess, PageHeader, StatusBadge, StatusTabs } from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { Lookups, TaxonomyRow } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Rooms & styles" };

function fields(lookups: Lookups): FieldSpec[] {
  return [
    {
      name: "type",
      label: "Kind",
      type: "select",
      options: lookups.enums.taxonomy_type,
      required: true,
    },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "URL slug", type: "text", help: "Blank generates one from the name." },
    { name: "sort_order", label: "Order", type: "number", min: 0 },
    { name: "description", label: "Description", type: "textarea", wide: true },
    { name: "is_active", label: "Shown on the website", type: "switch" },
  ];
}

/** Rooms, styles, looks and suitable uses — they power the room pages and filters. */
export default async function TaxonomiesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "taxonomies.view")) return <NoAccess what="rooms and styles" />;

  const query = await searchParams;
  const [{ data: taxonomies }, lookups] = await Promise.all([
    adminGet<{ data: TaxonomyRow[] }>("taxonomies", {
      type: typeof query.type === "string" ? query.type : undefined,
    }),
    getLookups(),
  ]);
  const canUpdate = can(session, "taxonomies.update");

  return (
    <>
      <PageHeader
        title="Rooms & styles"
        description="Tag products by room, style, look and suitable use. Room pages and the shop filters read these."
        actions={
          can(session, "taxonomies.create") && (
            <FormDialog
              title="New tag"
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New tag
                </button>
              }
              fields={fields(lookups)}
              initial={{
                type: typeof query.type === "string" ? query.type : "room",
                is_active: true,
                sort_order: 0,
              }}
              endpoint="taxonomies"
              successMessage="Tag added."
            />
          )
        }
      />
      <StatusTabs
        path="/admin/taxonomies"
        param="type"
        query={query}
        tabs={[{ value: "", label: "All" }, ...lookups.enums.taxonomy_type]}
      />
      <DataTable
        caption="Rooms, styles, looks and uses"
        rows={taxonomies}
        columns={[
          {
            key: "image",
            header: <span className="sr-only">Image</span>,
            className: "w-16",
            cell: (taxonomy) => (
              <ImageButton
                type="taxonomy"
                id={taxonomy.id}
                url={taxonomy.image_url}
                label={taxonomy.name}
                editable={canUpdate}
              />
            ),
          },
          {
            key: "name",
            header: "Name",
            cell: (taxonomy) => <span className="font-medium">{taxonomy.name}</span>,
          },
          { key: "type", header: "Kind", cell: (taxonomy) => taxonomy.type_label },
          {
            key: "products",
            header: "Products",
            className: "tabular-nums",
            cell: (taxonomy) => taxonomy.product_count,
          },
          {
            key: "status",
            header: "Status",
            cell: (taxonomy) => (
              <StatusBadge
                value={taxonomy.is_active ? "active" : "draft"}
                label={taxonomy.is_active ? "Live" : "Hidden"}
              />
            ),
          },
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            className: "text-right",
            cell: (taxonomy) => (
              <div className="inline-flex gap-1">
                {canUpdate && (
                  <FormDialog
                    title={`Edit ${taxonomy.name}`}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Edit ${taxonomy.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    }
                    fields={fields(lookups)}
                    initial={taxonomy}
                    endpoint={`taxonomies/${taxonomy.id}`}
                    method="PATCH"
                  />
                )}
                {can(session, "taxonomies.delete") && (
                  <ConfirmAction
                    endpoint={`taxonomies/${taxonomy.id}`}
                    variant="ghost"
                    title={`Delete ${taxonomy.name}?`}
                    description="Products lose the tag; its landing page goes."
                    success="Deleted."
                  >
                    Delete
                  </ConfirmAction>
                )}
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
