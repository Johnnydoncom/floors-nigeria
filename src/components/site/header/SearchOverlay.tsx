"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { useProductSearch } from "@/hooks/use-product-search";
import { SearchSuggestions } from "./SearchSuggestions";

/**
 * Full-width search sheet for small screens, where the header has no room for
 * a permanent field. Mounted only while open, so the query resets on close.
 */
export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [term, setTerm] = useState("");
  const { results, isSearching } = useProductSearch(term);
  const router = useRouter();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!term.trim()) return;

    router.push(`/products?q=${encodeURIComponent(term.trim())}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background"
      role="dialog"
      aria-modal
      aria-label="Search"
    >
      <form
        onSubmit={submit}
        role="search"
        className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <label htmlFor="mobile-search" className="sr-only">
          Search the flooring catalogue
        </label>
        <input
          id="mobile-search"
          autoFocus
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search products or a SKU…"
          autoComplete="off"
          className="h-full flex-1 bg-transparent text-base outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-5 w-5" aria-hidden />
          <span className="sr-only">Close search</span>
        </button>
      </form>

      <div className="flex-1 overflow-y-auto">
        <SearchSuggestions
          term={term}
          results={results}
          isSearching={isSearching}
          onSelect={onClose}
          onTermChange={setTerm}
        />
      </div>
    </div>
  );
}
