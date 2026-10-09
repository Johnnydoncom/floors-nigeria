"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Loader2, Star } from "lucide-react";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { formatDate, naira } from "@/lib/format";
import { StatusBadge } from "../ui";
import type { ProductRow } from "@/lib/admin/types";

const ACTIONS = [
  { value: "publish", label: "Publish" },
  { value: "draft", label: "Move to draft" },
  { value: "archive", label: "Archive" },
  { value: "feature", label: "Feature" },
  { value: "unfeature", label: "Unfeature" },
  { value: "delete", label: "Move to bin" },
];

function price(product: ProductRow): string {
  if (product.price_from === null) return "No price";
  if (product.price_to !== null && product.price_to > product.price_from)
    return `${naira(product.price_from)} – ${naira(product.price_to)}`;
  return naira(product.price_from);
}

/**
 * The catalogue table, with selection for bulk publishing, archiving and
 * featuring.
 */
export function ProductTable({
  products,
  canUpdate,
  canDelete,
  trashed,
}: {
  products: ProductRow[];
  canUpdate: boolean;
  canDelete: boolean;
  trashed: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [action, setAction] = useState("");
  const { run, pending } = useAdminMutation();
  const selectable = (canUpdate || canDelete) && !trashed;
  const allSelected = products.length > 0 && selected.length === products.length;

  async function apply() {
    if (!action || selected.length === 0) return;
    if (
      action === "delete" &&
      !window.confirm(
        `Move ${selected.length} product(s) to the bin? They leave the website but can be restored.`,
      )
    )
      return;
    const result = await run(() =>
      adminRequest("POST", "products/bulk", { ids: selected, action }),
    );
    if (result) {
      setSelected([]);
      setAction("");
    }
  }

  return (
    <div>
      {selectable && selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            aria-label="Bulk action"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">Choose an action…</option>
            {ACTIONS.filter((option) => (option.value === "delete" ? canDelete : canUpdate)).map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
          <button
            type="button"
            disabled={!action || pending}
            onClick={apply}
            className="btn btn-primary h-8 rounded-md px-3 text-xs"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Apply
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <caption className="sr-only">Products</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              {selectable && (
                <th scope="col" className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={(event) =>
                      setSelected(event.target.checked ? products.map((product) => product.id) : [])
                    }
                  />
                </th>
              )}
              <th scope="col" className="px-4 py-2.5 font-medium">
                Product
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium max-md:hidden">
                Category
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Price
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium max-lg:hidden">
                Variations
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium max-lg:hidden">
                Updated
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-border last:border-0 hover:bg-muted/40"
              >
                {selectable && (
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${product.name}`}
                      checked={selected.includes(product.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, product.id]
                            : current.filter((id) => id !== product.id),
                        )
                      }
                    />
                  </td>
                )}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {product.thumb_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.thumb_url}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-11 w-11 shrink-0 rounded bg-muted" />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      {product.is_featured && (
                        <Star
                          className="ml-1 inline h-3 w-3 fill-gold text-gold"
                          aria-label="Featured"
                        />
                      )}
                      <p className="truncate text-xs text-muted-foreground">
                        {product.type_label}
                        {product.sku_family && ` · ${product.sku_family}`}
                        {product.brand && ` · ${product.brand}`}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 max-md:hidden">{product.category?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{price(product)}</td>
                <td className="px-4 py-2.5 max-lg:hidden">
                  {product.active_variant_count}/{product.variant_count}
                  {(product.stock.low > 0 || product.stock.out > 0) && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" aria-hidden />{" "}
                      {product.stock.out > 0
                        ? `${product.stock.out} out`
                        : `${product.stock.low} low`}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 max-lg:hidden">
                  {formatDate(product.updated_at)}
                </td>
                <td className="px-4 py-2.5">
                  {product.deleted_at ? (
                    <StatusBadge value="cancelled" label="In the bin" />
                  ) : (
                    <StatusBadge value={product.status} label={product.status_label} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No products match.</p>
        )}
      </div>
    </div>
  );
}
