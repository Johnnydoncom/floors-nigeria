"use client";

import { useMemo, useState } from "react";
import { MousePointerClick, Phone, Search, X } from "lucide-react";
import { BranchCard } from "./BranchCard";
import { NetworkMap } from "./NetworkMap";
import {
  BRANCHES,
  COUNTRIES,
  HEAD_OFFICE,
  HUBS,
  REGIONS,
  formatPhone,
  type Branch,
  type HubId,
  type RegionId,
} from "@/lib/branches";
import { cn } from "@/lib/utils";

const POSITION = new Map(BRANCHES.map((branch, index) => [branch.slug, index + 1]));

const ALL_COUNTS = BRANCHES.reduce<Partial<Record<HubId, number>>>((counts, branch) => {
  counts[branch.hub] = (counts[branch.hub] ?? 0) + 1;
  return counts;
}, {});

function matches(branch: Branch, query: string): boolean {
  if (!query) return true;
  const haystack = [
    branch.name,
    branch.area,
    branch.city,
    branch.state,
    COUNTRIES[branch.country],
    branch.landmark ?? "",
    ...branch.address,
  ]
    .join(" ")
    .toLowerCase();

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * Directory and network map, side by side on desktop. Filtering by region or
 * search dims the cities left out; hovering a card lights its city, and
 * clicking a city jumps to its branches.
 */
export function BranchLocator() {
  const [region, setRegion] = useState<RegionId | "all">("all");
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<HubId | null>(null);
  const [selected, setSelected] = useState<HubId | null>(null);

  const results = useMemo(
    () =>
      BRANCHES.filter(
        (branch) => (region === "all" || branch.region === region) && matches(branch, query.trim()),
      ),
    [region, query],
  );

  const groups = REGIONS.map((meta) => ({
    ...meta,
    branches: results.filter((branch) => branch.region === meta.id),
  })).filter((group) => group.branches.length > 0);

  const visibleHubs = new Set(results.map((branch) => branch.hub));
  const dimmed = HUBS.filter((hub) => !visibleHubs.has(hub.id)).map((hub) => hub.id);
  const active = [hovered, selected].filter((hub): hub is HubId => hub !== null);

  function chooseRegion(next: RegionId | "all") {
    setRegion(next);
    setSelected(null);
  }

  function selectHub(hub: HubId) {
    const meta = HUBS.find((item) => item.id === hub)!;
    setRegion(meta.region);
    setQuery("");
    setSelected(hub);

    const first = BRANCHES.find((branch) => branch.hub === hub);
    // Wait a frame so the filtered list has rendered before scrolling to it.
    requestAnimationFrame(() =>
      document
        .getElementById(`branch-${first?.slug}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  const chips: { id: RegionId | "all"; label: string; count: number }[] = [
    { id: "all", label: "All locations", count: BRANCHES.length },
    ...REGIONS.map((meta) => ({
      id: meta.id,
      label: meta.name,
      count: BRANCHES.filter((branch) => branch.region === meta.id).length,
    })),
  ];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
      {/* Toolbar */}
      <div className="z-20 min-w-0 -mx-5 border-y border-border bg-background/95 px-5 py-4 md:-mx-8 md:px-8 lg:sticky lg:top-header lg:col-span-12 lg:mx-0 lg:rounded-b-xl lg:border lg:border-t-0 lg:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <label className="relative block xl:w-80 xl:shrink-0">
            <span className="sr-only">Search branches</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
              }}
              placeholder="Search a city, area or street"
              className="h-11 w-full rounded-md border border-input bg-background pr-10 pl-10 text-sm outline-none transition focus:border-gold"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </label>

          <div
            role="group"
            aria-label="Filter by region"
            className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 md:-mx-8 md:px-8 lg:-mx-5 lg:px-5 xl:mx-0 xl:flex-wrap xl:px-0"
          >
            {chips.map((chip) => {
              const on = region === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => chooseRegion(chip.id)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 font-display text-[12px] font-semibold transition",
                    on
                      ? "border-charcoal bg-charcoal text-primary-foreground"
                      : "border-border text-foreground/75 hover:border-foreground/40 hover:text-foreground",
                  )}
                >
                  {chip.label}
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      on ? "text-gold-light" : "text-muted-foreground",
                    )}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map — first on phones, sticky beside the list on desktop. */}
      <div className="min-w-0 lg:order-2 lg:col-span-5 xl:col-span-6">
        <div className="lg:sticky lg:top-[calc(var(--header-height)+10rem)] xl:top-[calc(var(--header-height)+7rem)]">
          <div className="relative overflow-hidden rounded-2xl bg-charcoal-dark p-3 text-primary-foreground sm:p-5">
            <div className="flex items-center justify-between gap-4 px-1 pb-2">
              <p className="eyebrow text-gold-light">The network</p>
              <p className="hidden items-center gap-1.5 text-[11px] text-primary-foreground/50 sm:inline-flex">
                <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
                Select a city
              </p>
            </div>
            <NetworkMap
              counts={ALL_COUNTS}
              active={active}
              dimmed={dimmed}
              onHubEnter={setHovered}
              onHubLeave={() => setHovered(null)}
              onHubSelect={selectHub}
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 px-1 pt-3 text-[11px] text-primary-foreground/60">
              <span className="inline-flex items-center gap-2">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-gold font-display text-[8px] font-bold text-charcoal-dark">
                  8
                </span>
                Locations in a city
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-px w-5 bg-gold" aria-hidden />
                Supplied from Lagos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Directory */}
      <div className="min-w-0 lg:order-1 lg:col-span-7 xl:col-span-6" aria-live="polite">
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-display text-lg">No branch matches “{query}”.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              We deliver and install nationwide — the head office will point you to the nearest
              team.
            </p>
            <a href={`tel:${HEAD_OFFICE.phones[0]}`} className="btn btn-primary mt-6">
              <Phone className="h-4 w-4" aria-hidden />
              {formatPhone(HEAD_OFFICE.phones[0])}
            </a>
          </div>
        ) : (
          <div className="space-y-14">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`region-${group.id}`}>
                <header className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <h2
                      id={`region-${group.id}`}
                      className="font-display text-2xl tracking-tight md:text-3xl"
                    >
                      {group.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{group.summary}</p>
                  </div>
                  <span className="shrink-0 font-mono text-sm text-muted-foreground">
                    {String(group.branches.length).padStart(2, "0")}
                  </span>
                </header>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {group.branches.map((branch) => (
                    <BranchCard
                      key={branch.slug}
                      branch={branch}
                      index={POSITION.get(branch.slug) ?? 0}
                      highlighted={branch.hub === selected}
                      onEnter={() => setHovered(branch.hub)}
                      onLeave={() => setHovered(null)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
