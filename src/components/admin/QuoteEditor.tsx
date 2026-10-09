"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { naira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RecordPicker, inputClass } from "./forms";
import type { Option, QuoteItem } from "@/lib/admin/types";

type Line = {
  key: string;
  id: number | null;
  product_variant_id: number | null;
  productLabel: string | null;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  discount: string;
  note: string;
};

function toLine(item: QuoteItem): Line {
  return {
    key: `i${item.id}`,
    id: item.id,
    product_variant_id: item.product_variant_id,
    productLabel: item.product_name
      ? `${item.product_name}${item.variant_sku ? ` · ${item.variant_sku}` : ""}`
      : null,
    description: item.description,
    quantity: String(item.quantity),
    unit: item.unit,
    unit_price: String(item.unit_price),
    discount: item.discount ? String(item.discount) : "",
    note: item.note ?? "",
  };
}

let counter = 0;

function blankLine(): Line {
  counter += 1;
  return {
    key: `n${counter}`,
    id: null,
    product_variant_id: null,
    productLabel: null,
    description: "",
    quantity: "1",
    unit: "sqm",
    unit_price: "0",
    discount: "",
    note: "",
  };
}

function lineTotal(line: Line): number {
  return Math.max(
    0,
    (Number(line.quantity) || 0) * (Number(line.unit_price) || 0) - (Number(line.discount) || 0),
  );
}

/**
 * The priced lines of a quote. Pick a product variation to fill the price and
 * unit, or write a custom line (labour, delivery, trims). The whole table is
 * saved at once, so totals are never half-updated.
 */
export function QuoteEditor({
  quoteId,
  items,
  taxTotal,
  vatEnabled,
  vatRate,
  units,
  editable,
}: {
  quoteId: number;
  items: QuoteItem[];
  taxTotal: number;
  vatEnabled: boolean;
  vatRate: number;
  units: Option[];
  editable: boolean;
}) {
  const [lines, setLines] = useState<Line[]>(() =>
    items.length > 0 ? items.map(toLine) : editable ? [blankLine()] : [],
  );
  const [applyVat, setApplyVat] = useState(taxTotal > 0 || (items.length === 0 && vatEnabled));
  const [dirty, setDirty] = useState(false);
  const { run, pending, errors } = useAdminMutation();

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);
    const discount = lines.reduce((sum, line) => sum + (Number(line.discount) || 0), 0);
    const tax = applyVat ? Math.round(subtotal * vatRate) / 100 : 0;
    return { subtotal, discount, tax, total: subtotal + tax };
  }, [lines, applyVat, vatRate]);

  function update(key: string, changes: Partial<Line>) {
    setDirty(true);
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
  }

  async function save() {
    const result = await run(
      () =>
        adminRequest("PUT", `quotes/${quoteId}/items`, {
          apply_vat: applyVat,
          items: lines
            .filter((line) => line.description.trim() !== "")
            .map((line) => ({
              id: line.id,
              product_variant_id: line.product_variant_id,
              description: line.description.trim(),
              quantity: Number(line.quantity) || 0,
              unit: line.unit,
              unit_price: Number(line.unit_price) || 0,
              discount: Number(line.discount) || 0,
              note: line.note || null,
            })),
        }),
      { success: "Quote priced and saved." },
    );
    if (result) setDirty(false);
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">
                Item
              </th>
              <th scope="col" className="w-24 py-2 pr-3 font-medium">
                Qty
              </th>
              <th scope="col" className="w-28 py-2 pr-3 font-medium">
                Unit
              </th>
              <th scope="col" className="w-32 py-2 pr-3 font-medium">
                Unit price (₦)
              </th>
              <th scope="col" className="w-28 py-2 pr-3 font-medium">
                Discount (₦)
              </th>
              <th scope="col" className="w-32 py-2 text-right font-medium">
                Line total
              </th>
              {editable && <th scope="col" className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const error = (field: string) => errors[`items.${index}.${field}`]?.[0];
              return (
                <tr key={line.key} className="border-b border-border align-top">
                  <td className="py-2 pr-3">
                    {editable ? (
                      <div className="space-y-1.5">
                        <RecordPicker
                          type="variants"
                          value={line.product_variant_id}
                          label={line.productLabel}
                          placeholder="Product (optional) — search name or SKU"
                          onChange={(picked) =>
                            update(
                              line.key,
                              picked
                                ? {
                                    product_variant_id: picked.id,
                                    productLabel: `${picked.label} · ${picked.detail ?? ""}`,
                                    description: picked.label,
                                    unit_price: String(picked.price ?? 0),
                                    unit: picked.unit ?? line.unit,
                                  }
                                : { product_variant_id: null, productLabel: null },
                            )
                          }
                        />
                        <input
                          value={line.description}
                          onChange={(event) =>
                            update(line.key, { description: event.target.value })
                          }
                          placeholder="Description — e.g. Installation labour"
                          aria-label={`Line ${index + 1} description`}
                          aria-invalid={error("description") ? true : undefined}
                          className={inputClass}
                        />
                        <input
                          value={line.note}
                          onChange={(event) => update(line.key, { note: event.target.value })}
                          placeholder="Note for the customer (optional)"
                          aria-label={`Line ${index + 1} note`}
                          className={cn(inputClass, "h-8 text-xs")}
                        />
                      </div>
                    ) : (
                      <div>
                        <p>{line.description}</p>
                        {line.productLabel && (
                          <p className="text-xs text-muted-foreground">{line.productLabel}</p>
                        )}
                        {line.note && <p className="text-xs text-muted-foreground">{line.note}</p>}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {editable ? (
                      <input
                        inputMode="decimal"
                        value={line.quantity}
                        onChange={(event) => update(line.key, { quantity: event.target.value })}
                        aria-label={`Line ${index + 1} quantity`}
                        aria-invalid={error("quantity") ? true : undefined}
                        className={inputClass}
                      />
                    ) : (
                      line.quantity
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {editable ? (
                      <select
                        value={line.unit}
                        onChange={(event) => update(line.key, { unit: event.target.value })}
                        aria-label={`Line ${index + 1} unit`}
                        className={inputClass}
                      >
                        {units.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      (units.find((unit) => unit.value === line.unit)?.label ?? line.unit)
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {editable ? (
                      <input
                        inputMode="decimal"
                        value={line.unit_price}
                        onChange={(event) => update(line.key, { unit_price: event.target.value })}
                        aria-label={`Line ${index + 1} unit price`}
                        aria-invalid={error("unit_price") ? true : undefined}
                        className={inputClass}
                      />
                    ) : (
                      naira(Number(line.unit_price))
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {editable ? (
                      <input
                        inputMode="decimal"
                        value={line.discount}
                        onChange={(event) => update(line.key, { discount: event.target.value })}
                        placeholder="0"
                        aria-label={`Line ${index + 1} discount`}
                        aria-invalid={error("discount") ? true : undefined}
                        className={inputClass}
                      />
                    ) : line.discount ? (
                      naira(Number(line.discount))
                    ) : (
                      "—"
                    )}
                    {error("discount") && (
                      <p className="mt-1 text-xs text-destructive">{error("discount")}</p>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{naira(lineTotal(line))}</td>
                  {editable && (
                    <td className="py-2 pl-2">
                      <button
                        type="button"
                        aria-label={`Remove line ${index + 1}`}
                        onClick={() => {
                          setDirty(true);
                          setLines((current) =>
                            current.filter((candidate) => candidate.key !== line.key),
                          );
                        }}
                        className="inline-flex h-10 w-8 items-center justify-center text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lines.length === 0 && <p className="py-4 text-sm text-muted-foreground">No priced lines.</p>}

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {editable && (
            <button
              type="button"
              onClick={() => {
                setDirty(true);
                setLines((current) => [...current, blankLine()]);
              }}
              className="btn btn-outline h-9 rounded-md bg-background px-3 text-xs"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add line
            </button>
          )}
          {editable && (
            <label className="inline-flex items-center gap-2 text-xs">
              <Switch
                checked={applyVat}
                onCheckedChange={(checked) => {
                  setDirty(true);
                  setApplyVat(checked);
                }}
                aria-label="Add VAT"
              />
              Add VAT at {vatRate}%
            </label>
          )}
        </div>
        <dl className="w-full max-w-xs space-y-1 text-sm sm:ml-auto">
          {totals.discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>Discounts</dt>
              <dd className="tabular-nums">−{naira(totals.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{naira(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>VAT</dt>
            <dd className="tabular-nums">{naira(totals.tax)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{naira(totals.total)}</dd>
          </div>
        </dl>
      </div>

      {editable && (
        <div className="mt-4 flex items-center justify-end gap-3">
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="btn btn-primary h-10 rounded-md px-5 text-xs"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save pricing
          </button>
        </div>
      )}
    </div>
  );
}
