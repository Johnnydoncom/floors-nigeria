import type { Metadata } from "next";
import { adminGet, getCatalogLookups, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { formatDateTime } from "@/lib/format";
import { ActionButton, ConfirmAction } from "@/components/admin/actions";
import { ProductEditor } from "@/components/admin/catalogue/ProductEditor";
import { NoAccess, PageHeader, StatusBadge } from "@/components/admin/ui";
import { editorEnums, editorPermissions } from "../editor-props";
import type { ProductDetail } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Product" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!can(session, "products.view")) return <NoAccess what="the catalogue" />;

  const { id } = await params;
  const [{ data: product }, lookups, catalog] = await Promise.all([
    adminGet<{ data: ProductDetail }>(`products/${Number(id)}`),
    getLookups(),
    getCatalogLookups(),
  ]);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        eyebrow={`${product.type === "variable" ? "Variable" : "Simple"} product · updated ${formatDateTime(product.updated_at)}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {product.name}
            {product.deleted_at ? (
              <StatusBadge value="cancelled" label="In the bin" />
            ) : (
              <StatusBadge value={product.status} label={product.status_label} />
            )}
          </span>
        }
        description={
          product.rating_count > 0
            ? `${product.rating_average} ★ from ${product.rating_count} reviews · ${product.view_count} views`
            : `${product.view_count} views`
        }
        actions={
          product.deleted_at
            ? can(session, "products.delete") && (
                <ActionButton
                  endpoint={`products/${product.id}/restore`}
                  variant="primary"
                  success="Product restored."
                >
                  Restore
                </ActionButton>
              )
            : can(session, "products.delete") && (
                <ConfirmAction
                  endpoint={`products/${product.id}`}
                  title={`Move ${product.name} to the bin?`}
                  description="It leaves the website straight away. Quotes that include it keep their history, and it can be restored from the bin."
                  confirmLabel="Move to bin"
                  redirectTo="/admin/products"
                  success="Moved to the bin."
                >
                  Move to bin
                </ConfirmAction>
              )
        }
      />
      {product.deleted_at ? (
        <p className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
          This product is in the bin. Restore it to edit.
        </p>
      ) : (
        <ProductEditor
          key={product.id}
          product={product}
          catalog={catalog}
          enums={editorEnums(lookups)}
          permissions={editorPermissions(session)}
        />
      )}
    </>
  );
}
