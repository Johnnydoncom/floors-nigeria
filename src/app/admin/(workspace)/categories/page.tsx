import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { adminGet, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { ConfirmAction } from "@/components/admin/actions";
import { ImageButton } from "@/components/admin/catalogue/ImageButton";
import { FormDialog, type FieldSpec } from "@/components/admin/forms";
import { DataTable, NoAccess, PageHeader, StatusBadge } from "@/components/admin/ui";
import type { Category } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Categories" };

function fields(categories: Category[], self?: Category): FieldSpec[] {
  return [
    { name: "name", label: "Name", type: "text", required: true },
    {
      name: "parent_id",
      label: "Inside",
      type: "select",
      placeholder: "— Top level —",
      options: categories
        .filter((category) => category.id !== self?.id)
        .map((category) => ({
          value: String(category.id),
          label: `${"— ".repeat(category.depth)}${category.name}`,
        })),
    },
    { name: "short_description", label: "Short description", type: "textarea", wide: true },
    { name: "description", label: "Description", type: "textarea", wide: true },
    {
      name: "default_waste_percentage",
      label: "Default waste allowance (%)",
      type: "number",
      min: 0,
      max: 50,
      step: "any",
      help: "Used by the calculator for products without their own.",
    },
    { name: "sort_order", label: "Order", type: "number", min: 0 },
    { name: "slug", label: "URL slug", type: "text", help: "Blank generates one from the name." },
    { name: "is_active", label: "Shown on the website", type: "switch" },
    { name: "is_featured", label: "Featured", type: "switch" },
  ];
}

/** The category tree — configurable from the admin, as §5 asks. */
export default async function CategoriesPage() {
  const session = await requireSession();
  if (!can(session, "categories.view")) return <NoAccess what="categories" />;

  const { data: categories } = await adminGet<{ data: Category[] }>("categories");
  const canUpdate = can(session, "categories.update");

  return (
    <>
      <PageHeader
        title="Categories"
        description="The shop's category tree. A product can sit in several; its main category drives breadcrumbs and the waste default."
        actions={
          can(session, "categories.create") && (
            <FormDialog
              wide
              title="New category"
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New category
                </button>
              }
              fields={fields(categories)}
              initial={{ is_active: true, default_waste_percentage: 10, sort_order: 0 }}
              endpoint="categories"
              successMessage="Category added."
            />
          )
        }
      />
      <DataTable
        caption="Categories"
        rows={categories}
        columns={[
          {
            key: "image",
            header: <span className="sr-only">Image</span>,
            className: "w-16",
            cell: (category) => (
              <ImageButton
                type="category"
                id={category.id}
                url={category.image_url}
                label={category.name}
                editable={canUpdate}
              />
            ),
          },
          {
            key: "name",
            header: "Category",
            cell: (category) => (
              <div style={{ paddingLeft: `${category.depth * 1.25}rem` }}>
                <span className="font-medium">
                  {category.depth > 0 && <span className="text-muted-foreground">└ </span>}
                  {category.name}
                </span>
                <p className="text-xs text-muted-foreground">/{category.slug}</p>
              </div>
            ),
          },
          {
            key: "products",
            header: "Products",
            className: "tabular-nums",
            cell: (category) => (
              <Link href={`/admin/products?category=${category.id}`} className="hover:underline">
                {category.product_count}
              </Link>
            ),
          },
          {
            key: "waste",
            header: "Waste",
            className: "tabular-nums max-md:hidden",
            cell: (category) => `${category.default_waste_percentage ?? 10}%`,
          },
          {
            key: "status",
            header: "Status",
            cell: (category) => (
              <StatusBadge
                value={category.is_active ? "active" : "draft"}
                label={
                  category.is_active
                    ? category.is_featured
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
            cell: (category) => (
              <div className="inline-flex gap-1">
                {canUpdate && (
                  <FormDialog
                    wide
                    title={`Edit ${category.name}`}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Edit ${category.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    }
                    fields={fields(categories, category)}
                    initial={{ ...category, parent_id: category.parent_id ?? "" }}
                    endpoint={`categories/${category.id}`}
                    method="PATCH"
                  />
                )}
                {can(session, "categories.delete") && (
                  <ConfirmAction
                    endpoint={`categories/${category.id}`}
                    variant="ghost"
                    title={`Delete ${category.name}?`}
                    description="Products stay, but lose this category. Subcategories move to the top level. A category that is any product's main category cannot be deleted."
                    success="Category deleted."
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
