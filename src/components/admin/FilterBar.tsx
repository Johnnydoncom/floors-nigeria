"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { inputClass } from "./forms";
import { cn } from "@/lib/utils";
import type { Option } from "@/lib/admin/types";

export type FilterSpec =
  | { type: "select"; name: string; label: string; options: Option[]; allLabel?: string }
  | { type: "date"; name: string; label: string };

/**
 * Search and filters for an admin list. Everything lives in the URL, so a
 * filtered view can be bookmarked or shared, and the server renders it.
 */
export function FilterBar({
  placeholder = "Search…",
  filters = [],
  search = true,
}: {
  placeholder?: string;
  filters?: FilterSpec[];
  search?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const queryString = next.toString();
    startTransition(() =>
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false }),
    );
  }

  useEffect(() => {
    if ((params.get("q") ?? "") === query) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: query.trim() || null }), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const active = filters.some((filter) => params.get(filter.name)) || params.get("q");

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {search && (
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className={cn(inputClass, "pl-9")}
          />
        </div>
      )}
      {filters.map((filter) =>
        filter.type === "select" ? (
          <select
            key={filter.name}
            aria-label={filter.label}
            value={params.get(filter.name) ?? ""}
            onChange={(event) => apply({ [filter.name]: event.target.value || null })}
            className={cn(inputClass, "w-auto min-w-36")}
          >
            <option value="">{filter.allLabel ?? `All ${filter.label.toLowerCase()}`}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <label
            key={filter.name}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground"
          >
            {filter.label}
            <input
              type="date"
              value={params.get(filter.name) ?? ""}
              onChange={(event) => apply({ [filter.name]: event.target.value || null })}
              className={cn(inputClass, "w-auto")}
            />
          </label>
        ),
      )}
      {active && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            apply(
              Object.fromEntries([["q", null], ...filters.map((filter) => [filter.name, null])]),
            );
          }}
          className="inline-flex h-10 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden /> Clear
        </button>
      )}
      {pending && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" />
      )}
    </div>
  );
}
