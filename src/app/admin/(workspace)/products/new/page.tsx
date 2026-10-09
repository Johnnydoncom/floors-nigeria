import type { Metadata } from "next";
import { getCatalogLookups, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { ProductEditor } from "@/components/admin/catalogue/ProductEditor";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { editorEnums, editorPermissions } from "../editor-props";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const session = await requireSession();
  if (!can(session, "products.create")) return <NoAccess what="adding products" />;

  const [lookups, catalog] = await Promise.all([getLookups(), getCatalogLookups()]);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title="New product"
        description="Start with the details and a category; images and documents follow once it exists."
      />
      <ProductEditor
        product={null}
        catalog={catalog}
        enums={editorEnums(lookups)}
        permissions={editorPermissions(session)}
      />
    </>
  );
}
