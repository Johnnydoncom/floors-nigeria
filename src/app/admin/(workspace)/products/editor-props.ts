import { can } from "@/lib/admin/permissions";
import type { CatalogueEnums, EditorPermissions } from "@/components/admin/catalogue/ProductEditor";
import type { AdminSession, Lookups } from "@/lib/admin/types";

export function editorEnums(lookups: Lookups): CatalogueEnums {
  const { product_status, product_type, stock_status, selling_unit, document_type } = lookups.enums;
  return { product_status, product_type, stock_status, selling_unit, document_type };
}

export function editorPermissions(session: AdminSession): EditorPermissions {
  return {
    update: can(session, "products.update"),
    variants: {
      create: can(session, "variants.create"),
      update: can(session, "variants.update"),
      delete: can(session, "variants.delete"),
    },
    media: {
      create: can(session, "media.create"),
      update: can(session, "media.update"),
      delete: can(session, "media.delete"),
    },
    documents: {
      create: can(session, "documents.create"),
      delete: can(session, "documents.delete"),
    },
  };
}
