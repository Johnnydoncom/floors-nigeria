"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { bytes } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import { FieldShell, inputClass } from "../forms";
import type { MediaItem, Option, ProductDetail } from "@/lib/admin/types";

/** The image roles from §24, in the order the product page uses them. */
const COLLECTIONS: { value: string; label: string; help: string }[] = [
  { value: "hero", label: "Main photo", help: "One per product — the card and page hero." },
  { value: "gallery", label: "Gallery", help: "Further views on the product page." },
  { value: "texture", label: "Close-up texture", help: "Detail of the surface." },
  { value: "lifestyle", label: "Room / lifestyle", help: "The floor in a real room." },
  { value: "edge_profile", label: "Edge & profile", help: "Click system, bevel, thickness." },
  { value: "installation", label: "Installation", help: "Fitting and subfloor." },
  { value: "swatch", label: "Swatch", help: "A variation's chip in the option picker." },
];

/**
 * A product's image library: upload into a role, on the product or one of
 * its variations, then order, caption or remove.
 */
export function MediaLibrary({
  product,
  permissions,
}: {
  product: ProductDetail;
  permissions: { create: boolean; update: boolean; delete: boolean };
}) {
  const [collection, setCollection] = useState("gallery");
  const [variantId, setVariantId] = useState("");
  const [alt, setAlt] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { run, pending } = useAdminMutation();

  const owners = [
    { id: null as number | null, label: product.name },
    ...product.variants.map((variant) => ({
      id: variant.id as number | null,
      label: `${variant.name} (${variant.sku})`,
    })),
  ];

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("collection", collection);
      if (variantId) form.append("variant_id", variantId);
      if (alt.trim()) form.append("alt", alt.trim());
      await run(() => adminRequest("POST", `products/${product.id}/media`, form), {
        success: `${file.name} uploaded.`,
      });
    }
    setAlt("");
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-6">
      {permissions.create && (
        <div className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
          <FieldShell
            id="media-collection"
            label="Role"
            help={COLLECTIONS.find((option) => option.value === collection)?.help}
          >
            <select
              id="media-collection"
              value={collection}
              onChange={(event) => setCollection(event.target.value)}
              className={inputClass}
            >
              {COLLECTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell
            id="media-owner"
            label="For"
            help={
              collection === "swatch"
                ? "Swatches belong to a variation."
                : "The product, or one variation's own photo."
            }
          >
            <select
              id="media-owner"
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              className={inputClass}
            >
              {owners.map((owner) => (
                <option key={owner.id ?? "product"} value={owner.id ?? ""}>
                  {owner.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell
            id="media-alt"
            label="Alt text"
            help="Describe the photo for screen readers and search."
          >
            <input
              id="media-alt"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              className={inputClass}
            />
          </FieldShell>
          <div>
            <input
              ref={input}
              id="media-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="sr-only"
              onChange={(event) => upload(event.target.files)}
            />
            <label
              htmlFor="media-file"
              className="btn btn-primary h-10 cursor-pointer rounded-md px-4 text-xs"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}{" "}
              Upload
            </label>
          </div>
        </div>
      )}

      {COLLECTIONS.map((role) => {
        const items = product.media.filter((media) => media.collection === role.value);
        if (items.length === 0) return null;

        return (
          <section key={role.value}>
            <h3 className="mb-2 text-sm font-semibold">
              {role.label}{" "}
              <span className="font-normal text-muted-foreground">· {items.length}</span>
            </h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {items.map((media, index) => (
                <MediaTile
                  key={media.id}
                  productId={product.id}
                  media={media}
                  owner={
                    media.variant_id
                      ? product.variants.find((variant) => variant.id === media.variant_id)?.name
                      : undefined
                  }
                  siblings={items.filter((item) => item.variant_id === media.variant_id)}
                  index={items
                    .filter((item) => item.variant_id === media.variant_id)
                    .indexOf(media)}
                  permissions={permissions}
                  first={index === 0}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {product.media.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
          No images yet.
        </p>
      )}
    </div>
  );
}

function MediaTile({
  productId,
  media,
  owner,
  siblings,
  index,
  permissions,
}: {
  productId: number;
  media: MediaItem;
  owner?: string;
  siblings: MediaItem[];
  index: number;
  permissions: { update: boolean; delete: boolean };
  first: boolean;
}) {
  const [alt, setAlt] = useState(media.alt ?? "");
  const { run, pending } = useAdminMutation();

  function move(offset: number) {
    const order = siblings.map((item) => item.id);
    const [moved] = order.splice(index, 1);
    order.splice(index + offset, 0, moved);
    void run(() => adminRequest("POST", `products/${productId}/media/reorder`, { ids: order }), {
      success: "Order saved.",
    });
  }

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-background">
      <a href={media.url} target="_blank" rel="noopener" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.thumb_url}
          alt={media.alt ?? ""}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
      </a>
      <div className="space-y-1.5 p-2">
        {owner && <p className="truncate text-[11px] font-semibold">{owner}</p>}
        <p className="truncate text-[11px] text-muted-foreground">
          {media.file_name} · {bytes(media.size_bytes)}
        </p>
        {permissions.update && (
          <input
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            onBlur={() =>
              alt !== (media.alt ?? "") &&
              run(
                () =>
                  adminRequest("PATCH", `products/${productId}/media/${media.id}`, {
                    alt: alt || null,
                  }),
                { success: "Alt text saved." },
              )
            }
            placeholder="Alt text"
            aria-label="Alt text"
            className={cn(inputClass, "h-8 text-xs")}
          />
        )}
        <div className="flex items-center justify-between">
          {permissions.update && siblings.length > 1 ? (
            <div className="flex gap-1">
              <button
                type="button"
                disabled={pending || index === 0}
                onClick={() => move(-1)}
                aria-label="Move earlier"
                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={pending || index === siblings.length - 1}
                onClick={() => move(1)}
                aria-label="Move later"
                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
              >
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <span />
          )}
          {permissions.delete && (
            <button
              type="button"
              disabled={pending}
              aria-label="Remove image"
              onClick={() =>
                window.confirm("Remove this image?") &&
                run(() => adminRequest("DELETE", `products/${productId}/media/${media.id}`), {
                  success: "Image removed.",
                })
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Datasheets, installation guides, warranties and certificates (§24). */
export function DocumentsPanel({
  product,
  types,
  permissions,
}: {
  product: ProductDetail;
  types: Option[];
  permissions: { create: boolean; delete: boolean };
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(types[0]?.value ?? "datasheet");
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const { run, pending, errors } = useAdminMutation();

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("title", title || file.name.replace(/\.[^.]+$/, ""));
    form.append("type", type);
    form.append("is_public", isPublic ? "1" : "0");
    const result = await run(() => adminRequest("POST", `products/${product.id}/documents`, form), {
      success: "Document uploaded.",
    });
    if (result) {
      setTitle("");
      setFile(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {product.documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
          No documents yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-background">
          {product.documents.map((document) => (
            <DocumentRow
              key={document.id}
              productId={product.id}
              document={document}
              canDelete={permissions.delete}
            />
          ))}
        </ul>
      )}

      {permissions.create && (
        <form
          onSubmit={upload}
          className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto_auto] lg:items-end"
        >
          <FieldShell id="doc-title" label="Title" error={errors.title?.[0]}>
            <input
              id="doc-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Technical datasheet"
              className={inputClass}
            />
          </FieldShell>
          <FieldShell id="doc-type" label="Kind">
            <select
              id="doc-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={inputClass}
            >
              {types.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell
            id="doc-file"
            label="File (PDF, Word, Excel, image · 20MB)"
            error={errors.file?.[0]}
          >
            <input
              ref={input}
              id="doc-file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1.5"
            />
          </FieldShell>
          <label className="inline-flex h-10 items-center gap-2 text-xs">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} /> Public
          </label>
          <button
            type="submit"
            disabled={pending || !file}
            className="btn btn-primary h-10 rounded-md px-4 text-xs"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Upload
          </button>
        </form>
      )}
    </div>
  );
}

function DocumentRow({
  productId,
  document,
  canDelete,
}: {
  productId: number;
  document: ProductDetail["documents"][number];
  canDelete: boolean;
}) {
  const { run, pending } = useAdminMutation();

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          {document.url ? (
            <a
              href={document.url}
              target="_blank"
              rel="noopener"
              className="truncate font-medium hover:underline"
            >
              {document.title}
            </a>
          ) : (
            <span className="truncate font-medium">{document.title}</span>
          )}
          <p className="text-xs text-muted-foreground">
            {document.type_label} · {bytes(document.size_bytes)} ·{" "}
            {document.is_public ? "Public download" : "Staff only"}
          </p>
        </div>
      </div>
      {canDelete && (
        <button
          type="button"
          disabled={pending}
          aria-label={`Remove ${document.title}`}
          onClick={() =>
            window.confirm(`Remove ${document.title}?`) &&
            run(() => adminRequest("DELETE", `products/${productId}/documents/${document.id}`), {
              success: "Document removed.",
            })
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden />
          )}
        </button>
      )}
    </li>
  );
}
