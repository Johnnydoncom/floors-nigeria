"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { naira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FieldShell, inputClass } from "../forms";
import { StatusBadge } from "../ui";
import { VariantFields, variantDraft, variantPayload, type CatalogueEnums } from "./ProductEditor";
import type { CatalogLookups, ProductDetail, Variant } from "@/lib/admin/types";

/**
 * A variable product's variations: one SKU per combination of options, each
 * with its own price, stock, size and images.
 */
export function VariationsPanel({
  product,
  catalog,
  enums,
  permissions,
}: {
  product: ProductDetail;
  catalog: CatalogLookups;
  enums: CatalogueEnums;
  permissions: { create: boolean; update: boolean; delete: boolean };
}) {
  const [editing, setEditing] = useState<Variant | "new" | null>(null);
  const [generatePrice, setGeneratePrice] = useState("");
  const { run, pending } = useAdminMutation();

  // Options come from the saved product, so save attribute changes first.
  const options = product.attributes
    .filter((config) => config.is_variation)
    .map((config) => {
      const attribute = catalog.attributes.find(
        (candidate) => candidate.id === config.attribute_id,
      );
      return {
        id: config.attribute_id,
        name: attribute?.name ?? config.name ?? "Option",
        terms: (attribute?.terms ?? []).filter((term) => config.term_ids.includes(term.id)),
      };
    })
    .filter((option) => option.terms.length > 0);

  const combinations = options.reduce(
    (total, option) => total * option.terms.length,
    options.length > 0 ? 1 : 0,
  );

  return (
    <div className="space-y-4">
      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
          No options yet. On the Attributes tab, add an attribute such as Colour, tick “Used for
          variations”, choose its terms and save — then come back to add variations.
        </p>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            Options:{" "}
            {options.map((option) => `${option.name} (${option.terms.length})`).join(" × ")} ={" "}
            {combinations} possible variation{combinations === 1 ? "" : "s"}.
          </p>
          {permissions.create && (
            <div className="flex flex-wrap items-end gap-2">
              <FieldShell id="gen-price" label="Price for new ones (₦)">
                <input
                  id="gen-price"
                  inputMode="decimal"
                  value={generatePrice}
                  onChange={(event) => setGeneratePrice(event.target.value)}
                  placeholder="Optional"
                  className={cn(inputClass, "w-36")}
                />
              </FieldShell>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    adminRequest("POST", `products/${product.id}/variants/generate`, {
                      price: generatePrice ? Number(generatePrice) : null,
                    }),
                  )
                }
                className="btn btn-outline h-10 rounded-md bg-background px-3 text-xs"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden />
                )}{" "}
                Create all missing
              </button>
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="btn btn-primary h-10 rounded-md px-3 text-xs"
              >
                <Plus className="h-4 w-4" aria-hidden /> Add one
              </button>
            </div>
          )}
        </div>
      )}

      {product.variants.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Variation
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  SKU
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Price
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Stock
                </th>
                <th scope="col" className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <VariationRow
                  key={variant.id}
                  productId={product.id}
                  variant={variant}
                  permissions={permissions}
                  onEdit={() => setEditing(variant)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {editing !== null && (
            <VariationForm
              key={editing === "new" ? "new" : editing.id}
              productId={product.id}
              variant={editing === "new" ? null : editing}
              options={options}
              enums={enums}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VariationRow({
  productId,
  variant,
  permissions,
  onEdit,
}: {
  productId: number;
  variant: Variant;
  permissions: { update: boolean; delete: boolean };
  onEdit: () => void;
}) {
  const { run, pending } = useAdminMutation();

  return (
    <tr
      className={cn(
        "border-b border-border last:border-0",
        !variant.is_active && "text-muted-foreground",
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {variant.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={variant.image_url}
              alt=""
              className="h-10 w-10 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-muted" />
          )}
          <div>
            <p className="font-medium">
              {variant.name}{" "}
              {variant.is_default && (
                <Star
                  className="inline h-3 w-3 fill-gold text-gold"
                  aria-label="Default variation"
                />
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {variant.terms.map((term) => term.label).join(" · ") || "No options"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs">{variant.sku}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {variant.sale_price !== null &&
        variant.price !== null &&
        variant.sale_price < variant.price ? (
          <>
            <span className="block">{naira(variant.sale_price)}</span>
            <span className="text-xs text-muted-foreground line-through">
              {naira(variant.price)}
            </span>
          </>
        ) : (
          naira(variant.price)
        )}
        <span className="block text-[11px] text-muted-foreground">
          {variant.selling_unit_label}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          value={variant.stock_status}
          label={
            variant.stock_quantity === null
              ? variant.stock_status_label
              : `${variant.stock_status_label} · ${variant.stock_quantity}`
          }
        />
        {!variant.is_active && <p className="mt-1 text-[11px]">Hidden</p>}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex gap-1">
          {permissions.update && !variant.is_default && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    adminRequest("PATCH", `products/${productId}/variants/${variant.id}`, {
                      is_default: true,
                    }),
                  { success: "Default variation changed." },
                )
              }
              className="inline-flex h-8 items-center rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Make default
            </button>
          )}
          {permissions.update && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${variant.name}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          {permissions.delete && (
            <button
              type="button"
              disabled={pending}
              aria-label={`Remove ${variant.name}`}
              onClick={() => {
                if (
                  window.confirm(`Remove ${variant.sku}? Quotes that used it keep their lines.`)
                ) {
                  void run(() =>
                    adminRequest("DELETE", `products/${productId}/variants/${variant.id}`),
                  );
                }
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function VariationForm({
  productId,
  variant,
  options,
  enums,
  onDone,
}: {
  productId: number;
  variant: Variant | null;
  options: { id: number; name: string; terms: { id: number; label: string }[] }[];
  enums: CatalogueEnums;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(() => variantDraft(variant));
  const [name, setName] = useState(variant?.name ?? "");
  const [terms, setTerms] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      options.map((option) => [
        option.id,
        String(variant?.terms.find((term) => term.attribute_id === option.id)?.id ?? ""),
      ]),
    ),
  );
  const { run, pending, errors } = useAdminMutation();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await run(
      () =>
        adminRequest(
          variant ? "PATCH" : "POST",
          variant
            ? `products/${productId}/variants/${variant.id}`
            : `products/${productId}/variants`,
          {
            ...variantPayload(draft),
            name: name.trim() || null,
            term_ids: Object.values(terms).filter(Boolean).map(Number),
          },
        ),
      { success: variant ? "Variation saved." : "Variation added." },
    );
    if (result) onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <DialogHeader>
        <DialogTitle>{variant ? `Edit ${variant.name}` : "New variation"}</DialogTitle>
        <DialogDescription>
          Pick one value for each option. The name is generated from them if left blank.
        </DialogDescription>
      </DialogHeader>
      {errors.term_ids && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {errors.term_ids[0]}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {options.map((option) => (
          <FieldShell key={option.id} id={`term-${option.id}`} label={option.name} required>
            <select
              id={`term-${option.id}`}
              value={terms[option.id] ?? ""}
              onChange={(event) => setTerms({ ...terms, [option.id]: event.target.value })}
              className={inputClass}
            >
              <option value="">Choose…</option>
              {option.terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label}
                </option>
              ))}
            </select>
          </FieldShell>
        ))}
        <FieldShell id="variant-name" label="Name" error={errors.name?.[0]}>
          <input
            id="variant-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Auto"
            className={inputClass}
          />
        </FieldShell>
      </div>
      <VariantFields draft={draft} onChange={setDraft} enums={enums} errors={errors} />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary h-10 rounded-md px-5 text-xs"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{" "}
          {variant ? "Save variation" : "Add variation"}
        </button>
      </div>
    </form>
  );
}
