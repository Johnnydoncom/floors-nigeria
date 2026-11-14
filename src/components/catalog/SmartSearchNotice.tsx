"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { SMART_SEARCH_STORAGE_KEY, type SmartSearchResult } from "@/hooks/use-smart-search";

/**
 * "We read your search as …" above results reached through smart search, so
 * the shopper can see how their words became filters — and what was relaxed
 * when nothing matched exactly. Shown only on the page the search led to.
 */
export function SmartSearchNotice() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<SmartSearchResult | null>(null);

  useEffect(() => {
    let stored: SmartSearchResult | null = null;
    try {
      stored = JSON.parse(sessionStorage.getItem(SMART_SEARCH_STORAGE_KEY) ?? "null");
    } catch {
      stored = null;
    }

    const query = searchParams.toString();
    const current = query ? `${pathname}?${query}` : pathname;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser storage, which only exists after mount
    setResult(stored && stored.href === current ? stored : null);
  }, [pathname, searchParams]);

  if (!result) return null;

  const dismiss = () => {
    setResult(null);
    try {
      sessionStorage.removeItem(SMART_SEARCH_STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
  };

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-gold/40 bg-gold/5 px-4 py-3 text-sm">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>
          <span className="text-muted-foreground">You searched “{result.query}”. Showing </span>
          <strong>{result.summary || "matching floors"}</strong>
          <span className="text-muted-foreground">.</span>
        </p>
        {result.notice && <p className="mt-0.5 text-xs text-muted-foreground">{result.notice}</p>}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
