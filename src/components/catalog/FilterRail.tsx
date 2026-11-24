"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ATTRIBUTE_PREFIX } from "@/lib/catalog-filters";
import { naira } from "@/lib/format";
import type { AttributeTerm, FilterOptions, TaxonomyType } from "@/lib/api/types";
import { Swatch } from "./Swatch";
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
  hiddenGroups = [],
  className,
}: {
  options: FilterOptions;
  activeCount: number;
  /** Group keys to omit — a category page fixes its own category. */
  hiddenGroups?: string[];
  className?: string;
}) {
  const isHidden = (group: string) => hiddenGroups.includes(group);

  const { toggle, setMany, clearAll, isActive, searchParams, isPending } = useFilterNavigation();

  const priceBands = buildPriceBands(options.price.min, options.price.max);
  const activeMinPrice = searchParams.get("min_price");
  const activeMaxPrice = searchParams.get("max_price");
  const chips = activeChips(options, searchParams, hiddenGroups);
  const inStockOnly = isActive("availability", "in_stock");

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

      {/* What is applied, each one a tap from gone. */}
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Applied filters">
          {chips.map((chip) => (
            <li key={`${chip.key}:${chip.value}`}>
              <button
                type="button"
                onClick={() =>
                  chip.key === "price"
                    ? setMany({ min_price: null, max_price: null })
                    : toggle(chip.key, chip.value)
                }
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-xs transition hover:border-foreground/40"
                aria-label={`Remove filter: ${chip.label}`}
              >
                {chip.label}
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {options.availability.some((status) => status.value === "in_stock") && (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
          <span>
            <span className="block font-semibold">In stock only</span>
            <span className="block text-[11px] text-muted-foreground">Ready to deliver now</span>
          </span>
          <Switch
            checked={inStockOnly}
            onCheckedChange={() => toggle("availability", "in_stock")}
            aria-label="In stock only"
          />
        </label>
      )}

      <Accordion
        type="multiple"
        defaultValue={["categories", "price", "room", "brands"]}
        className="border-t border-border"
      >
        {!isHidden("categories") && (
          <FilterGroup value="categories" label="Category">
            <ShowMore limit={7}>
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
            </ShowMore>
          </FilterGroup>
        )}

        {!isHidden("brands") && options.brands.length > 1 && (
          <FilterGroup value="brands" label="Brand">
            <ShowMore limit={6}>
              {options.brands.map((brand) => (
                <FilterCheckbox
                  key={brand.slug}
                  id={`brands-${brand.slug}`}
                  label={brand.name}
                  count={countOf(brand)}
                  checked={isActive("brands", brand.slug)}
                  onToggle={() => toggle("brands", brand.slug)}
                />
              ))}
            </ShowMore>
          </FilterGroup>
        )}

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
                  onToggle={() =>
                    setMany({
                      min_price: checked || band.min === null ? null : String(band.min),
                      max_price: checked || band.max === null ? null : String(band.max),
                    })
                  }
                />
              );
            })}
          </div>
        </FilterGroup>

        {(
          Object.entries(options.taxonomies) as [TaxonomyType, { slug: string; name: string }[]][]
        ).map(
          ([type, entries]) =>
            entries.length > 0 &&
            !isHidden(type) && (
              <FilterGroup key={type} value={type} label={TAXONOMY_LABELS[type] ?? type}>
                <ShowMore limit={6}>
                  {entries.map((entry) => (
                    <FilterCheckbox
                      key={entry.slug}
                      id={`taxonomies-${entry.slug}`}
                      label={entry.name}
                      count={countOf(entry)}
                      checked={isActive("taxonomies", entry.slug)}
                      onToggle={() => toggle("taxonomies", entry.slug)}
                    />
                  ))}
                </ShowMore>
              </FilterGroup>
            ),
        )}

        {options.attributes.map((attribute) => (
          <FilterGroup key={attribute.slug} value={attribute.slug} label={attribute.name}>
            {attribute.swatch_type === "color" || attribute.swatch_type === "image" ? (
              // Visual attributes read as a swatch grid, the way a sample board does.
              <div className="flex flex-wrap gap-2 pt-1">
                {attribute.values.map((term) => (
                  <SwatchFilterButton
                    key={term.slug}
                    term={term}
                    checked={isActive(`${ATTRIBUTE_PREFIX}${attribute.slug}`, term.slug)}
                    onToggle={() => toggle(`${ATTRIBUTE_PREFIX}${attribute.slug}`, term.slug)}
                  />
                ))}
              </div>
            ) : (
              <ShowMore limit={6}>
                {attribute.values.map((term) => (
                  <FilterCheckbox
                    key={term.slug}
                    id={`${attribute.slug}-${term.slug}`}
                    label={term.label}
                    count={countOf(term)}
                    checked={isActive(`${ATTRIBUTE_PREFIX}${attribute.slug}`, term.slug)}
                    onToggle={() => toggle(`${ATTRIBUTE_PREFIX}${attribute.slug}`, term.slug)}
                  />
                ))}
              </ShowMore>
            )}
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
  count,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  /** How many products the option holds, when the API says. */
  count?: number | null;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
      <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">
        {label}
      </Label>
      {typeof count === "number" && (
        <span className="font-mono text-[11px] text-muted-foreground">{count}</span>
      )}
    </div>
  );
}

/**
 * The first few options, and the rest a tap away: a long brand or colour list
 * pushes every other group off the screen.
 */
function ShowMore({ limit, children }: { limit: number; children: React.ReactNode[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const items = children.flat();
  if (items.length <= limit + 1) return <>{items}</>;

  return (
    <>
      {isOpen ? items : items.slice(0, limit)}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="pt-1 text-xs font-semibold text-foreground underline underline-offset-2 hover:underline"
        aria-expanded={isOpen}
      >
        {isOpen ? "Show fewer" : `Show ${items.length - limit} more`}
      </button>
    </>
  );
}

/**
 * Option counts, read when the API provides them (`count` or `products_count`
 * on an option) — the rail works without them and shows them when it can.
 */
function countOf(option: object): number | null {
  const { count, products_count } = option as { count?: unknown; products_count?: unknown };
  const value = typeof count === "number" ? count : products_count;
  return typeof value === "number" ? value : null;
}

type Chip = { key: string; value: string; label: string };

/** Every filter in the URL, labelled the way the rail labels it. */
function activeChips(
  options: FilterOptions,
  params: URLSearchParams,
  hiddenGroups: string[],
): Chip[] {
  const chips: Chip[] = [];
  const values = (key: string) =>
    (params.get(key) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

  const categories = new Map<string, string>();
  for (const category of options.categories) {
    categories.set(category.slug, category.name);
    for (const child of category.children) categories.set(child.slug, child.name);
  }
  const taxonomies = new Map(
    Object.values(options.taxonomies).flatMap((entries) =>
      (entries ?? []).map((entry) => [entry.slug, entry.name] as const),
    ),
  );
  const brands = new Map(options.brands.map((brand) => [brand.slug, brand.name]));
  const availability = new Map(options.availability.map((status) => [status.value, status.label]));

  const add = (key: string, lookup: Map<string, string>) => {
    if (hiddenGroups.includes(key)) return;
    for (const value of values(key)) chips.push({ key, value, label: lookup.get(value) ?? value });
  };

  add("categories", categories);
  add("brands", brands);
  add("taxonomies", taxonomies);
  add("availability", availability);

  for (const attribute of options.attributes) {
    const key = `${ATTRIBUTE_PREFIX}${attribute.slug}`;
    const terms = new Map(attribute.values.map((term) => [term.slug, term.label]));
    for (const value of values(key)) {
      chips.push({ key, value, label: `${attribute.name}: ${terms.get(value) ?? value}` });
    }
  }

  const min = params.get("min_price");
  const max = params.get("max_price");
  if (min || max) {
    chips.push({
      key: "price",
      value: `${min}-${max}`,
      label: max
        ? `${naira(Number(min ?? 0))} – ${naira(Number(max))}`
        : `${naira(Number(min))} and above`,
    });
  }

  return chips;
}

/**
 * A colour or material term rendered as a toggleable swatch.
 */
function SwatchFilterButton({
  term,
  checked,
  onToggle,
}: {
  term: AttributeTerm;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={term.label}
      title={term.label}
      onClick={onToggle}
      className={cn(
        "transition focus-visible:outline-none",
        checked
          ? "ring-2 ring-gold ring-offset-2 ring-offset-background"
          : "hover:ring-1 hover:ring-gold focus-visible:ring-2 focus-visible:ring-gold",
      )}
    >
      <Swatch term={term} size="sm" />
    </button>
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
