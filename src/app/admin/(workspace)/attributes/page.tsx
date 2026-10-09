import type { Metadata } from "next";
import { Pencil, Plus, SwatchBook } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { ConfirmAction } from "@/components/admin/actions";
import { ImageButton } from "@/components/admin/catalogue/ImageButton";
import { FormDialog, type FieldSpec } from "@/components/admin/forms";
import { EmptyState, NoAccess, PageHeader, Panel } from "@/components/admin/ui";
import type { AttributeRow, Lookups } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Attributes & swatches" };

function attributeFields(lookups: Lookups): FieldSpec[] {
  return [
    {
      name: "name",
      label: "Name",
      type: "text",
      required: true,
      placeholder: "Colour, Thickness, Finish…",
    },
    {
      name: "swatch_type",
      label: "Shown as",
      type: "select",
      options: lookups.enums.swatch_type,
      required: true,
      help: "Colour chips, image swatches, buttons or plain labels.",
    },
    {
      name: "type",
      label: "Value type",
      type: "select",
      options: lookups.enums.attribute_type,
      required: true,
    },
    { name: "unit", label: "Unit", type: "text", placeholder: "mm, m², …" },
    {
      name: "group",
      label: "Specification group",
      type: "text",
      placeholder: "Dimensions, Performance…",
    },
    { name: "sort_order", label: "Order", type: "number", min: 0 },
    {
      name: "is_variation",
      label: "Can drive variations",
      type: "switch",
      help: "Offered as an option customers pick.",
    },
    { name: "is_filterable", label: "Filter on the shop", type: "switch" },
    { name: "is_visible", label: "Show in specifications", type: "switch" },
    { name: "is_comparable", label: "Use in comparisons", type: "switch" },
  ];
}

const TERM_FIELDS: FieldSpec[] = [
  { name: "value", label: "Value", type: "text", required: true, placeholder: "Smoked Oak" },
  { name: "label", label: "Display label", type: "text", help: "Blank uses the value." },
  {
    name: "color_hex",
    label: "Colour",
    type: "color",
    help: "Shown as the swatch when there is no image.",
  },
  { name: "sort_order", label: "Order", type: "number", min: 0 },
  { name: "description", label: "Description", type: "text", wide: true },
];

/**
 * Global attributes and their terms. A term owns its swatch — set it up once
 * and every product offering it shows the same chip or image.
 */
export default async function AttributesPage() {
  const session = await requireSession();
  if (!can(session, "attributes.view")) return <NoAccess what="attributes" />;

  const [{ data: attributes }, lookups] = await Promise.all([
    adminGet<{ data: AttributeRow[] }>("attributes"),
    getLookups(),
  ]);
  const canUpdate = can(session, "attributes.update");

  return (
    <>
      <PageHeader
        title="Attributes & swatches"
        description="Colours, finishes, thicknesses and other specifications. Terms carry the swatch every product reuses."
        actions={
          can(session, "attributes.create") && (
            <FormDialog
              wide
              title="New attribute"
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New attribute
                </button>
              }
              fields={attributeFields(lookups)}
              initial={{
                swatch_type: "label",
                type: "select",
                is_visible: true,
                is_comparable: true,
                is_filterable: true,
              }}
              endpoint="attributes"
              successMessage="Attribute added."
            />
          )
        }
      />

      {attributes.length === 0 && <EmptyState icon={SwatchBook} title="No attributes yet" />}

      <div className="space-y-5">
        {attributes.map((attribute) => (
          <Panel
            key={attribute.id}
            title={attribute.name}
            description={`${attribute.swatch_type_label} · used by ${attribute.product_count} product${attribute.product_count === 1 ? "" : "s"}${attribute.is_variation ? " · drives variations" : ""}${attribute.is_filterable ? " · filterable" : ""}`}
            actions={
              <>
                {canUpdate && (
                  <FormDialog
                    title={`Add a term to ${attribute.name}`}
                    trigger={
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        + Add term
                      </button>
                    }
                    fields={TERM_FIELDS}
                    endpoint={`attributes/${attribute.id}/terms`}
                    initial={{ sort_order: attribute.terms.length }}
                    successMessage="Term added."
                  />
                )}
                {canUpdate && (
                  <FormDialog
                    wide
                    title={`Edit ${attribute.name}`}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Edit ${attribute.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    }
                    fields={attributeFields(lookups)}
                    initial={attribute}
                    endpoint={`attributes/${attribute.id}`}
                    method="PATCH"
                  />
                )}
                {can(session, "attributes.delete") && attribute.product_count === 0 && (
                  <ConfirmAction
                    endpoint={`attributes/${attribute.id}`}
                    variant="ghost"
                    title={`Delete ${attribute.name}?`}
                    description="Its terms and swatches go with it."
                    success="Attribute deleted."
                  >
                    Delete
                  </ConfirmAction>
                )}
              </>
            }
          >
            {attribute.terms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No terms yet.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {attribute.terms.map((term) => (
                  <li
                    key={term.id}
                    className="flex items-center gap-3 rounded-md border border-border p-2"
                  >
                    <ImageButton
                      type="term"
                      id={term.id}
                      url={term.swatch_url}
                      label={term.display_label}
                      editable={canUpdate}
                      size="sm"
                      swatch={term.color_hex}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{term.display_label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[term.color_hex, term.description].filter(Boolean).join(" · ") ||
                          term.slug}
                      </p>
                    </div>
                    {canUpdate && (
                      <FormDialog
                        title={`Edit ${term.display_label}`}
                        trigger={
                          <button
                            type="button"
                            aria-label={`Edit ${term.display_label}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
                          >
                            <Pencil className="h-3 w-3" aria-hidden />
                          </button>
                        }
                        fields={TERM_FIELDS}
                        initial={term}
                        endpoint={`attributes/${attribute.id}/terms/${term.id}`}
                        method="PATCH"
                      />
                    )}
                    {canUpdate && (
                      <ConfirmAction
                        endpoint={`attributes/${attribute.id}/terms/${term.id}`}
                        variant="ghost"
                        className="h-7 px-1.5"
                        title={`Delete ${term.display_label}?`}
                        description="Products stop offering it. A term that defines a variation cannot be deleted."
                        success="Term deleted."
                      >
                        ✕
                      </ConfirmAction>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}
