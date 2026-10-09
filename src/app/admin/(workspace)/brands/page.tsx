import type { Metadata } from "next";
import { Pencil, Plus } from "lucide-react";
import { adminGet, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { ConfirmAction } from "@/components/admin/actions";
import { ImageButton } from "@/components/admin/catalogue/ImageButton";
import { FormDialog, type FieldSpec } from "@/components/admin/forms";
import { DataTable, NoAccess, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import type { Brand, CollectionRow } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Brands & collections" };

const BRAND_FIELDS: FieldSpec[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "country", label: "Country", type: "text" },
  { name: "website", label: "Website", type: "url", placeholder: "https://" },
  { name: "sort_order", label: "Order", type: "number", min: 0 },
  { name: "description", label: "Description", type: "textarea", wide: true },
  { name: "is_active", label: "Shown on the website", type: "switch" },
];

function collectionFields(brands: Brand[]): FieldSpec[] {
  return [
    { name: "name", label: "Name", type: "text", required: true },
    {
      name: "brand_id",
      label: "Brand",
      type: "select",
      options: brands.map((brand) => ({ value: String(brand.id), label: brand.name })),
    },
    { name: "sort_order", label: "Order", type: "number", min: 0 },
    { name: "description", label: "Description", type: "textarea", wide: true },
    { name: "is_active", label: "Shown on the website", type: "switch" },
    { name: "is_featured", label: "Featured", type: "switch" },
  ];
}

export default async function BrandsPage() {
  const session = await requireSession();
  if (!can(session, "brands.view", "collections.view"))
    return <NoAccess what="brands and collections" />;

  const [brands, collections] = await Promise.all([
    can(session, "brands.view")
      ? adminGet<{ data: Brand[] }>("brands").then((response) => response.data)
      : Promise.resolve([] as Brand[]),
    can(session, "collections.view")
      ? adminGet<{ data: CollectionRow[] }>("collections").then((response) => response.data)
      : Promise.resolve([] as CollectionRow[]),
  ]);

  return (
    <>
      <PageHeader
        title="Brands & collections"
        description="Manufacturers and the ranges products are grouped into."
      />
      <div className="space-y-6">
        {can(session, "brands.view") && (
          <Panel
            title="Brands"
            padded={false}
            actions={
              can(session, "brands.create") && (
                <FormDialog
                  title="New brand"
                  trigger={
                    <button type="button" className="btn btn-primary h-8 rounded-md px-3 text-xs">
                      <Plus className="h-3.5 w-3.5" aria-hidden /> New brand
                    </button>
                  }
                  fields={BRAND_FIELDS}
                  initial={{ is_active: true, sort_order: 0 }}
                  endpoint="brands"
                  successMessage="Brand added."
                />
              )
            }
          >
            <DataTable
              caption="Brands"
              rows={brands}
              empty={<p className="p-5 text-sm text-muted-foreground">No brands yet.</p>}
              columns={[
                {
                  key: "logo",
                  header: <span className="sr-only">Logo</span>,
                  className: "w-16",
                  cell: (brand) => (
                    <ImageButton
                      type="brand"
                      id={brand.id}
                      url={brand.image_url}
                      label={brand.name}
                      editable={can(session, "brands.update")}
                    />
                  ),
                },
                {
                  key: "name",
                  header: "Brand",
                  cell: (brand) => <span className="font-medium">{brand.name}</span>,
                },
                {
                  key: "country",
                  header: "Country",
                  className: "max-md:hidden",
                  cell: (brand) => brand.country ?? "—",
                },
                {
                  key: "products",
                  header: "Products",
                  className: "tabular-nums",
                  cell: (brand) => brand.product_count,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (brand) => (
                    <StatusBadge
                      value={brand.is_active ? "active" : "draft"}
                      label={brand.is_active ? "Live" : "Hidden"}
                    />
                  ),
                },
                {
                  key: "actions",
                  header: <span className="sr-only">Actions</span>,
                  className: "text-right",
                  cell: (brand) => (
                    <div className="inline-flex gap-1">
                      {can(session, "brands.update") && (
                        <FormDialog
                          title={`Edit ${brand.name}`}
                          trigger={
                            <button
                              type="button"
                              aria-label={`Edit ${brand.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          }
                          fields={BRAND_FIELDS}
                          initial={brand}
                          endpoint={`brands/${brand.id}`}
                          method="PATCH"
                        />
                      )}
                      {can(session, "brands.delete") && (
                        <ConfirmAction
                          endpoint={`brands/${brand.id}`}
                          variant="ghost"
                          title={`Delete ${brand.name}?`}
                          description="Its products and collections stay, without a brand."
                          success="Brand deleted."
                        >
                          Delete
                        </ConfirmAction>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Panel>
        )}

        {can(session, "collections.view") && (
          <Panel
            title="Collections"
            padded={false}
            actions={
              can(session, "collections.create") && (
                <FormDialog
                  title="New collection"
                  trigger={
                    <button type="button" className="btn btn-primary h-8 rounded-md px-3 text-xs">
                      <Plus className="h-3.5 w-3.5" aria-hidden /> New collection
                    </button>
                  }
                  fields={collectionFields(brands)}
                  initial={{ is_active: true, sort_order: 0 }}
                  endpoint="collections"
                  successMessage="Collection added."
                />
              )
            }
          >
            <DataTable
              caption="Collections"
              rows={collections}
              empty={<p className="p-5 text-sm text-muted-foreground">No collections yet.</p>}
              columns={[
                {
                  key: "image",
                  header: <span className="sr-only">Image</span>,
                  className: "w-16",
                  cell: (collection) => (
                    <ImageButton
                      type="collection"
                      id={collection.id}
                      url={collection.image_url}
                      label={collection.name}
                      editable={can(session, "collections.update")}
                    />
                  ),
                },
                {
                  key: "name",
                  header: "Collection",
                  cell: (collection) => <span className="font-medium">{collection.name}</span>,
                },
                {
                  key: "brand",
                  header: "Brand",
                  className: "max-md:hidden",
                  cell: (collection) => collection.brand ?? "—",
                },
                {
                  key: "products",
                  header: "Products",
                  className: "tabular-nums",
                  cell: (collection) => collection.product_count,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (collection) => (
                    <StatusBadge
                      value={collection.is_active ? "active" : "draft"}
                      label={
                        collection.is_active
                          ? collection.is_featured
                            ? "Live · featured"
                            : "Live"
                          : "Hidden"
                      }
                    />
                  ),
                },
                {
                  key: "actions",
                  header: <span className="sr-only">Actions</span>,
                  className: "text-right",
                  cell: (collection) => (
                    <div className="inline-flex gap-1">
                      {can(session, "collections.update") && (
                        <FormDialog
                          title={`Edit ${collection.name}`}
                          trigger={
                            <button
                              type="button"
                              aria-label={`Edit ${collection.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          }
                          fields={collectionFields(brands)}
                          initial={collection}
                          endpoint={`collections/${collection.id}`}
                          method="PATCH"
                        />
                      )}
                      {can(session, "collections.delete") && (
                        <ConfirmAction
                          endpoint={`collections/${collection.id}`}
                          variant="ghost"
                          title={`Delete ${collection.name}?`}
                          description="Its products stay, outside any collection."
                          success="Collection deleted."
                        >
                          Delete
                        </ConfirmAction>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Panel>
        )}
      </div>
    </>
  );
}
