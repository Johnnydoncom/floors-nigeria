"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toggleParamValue, isParamValueActive } from "@/lib/catalog-filters";

/**
 * Shared URL-state plumbing for every catalogue filter control.
 *
 * Navigation runs in a transition so the current results stay interactive
 * (and visibly pending) while the server renders the filtered page.
 */
export function useFilterNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const push = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  const toggle = useCallback(
    (key: string, value: string) => push(toggleParamValue(searchParams, key, value)),
    [push, searchParams],
  );

  const set = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams);
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      if (key !== "page") params.delete("page");
      push(params);
    },
    [push, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams();
    const query = searchParams.get("q");
    if (query) params.set("q", query);
    push(params);
  }, [push, searchParams]);

  const isActive = useCallback(
    (key: string, value: string) => isParamValueActive(searchParams, key, value),
    [searchParams],
  );

  return { searchParams, toggle, set, clearAll, isActive, isPending };
}
