"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { adminRequest, AdminRequestError } from "@/lib/admin/client";
import { cn } from "@/lib/utils";
import { FieldShell, inputClass } from "../forms";
import { DocumentsPanel, MediaLibrary } from "./ProductMedia";
import { VariationsPanel } from "./VariationsPanel";
import type {
  CatalogLookups,
  Option,
  ProductAttributeConfig,
  ProductDetail,
  Variant,
} from "@/lib/admin/types";

export type CatalogueEnums = {
  product_status: Option[];
  product_type: Option[];
  stock_status: Option[];
  selling_unit: Option[];
  document_type: Option[];
};

export type EditorPermissions = {
  update: boolean;
  variants: { create: boolean; update: boolean; delete: boolean };
  media: { create: boolean; update: boolean; delete: boolean };
  documents: { create: boolean; delete: boolean };
};

const VARIANT_FIELDS = [
  "sku",
  "price",
  "sale_price",
  "selling_unit",
  "coverage_per_pack_sqm",
  "pieces_per_pack",
  "length_mm",
  "width_mm",
  "thickness_mm",
  "wear_layer_mm",
  "stock_status",
  "stock_quantity",
  "minimum_order_quantity",
  "lead_time_days",
] as const;

type VariantDraft = Record<(typeof VARIANT_FIELDS)[number], string> & { is_active: boolean };

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function variantDraft(variant?: Variant | null): VariantDraft {
  return {
    ...(Object.fromEntries(
      VARIANT_FIELDS.map((field) => [field, text(variant?.[field])]),
    ) as Record<(typeof VARIANT_FIELDS)[number], string>),
    selling_unit: variant?.selling_unit ?? "sqm",
    stock_status: variant?.stock_status ?? "in_stock",
    minimum_order_quantity: text(variant?.minimum_order_quantity ?? 1),
    is_active: variant?.is_active ?? true,
  };
}

const NUMERIC = new Set([
  "price",
  "sale_price",
  "coverage_per_pack_sqm",
  "pieces_per_pack",
  "length_mm",
  "width_mm",
  "thickness_mm",
  "wear_layer_mm",
  "stock_quantity",
  "minimum_order_quantity",
  "lead_time_days",
]);

export function variantPayload(draft: VariantDraft): Record<string, unknown> {
  const payload: Record<string, unknown> = { is_active: draft.is_active };
  for (const field of VARIANT_FIELDS) {
    const value = draft[field].trim();
    payload[field] =
      value === ""
        ? field === "minimum_order_quantity"
          ? 1
          : null
        : NUMERIC.has(field)
          ? Number(value)
          : value;
  }
  return payload;
}

/**
 * The product editor (§35: the catalogue, variants, swatches and media are
 * managed without a developer). Details, categories, attributes, pricing and
 * SEO save together; variations, images and documents save as you change
 * them.
 */
export function ProductEditor({
  product,
  catalog,
  enums,
  permissions,
}: {
  product: ProductDetail | null;
  catalog: CatalogLookups;
  enums: CatalogueEnums;
  permissions: EditorPermissions;
}) {
  const router = useRouter();
  const creating = product === null;
  const editable = creating || permissions.update;
  const defaultVariant =
    product?.variants.find((variant) => variant.is_default) ?? product?.variants[0] ?? null;

  const [details, setDetails] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    type: product?.type ?? "simple",
    status: product?.status ?? "draft",
    is_featured: product?.is_featured ?? false,
    sku_family: text(product?.sku_family),
    short_description: text(product?.short_description),
    description: text(product?.description),
    highlights: (product?.highlights ?? []).join("\n"),
    installation_notes: text(product?.installation_notes),
    care_notes: text(product?.care_notes),
    warranty: text(product?.warranty),
    waste_percentage: text(product?.waste_percentage),
    lead_time_days: text(product?.lead_time_days),
    brand_id: text(product?.brand_id),
    collection_id: text(product?.collection_id),
  });
  const [categoryIds, setCategoryIds] = useState<number[]>(product?.category_ids ?? []);
  const [primaryId, setPrimaryId] = useState<number | null>(product?.primary_category_id ?? null);
  const [taxonomyIds, setTaxonomyIds] = useState<number[]>(product?.taxonomy_ids ?? []);
  const [attributes, setAttributes] = useState<ProductAttributeConfig[]>(product?.attributes ?? []);
  const [variant, setVariant] = useState<VariantDraft>(() => variantDraft(defaultVariant));
  const [seo, setSeo] = useState({
    title: text(product?.seo.title),
    description: text(product?.seo.description),
    canonical: text(product?.seo.canonical),
    noindex: product?.seo.noindex ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("details");

  const isSimple = details.type === "simple";
  const error = (field: string) => errors[field]?.[0];

  function setDetail(field: keyof typeof details, value: string | boolean) {
    setDetails((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setErrors({});

    const payload = {
      ...details,
      slug: details.slug.trim() || null,
      sku_family: details.sku_family.trim() || null,
      highlights: details.highlights
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      waste_percentage: details.waste_percentage === "" ? null : Number(details.waste_percentage),
      lead_time_days: details.lead_time_days === "" ? null : Number(details.lead_time_days),
      brand_id: details.brand_id ? Number(details.brand_id) : null,
      collection_id: details.collection_id ? Number(details.collection_id) : null,
      category_ids: categoryIds,
      primary_category_id:
        primaryId && categoryIds.includes(primaryId) ? primaryId : (categoryIds[0] ?? null),
      taxonomy_ids: taxonomyIds,
      attributes: attributes.map((config) => ({
        attribute_id: config.attribute_id,
        is_visible: config.is_visible,
        is_variation: isSimple ? false : config.is_variation,
        term_ids: config.term_ids,
      })),
      seo: {
        title: seo.title || null,
        description: seo.description || null,
        canonical: seo.canonical || null,
        noindex: seo.noindex,
      },
      ...(isSimple ? { variant: variantPayload(variant) } : {}),
    };

    try {
      const response = await adminRequest<{ data: ProductDetail }>(
        creating ? "POST" : "PATCH",
        creating ? "products" : `products/${product.id}`,
        payload,
      );
      toast.success(creating ? "Product created." : "Product saved.");
      if (creating) router.push(`/admin/products/${response.data.id}`);
      else router.refresh();
    } catch (failure) {
      if (failure instanceof AdminRequestError) {
        setErrors(failure.errors);
        toast.error(failure.message);
        const fields = Object.keys(failure.errors);
        if (fields.some((field) => field.startsWith("variant."))) setTab("pricing");
        else if (
          fields.some((field) => field.startsWith("category") || field.startsWith("primary"))
        )
          setTab("categories");
        else if (fields.some((field) => field.startsWith("attributes"))) setTab("attributes");
        else if (fields.some((field) => field.startsWith("seo"))) setTab("seo");
        else setTab("details");
      } else {
        toast.error("Saving failed. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const collections = catalog.collections.filter(
    (collection) =>
      !details.brand_id || !collection.brand_id || String(collection.brand_id) === details.brand_id,
  );
  const taxonomyGroups = useMemo(() => {
    const groups = new Map<string, CatalogLookups["taxonomies"]>();
    for (const taxonomy of catalog.taxonomies)
      groups.set(taxonomy.type_label, [...(groups.get(taxonomy.type_label) ?? []), taxonomy]);
    return [...groups.entries()];
  }, [catalog.taxonomies]);

  return (
    <div>
      <Tabs value={tab} onValueChange={setTab}>
        <div className="sticky top-14 z-20 -mx-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0">
            {[
              ["details", "Details"],
              ["categories", "Categories & tags"],
              ["attributes", "Attributes"],
              [
                isSimple ? "pricing" : "variations",
                isSimple
                  ? "Pricing & stock"
                  : `Variations${product ? ` (${product.variants.length})` : ""}`,
              ],
              ...(creating
                ? []
                : [
                    ["media", `Images (${product.media.length})`],
                    ["documents", "Documents"],
                  ]),
              ["seo", "SEO"],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-charcoal-dark data-[state=active]:text-primary-foreground"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2">
            {product && (
              <a
                href={product.public_url}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                View on site <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
            {editable && (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="btn btn-primary h-9 rounded-md px-5 text-xs"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{" "}
                {creating ? "Create product" : "Save product"}
              </button>
            )}
          </div>
        </div>

        <TabsContent value="details" className="mt-0">
          <fieldset disabled={!editable} className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-4 rounded-lg border border-border bg-background p-5 lg:col-span-2">
              <FieldShell id="p-name" label="Name" required error={error("name")}>
                <input
                  id="p-name"
                  value={details.name}
                  onChange={(event) => setDetail("name", event.target.value)}
                  aria-invalid={error("name") ? true : undefined}
                  className={inputClass}
                />
              </FieldShell>
              <FieldShell
                id="p-short"
                label="Short description"
                help="One or two sentences for cards, search results and the meta description."
                error={error("short_description")}
              >
                <textarea
                  id="p-short"
                  rows={2}
                  value={details.short_description}
                  onChange={(event) => setDetail("short_description", event.target.value)}
                  className={cn(inputClass, "h-auto py-2")}
                />
              </FieldShell>
              <FieldShell
                id="p-desc"
                label="Description"
                help="Plain text; blank lines start new paragraphs."
                error={error("description")}
              >
                <textarea
                  id="p-desc"
                  rows={10}
                  value={details.description}
                  onChange={(event) => setDetail("description", event.target.value)}
                  className={cn(inputClass, "h-auto py-2")}
                />
              </FieldShell>
              <FieldShell
                id="p-highlights"
                label="Highlights"
                help="One per line — waterproof, scratch-resistant, 25-year warranty…"
                error={error("highlights")}
              >
                <textarea
                  id="p-highlights"
                  rows={4}
                  value={details.highlights}
                  onChange={(event) => setDetail("highlights", event.target.value)}
                  className={cn(inputClass, "h-auto py-2")}
                />
              </FieldShell>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldShell id="p-install" label="Installation notes">
                  <textarea
                    id="p-install"
                    rows={3}
                    value={details.installation_notes}
                    onChange={(event) => setDetail("installation_notes", event.target.value)}
                    className={cn(inputClass, "h-auto py-2")}
                  />
                </FieldShell>
                <FieldShell id="p-care" label="Care notes">
                  <textarea
                    id="p-care"
                    rows={3}
                    value={details.care_notes}
                    onChange={(event) => setDetail("care_notes", event.target.value)}
                    className={cn(inputClass, "h-auto py-2")}
                  />
                </FieldShell>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-background p-5">
              <FieldShell id="p-status" label="Status" error={error("status")}>
                <select
                  id="p-status"
                  value={details.status}
                  onChange={(event) => setDetail("status", event.target.value)}
                  className={inputClass}
                >
                  {enums.product_status.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell
                id="p-type"
                label="Product type"
                help={
                  isSimple
                    ? "One SKU, priced on the Pricing tab."
                    : "Options (colour, thickness…) expand into variations."
                }
                error={error("type")}
              >
                <select
                  id="p-type"
                  value={details.type}
                  onChange={(event) => setDetail("type", event.target.value)}
                  className={inputClass}
                >
                  {enums.product_type.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm">
                Featured
                <Switch
                  checked={details.is_featured}
                  onCheckedChange={(checked) => setDetail("is_featured", checked)}
                />
              </label>
              <FieldShell id="p-brand" label="Brand" error={error("brand_id")}>
                <select
                  id="p-brand"
                  value={details.brand_id}
                  onChange={(event) => setDetail("brand_id", event.target.value)}
                  className={inputClass}
                >
                  <option value="">— None —</option>
                  {catalog.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell id="p-collection" label="Collection" error={error("collection_id")}>
                <select
                  id="p-collection"
                  value={details.collection_id}
                  onChange={(event) => setDetail("collection_id", event.target.value)}
                  className={inputClass}
                >
                  <option value="">— None —</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell
                id="p-family"
                label="SKU family"
                help="Prefix for generated variation SKUs."
                error={error("sku_family")}
              >
                <input
                  id="p-family"
                  value={details.sku_family}
                  onChange={(event) => setDetail("sku_family", event.target.value)}
                  className={inputClass}
                />
              </FieldShell>
              <FieldShell
                id="p-slug"
                label="URL slug"
                help="Leave blank to generate from the name."
                error={error("slug")}
              >
                <input
                  id="p-slug"
                  value={details.slug}
                  onChange={(event) => setDetail("slug", event.target.value)}
                  className={inputClass}
                />
              </FieldShell>
              <div className="grid grid-cols-2 gap-3">
                <FieldShell
                  id="p-waste"
                  label="Waste %"
                  help="Blank = category default"
                  error={error("waste_percentage")}
                >
                  <input
                    id="p-waste"
                    inputMode="decimal"
                    value={details.waste_percentage}
                    onChange={(event) => setDetail("waste_percentage", event.target.value)}
                    className={inputClass}
                  />
                </FieldShell>
                <FieldShell id="p-lead" label="Lead time (days)" error={error("lead_time_days")}>
                  <input
                    id="p-lead"
                    inputMode="numeric"
                    value={details.lead_time_days}
                    onChange={(event) => setDetail("lead_time_days", event.target.value)}
                    className={inputClass}
                  />
                </FieldShell>
              </div>
              <FieldShell id="p-warranty" label="Warranty" error={error("warranty")}>
                <input
                  id="p-warranty"
                  value={details.warranty}
                  onChange={(event) => setDetail("warranty", event.target.value)}
                  className={inputClass}
                />
              </FieldShell>
            </div>
          </fieldset>
        </TabsContent>

        <TabsContent value="categories" className="mt-0">
          <fieldset disabled={!editable} className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-5">
              <h2 className="text-sm font-semibold">Categories</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tick every category the product belongs in; the starred one is its main category
                (breadcrumbs, waste default).
              </p>
              {(error("category_ids") || error("primary_category_id")) && (
                <p className="mt-2 text-xs text-destructive">
                  {error("category_ids") ?? error("primary_category_id")}
                </p>
              )}
              <ul className="mt-3 max-h-[28rem] space-y-0.5 overflow-y-auto">
                {catalog.categories.map((category) => {
                  const checked = categoryIds.includes(category.id);
                  const primary =
                    checked &&
                    (primaryId === category.id ||
                      (!categoryIds.includes(primaryId ?? -1) && categoryIds[0] === category.id));
                  return (
                    <li
                      key={category.id}
                      className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
                      style={{ paddingLeft: `${category.depth * 1.25 + 0.25}rem` }}
                    >
                      <input
                        type="checkbox"
                        id={`cat-${category.id}`}
                        checked={checked}
                        onChange={(event) =>
                          setCategoryIds((current) =>
                            event.target.checked
                              ? [...current, category.id]
                              : current.filter((id) => id !== category.id),
                          )
                        }
                      />
                      <label htmlFor={`cat-${category.id}`} className="flex-1">
                        {category.name}
                      </label>
                      {checked && (
                        <button
                          type="button"
                          onClick={() => setPrimaryId(category.id)}
                          aria-pressed={primary}
                          className={cn(
                            "rounded px-1.5 text-[11px]",
                            primary
                              ? "bg-gold/20 font-semibold"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {primary ? "★ Main" : "Make main"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-background p-5">
              <h2 className="text-sm font-semibold">Rooms, styles & uses</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                These drive the room pages and filters.
              </p>
              <div className="mt-3 space-y-4">
                {taxonomyGroups.map(([label, items]) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {items.map((taxonomy) => {
                        const on = taxonomyIds.includes(taxonomy.id);
                        return (
                          <button
                            key={taxonomy.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setTaxonomyIds((current) =>
                                on
                                  ? current.filter((id) => id !== taxonomy.id)
                                  : [...current, taxonomy.id],
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs",
                              on
                                ? "border-foreground bg-charcoal-dark text-primary-foreground"
                                : "border-border hover:border-foreground/40",
                            )}
                          >
                            {taxonomy.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {taxonomyGroups.length === 0 && (
                  <p className="text-sm text-muted-foreground">No rooms or styles set up yet.</p>
                )}
              </div>
            </div>
          </fieldset>
        </TabsContent>

        <TabsContent value="attributes" className="mt-0">
          <AttributesTab
            attributes={attributes}
            onChange={setAttributes}
            catalog={catalog}
            isSimple={isSimple}
            editable={editable}
            errors={errors}
          />
        </TabsContent>

        {isSimple ? (
          <TabsContent value="pricing" className="mt-0">
            <fieldset
              disabled={!editable}
              className="rounded-lg border border-border bg-background p-5"
            >
              <VariantFields
                draft={variant}
                onChange={setVariant}
                enums={enums}
                errors={errors}
                prefix="variant."
              />
            </fieldset>
          </TabsContent>
        ) : (
          <TabsContent value="variations" className="mt-0">
            {product ? (
              <VariationsPanel
                product={product}
                catalog={catalog}
                enums={enums}
                permissions={permissions.variants}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                Create the product first, then set up its options on the Attributes tab and add
                variations here.
              </p>
            )}
          </TabsContent>
        )}

        {product && (
          <>
            <TabsContent value="media" className="mt-0">
              <MediaLibrary product={product} permissions={permissions.media} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <DocumentsPanel
                product={product}
                types={enums.document_type}
                permissions={permissions.documents}
              />
            </TabsContent>
          </>
        )}

        <TabsContent value="seo" className="mt-0">
          <fieldset disabled={!editable} className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4 rounded-lg border border-border bg-background p-5">
              <FieldShell
                id="seo-title"
                label="Page title"
                help={`${seo.title.length}/60 — blank uses the product name.`}
                error={error("seo.title")}
              >
                <input
                  id="seo-title"
                  value={seo.title}
                  onChange={(event) => setSeo({ ...seo, title: event.target.value })}
                  className={inputClass}
                />
              </FieldShell>
              <FieldShell
                id="seo-desc"
                label="Meta description"
                help={`${seo.description.length}/155 — blank uses the short description.`}
                error={error("seo.description")}
              >
                <textarea
                  id="seo-desc"
                  rows={3}
                  value={seo.description}
                  onChange={(event) => setSeo({ ...seo, description: event.target.value })}
                  className={cn(inputClass, "h-auto py-2")}
                />
              </FieldShell>
              <FieldShell
                id="seo-canonical"
                label="Canonical URL"
                help="Only when another URL should rank instead. Imported products point at the old WooCommerce page — clear it once this site replaces it."
                error={error("seo.canonical")}
              >
                <input
                  id="seo-canonical"
                  value={seo.canonical}
                  onChange={(event) => setSeo({ ...seo, canonical: event.target.value })}
                  className={inputClass}
                />
              </FieldShell>
              <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm">
                Hide from search engines
                <Switch
                  checked={seo.noindex}
                  onCheckedChange={(checked) => setSeo({ ...seo, noindex: checked })}
                />
              </label>
            </div>
            <div className="rounded-lg border border-border bg-background p-5">
              <p className="text-xs font-semibold text-muted-foreground">Search preview</p>
              <div className="mt-3 rounded-md border border-border p-4">
                <p className="truncate text-xs text-emerald-800 dark:text-emerald-300">
                  floornigeria.com › products › {details.slug || "…"}
                </p>
                <p className="mt-1 truncate text-lg text-[#1a0dab] dark:text-sky-300">
                  {seo.title || details.name || "Product name"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {seo.description ||
                    details.short_description ||
                    "The short description appears here."}
                </p>
              </div>
            </div>
          </fieldset>
        </TabsContent>
      </Tabs>

      {creating && (
        <p className="mt-6 text-xs text-muted-foreground">
          New products start as drafts. Images and documents can be added once the product is
          created.{" "}
          <Link href="/admin/products" className="underline">
            Back to products
          </Link>
        </p>
      )}
    </div>
  );
}

function AttributesTab({
  attributes,
  onChange,
  catalog,
  isSimple,
  editable,
  errors,
}: {
  attributes: ProductAttributeConfig[];
  onChange: (next: ProductAttributeConfig[]) => void;
  catalog: CatalogLookups;
  isSimple: boolean;
  editable: boolean;
  errors: Record<string, string[]>;
}) {
  const available = catalog.attributes.filter(
    (attribute) => !attributes.some((config) => config.attribute_id === attribute.id),
  );

  function update(index: number, changes: Partial<ProductAttributeConfig>) {
    onChange(
      attributes.map((config, position) =>
        position === index ? { ...config, ...changes } : config,
      ),
    );
  }

  return (
    <fieldset disabled={!editable} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Attributes are global — their terms and swatches are set up once under{" "}
        <Link href="/admin/attributes" className="underline">
          Attributes & swatches
        </Link>
        . Choose which apply here and which terms this product offers.
        {!isSimple &&
          " Ticking “Used for variations” turns an attribute into an option customers pick."}
      </p>

      {attributes.map((config, index) => {
        const attribute = catalog.attributes.find(
          (candidate) => candidate.id === config.attribute_id,
        );
        const termError = errors[`attributes.${index}.term_ids`]?.[0];
        return (
          <div
            key={config.attribute_id}
            className="rounded-lg border border-border bg-background p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{attribute?.name ?? config.name}</p>
                <p className="text-xs text-muted-foreground">
                  {config.term_ids.length} terms offered
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-2">
                  <Switch
                    checked={config.is_visible}
                    onCheckedChange={(checked) => update(index, { is_visible: checked })}
                  />{" "}
                  Show in specifications
                </label>
                {!isSimple && (
                  <label className="inline-flex items-center gap-2">
                    <Switch
                      checked={config.is_variation}
                      onCheckedChange={(checked) => update(index, { is_variation: checked })}
                    />{" "}
                    Used for variations
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => onChange(attributes.filter((_, position) => position !== index))}
                  className="text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
            {termError && <p className="mt-2 text-xs text-destructive">{termError}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {attribute?.terms.map((term) => {
                const on = config.term_ids.includes(term.id);
                return (
                  <button
                    key={term.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      update(index, {
                        term_ids: on
                          ? config.term_ids.filter((id) => id !== term.id)
                          : [...config.term_ids, term.id],
                      })
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                      on
                        ? "border-foreground bg-charcoal-dark text-primary-foreground"
                        : "border-border hover:border-foreground/40",
                    )}
                  >
                    {term.swatch_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={term.swatch_url}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : term.color_hex ? (
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-border"
                        style={{ background: term.color_hex }}
                        aria-hidden
                      />
                    ) : null}
                    {term.label}
                  </button>
                );
              })}
              {attribute && attribute.terms.length === 0 && (
                <p className="text-xs text-muted-foreground">This attribute has no terms yet.</p>
              )}
            </div>
            {attribute && attribute.terms.length > 1 && (
              <div className="mt-2 flex gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    update(index, { term_ids: attribute.terms.map((term) => term.id) })
                  }
                  className="text-muted-foreground hover:text-foreground"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => update(index, { term_ids: [] })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        );
      })}

      {available.length > 0 && editable && (
        <select
          value=""
          aria-label="Add an attribute"
          onChange={(event) => {
            const id = Number(event.target.value);
            const attribute = catalog.attributes.find((candidate) => candidate.id === id);
            if (!attribute) return;
            onChange([
              ...attributes,
              {
                attribute_id: id,
                name: attribute.name,
                swatch_type: attribute.swatch_type,
                is_visible: true,
                is_variation: !isSimple && attribute.is_variation,
                term_ids: [],
              },
            ]);
          }}
          className={cn(inputClass, "w-auto")}
        >
          <option value="">+ Add an attribute…</option>
          {available.map((attribute) => (
            <option key={attribute.id} value={attribute.id}>
              {attribute.name}
            </option>
          ))}
        </select>
      )}
    </fieldset>
  );
}

/** The fields of one variation: identity, price, packaging, size and stock. */
export function VariantFields({
  draft,
  onChange,
  enums,
  errors,
  prefix = "",
}: {
  draft: VariantDraft;
  onChange: (next: VariantDraft) => void;
  enums: CatalogueEnums;
  errors: Record<string, string[]>;
  prefix?: string;
}) {
  const id = (field: string) => `${prefix.replace(".", "")}v-${field}`;
  const error = (field: string) => errors[`${prefix}${field}`]?.[0];
  const input = (
    field: (typeof VARIANT_FIELDS)[number],
    label: string,
    help?: string,
    numeric = true,
  ) => (
    <FieldShell
      id={id(field)}
      label={label}
      help={help}
      error={error(field)}
      required={field === "sku"}
    >
      <input
        id={id(field)}
        inputMode={numeric ? "decimal" : undefined}
        value={draft[field]}
        onChange={(event) => onChange({ ...draft, [field]: event.target.value })}
        aria-invalid={error(field) ? true : undefined}
        className={inputClass}
      />
    </FieldShell>
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Price
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {input("sku", "SKU", undefined, false)}
          {input("price", "Price (₦)")}
          {input("sale_price", "Sale price (₦)", "Leave blank when not on sale")}
          <FieldShell id={id("selling_unit")} label="Sold" error={error("selling_unit")}>
            <select
              id={id("selling_unit")}
              value={draft.selling_unit}
              onChange={(event) => onChange({ ...draft, selling_unit: event.target.value })}
              className={inputClass}
            >
              {enums.selling_unit.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pack & size
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {input("coverage_per_pack_sqm", "Coverage per pack (m²)", "Drives the floor calculator")}
          {input("pieces_per_pack", "Pieces per pack")}
          {input("minimum_order_quantity", "Minimum order")}
          {input("length_mm", "Length (mm)", "Plank size sets the room designer's scale")}
          {input("width_mm", "Width (mm)")}
          {input("thickness_mm", "Thickness (mm)")}
          {input("wear_layer_mm", "Wear layer (mm)")}
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Stock
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FieldShell id={id("stock_status")} label="Availability" error={error("stock_status")}>
            <select
              id={id("stock_status")}
              value={draft.stock_status}
              onChange={(event) => onChange({ ...draft, stock_status: event.target.value })}
              className={inputClass}
            >
              {enums.stock_status.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
          {input("stock_quantity", "Quantity in stock")}
          {input("lead_time_days", "Lead time (days)")}
          <label className="flex items-center justify-between gap-3 self-end rounded-md border border-border px-3 py-2.5 text-sm">
            On sale to customers
            <Switch
              checked={draft.is_active}
              onCheckedChange={(checked) => onChange({ ...draft, is_active: checked })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
