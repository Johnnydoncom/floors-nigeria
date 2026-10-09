import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { adminGet, getCatalogLookups, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { FilterBar } from "@/components/admin/FilterBar";
import { ProductTable } from "@/components/admin/catalogue/ProductTable";
import { NoAccess, PageHeader, Pagination, StatusTabs, first } from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, ProductRow } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "products.view")) return <NoAccess what="the catalogue" />;

  const query = await searchParams;
  const status = first(query.status);
  const apiQuery = status === "trashed" ? { ...query, status: undefined, trashed: "only" } : query;
  const [list, lookups, catalog] = await Promise.all([
    adminGet<AdminList<ProductRow>>("products", apiQuery),
    getLookups(),
    getCatalogLookups(),
  ]);
  const counts = list.counts ?? {};

  return (
    <>
      <PageHeader
        title="Products"
        description="The catalogue: simple and variable products, their variations, images and documents."
        actions={
          can(session, "products.create") && (
            <Link
              href="/admin/products/new"
              className="btn btn-primary h-9 rounded-md px-4 text-xs"
            >
              <Plus className="h-4 w-4" aria-hidden /> New product
            </Link>
          )
        }
      />
      <StatusTabs
        path="/admin/products"
        query={query}
        tabs={[
          { value: "", label: "All", count: counts.all },
          ...lookups.enums.product_status.map((option) => ({
            ...option,
            count: counts[option.value],
          })),
          ...(can(session, "products.delete")
            ? [{ value: "trashed", label: "Bin", count: counts.trashed }]
            : []),
        ]}
      />
      <FilterBar
        placeholder="Name, SKU family or variation SKU"
        filters={[
          {
            type: "select",
            name: "category",
            label: "Categories",
            options: catalog.categories.map((category) => ({
              value: String(category.id),
              label: `${"— ".repeat(category.depth)}${category.name}`,
            })),
          },
          { type: "select", name: "type", label: "Types", options: lookups.enums.product_type },
          ...(catalog.brands.length > 0
            ? [
                {
                  type: "select" as const,
                  name: "brand",
                  label: "Brands",
                  options: catalog.brands.map((brand) => ({
                    value: String(brand.id),
                    label: brand.name,
                  })),
                },
              ]
            : []),
          {
            type: "select",
            name: "stock",
            label: "Stock",
            allLabel: "Any stock",
            options: [
              { value: "any", label: "Low or out of stock" },
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
            ],
          },
          {
            type: "select",
            name: "sort",
            label: "Sort",
            allLabel: "Recently updated",
            options: [
              { value: "name", label: "Name A–Z" },
              { value: "-created", label: "Newest" },
              { value: "price", label: "Price, low first" },
              { value: "-price", label: "Price, high first" },
            ],
          },
        ]}
      />
      <ProductTable
        products={list.data}
        canUpdate={can(session, "products.update")}
        canDelete={can(session, "products.delete")}
        trashed={status === "trashed"}
      />
      <Pagination meta={list.meta} path="/admin/products" query={query} />
    </>
  );
}
