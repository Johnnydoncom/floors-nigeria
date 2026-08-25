"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ATTRIBUTE_PREFIX } from "@/lib/catalog-filters";
import { naira } from "@/lib/format";
import type { FilterOptions, TaxonomyType } from "@/lib/api/types";
import { useFilterNavigation } from "./useFilterNavigation";
import { cn } from "@/lib/utils";

const TAXONOMY_LABELS: Record<TaxonomyType, string> = {
  room: "Shop by room",
  style: "Style",
  look: "Look",
  use_case: "Suitable for",
};

/**
 * The catalogue filter rail (§7).
 *
 * Every control writes to the URL, so filter state is shareable and the server
 * re-renders the results; this component holds no result state of its own.
 */
export function FilterRail({
  options,
  activeCount,
  className,
}: {
  options: FilterOptions;
  activeCount: number;
  className?: string;
}) {
  const { toggle, set, clearAll, isActive, searchParams, isPending } = useFilterNavigation();

  const priceBands = buildPriceBands(options.price.min, options.price.max);
  const activeMinPrice = searchParams.get("min_price");
  const activeMaxPrice = searchParams.get("max_price");

  return (
    <div className={cn("space-y-4", isPending && "opacity-60 transition-opacity", className)}>
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </h2>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-auto p-0 text-xs">
            Clear all
          </Button>
        )}
      </div>

      <Accordion
        type="multiple"
        defaultValue={["categories", "price", "room"]}
        className="border-t border-border"
      >
        <FilterGroup value="categories" label="Category">
          {options.categories.map((category) => (
            <div key={category.slug} className="space-y-2">
              <FilterCheckbox
                id={`categories-${category.slug}`}
                label={category.name}
                checked={isActive("categories", category.slug)}
                onToggle={() => toggle("categories", category.slug)}
              />
              {category.children.length > 0 && (
                <div className="ml-5 space-y-2">
                  {category.children.map((child) => (
                    <FilterCheckbox
                      key={child.slug}
                      id={`categories-${child.slug}`}
                      label={child.name}
                      checked={isActive("categories", child.slug)}
                      onToggle={() => toggle("categories", child.slug)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </FilterGroup>

        <FilterGroup value="price" label="Price per m²">
          <div className="space-y-2">
            {priceBands.map((band) => {
              const checked =
                activeMinPrice === String(band.min ?? "") &&
                activeMaxPrice === String(band.max ?? "");

              return (
                <FilterCheckbox
                  key={band.label}
                  id={`price-${band.label}`}
                  label={band.label}
                  checked={checked}
                  onToggle={() => {
                    set("min_price", checked || band.min === null ? null : String(band.min));
                    set("max_price", checked || band.max === null ? null : String(band.max));
                  }}
                />
              );
            })}
          </div>
        </FilterGroup>

        {(
          Object.entries(options.taxonomies) as [TaxonomyType, { slug: string; name: string }[]][]
        ).map(
          ([type, entries]) =>
            entries.length > 0 && (
              <FilterGroup key={type} value={type} label={TAXONOMY_LABELS[type] ?? type}>
                {entries.map((entry) => (
                  <FilterCheckbox
                    key={entry.slug}
                    id={`taxonomies-${entry.slug}`}
                    label={entry.name}
                    checked={isActive("taxonomies", entry.slug)}
                    onToggle={() => toggle("taxonomies", entry.slug)}
                  />
                ))}
              </FilterGroup>
            ),
        )}

        {options.colors.length > 0 && (
          <FilterGroup value="colors" label="Colour family">
            {options.colors.map((color) => (
              <FilterCheckbox
                key={color}
                id={`colors-${color}`}
                label={color}
                checked={isActive("colors", color)}
                onToggle={() => toggle("colors", color)}
              />
            ))}
          </FilterGroup>
        )}

        {options.attributes.map((attribute) => (
          <FilterGroup key={attribute.slug} value={attribute.slug} label={attribute.name}>
            {attribute.values.map((value) => (
              <FilterCheckbox
                key={value.slug}
                id={`${attribute.slug}-${value.slug}`}
                label={value.label}
                colorHex={value.color_hex}
                checked={isActive(`${ATTRIBUTE_PREFIX}${attribute.slug}`, value.slug)}
                onToggle={() => toggle(`${ATTRIBUTE_PREFIX}${attribute.slug}`, value.slug)}
              />
            ))}
          </FilterGroup>
        ))}

        <FilterGroup value="availability" label="Availability">
          {options.availability.map((status) => (
            <FilterCheckbox
              key={status.value}
              id={`availability-${status.value}`}
              label={status.label}
              checked={isActive("availability", status.value)}
              onToggle={() => toggle("availability", status.value)}
            />
          ))}
        </FilterGroup>
      </Accordion>
    </div>
  );
}

function FilterGroup({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-sm font-semibold uppercase tracking-[0.06em]">
        {label}
      </AccordionTrigger>
      <AccordionContent className="space-y-2 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

function FilterCheckbox({
  id,
  label,
  checked,
  onToggle,
  colorHex,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  colorHex?: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
      <Label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-normal">
        {colorHex && (
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border border-border"
            style={{ backgroundColor: colorHex }}
            aria-hidden
          />
        )}
        {label}
      </Label>
    </div>
  );
}

/**
 * Price bands derived from the live catalogue range, so the rail never offers
 * a band that matches nothing.
 */
function buildPriceBands(
  min: number,
  max: number,
): { label: string; min: number | null; max: number | null }[] {
  if (max <= 0 || max <= min) return [];

  const step = Math.ceil((max - min) / 4 / 1000) * 1000;
  if (step <= 0) return [];

  return Array.from({ length: 4 }, (_, index) => {
    const from = Math.floor(min / 1000) * 1000 + index * step;
    const to = index === 3 ? null : from + step;

    return {
      label: to === null ? `${naira(from)} and above` : `${naira(from)} – ${naira(to)}`,
      min: from,
      max: to,
    };
  });
}
