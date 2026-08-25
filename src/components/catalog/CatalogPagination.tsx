import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Server-rendered pagination: real links, so results stay crawlable (§18).
 */
export function CatalogPagination({
  currentPage,
  lastPage,
  buildHref,
}: {
  currentPage: number;
  lastPage: number;
  buildHref: (page: number) => string;
}) {
  if (lastPage <= 1) return null;

  const pages = pageWindow(currentPage, lastPage);

  return (
    <nav aria-label="Catalogue pages" className="flex items-center justify-center gap-1 pt-12">
      <PageLink href={buildHref(currentPage - 1)} disabled={currentPage <= 1} label="Previous page">
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </PageLink>

      {pages.map((page, index) =>
        page === null ? (
          <span key={`gap-${index}`} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <PageLink
            key={page}
            href={buildHref(page)}
            current={page === currentPage}
            label={`Page ${page}`}
          >
            {page}
          </PageLink>
        ),
      )}

      <PageLink
        href={buildHref(currentPage + 1)}
        disabled={currentPage >= lastPage}
        label="Next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  label,
  current = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  label: string;
  current?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    "grid h-10 min-w-10 place-items-center border px-3 text-sm transition",
    current
      ? "border-charcoal-dark bg-charcoal-dark text-primary-foreground"
      : "border-border hover:border-gold hover:text-gold",
    disabled && "pointer-events-none opacity-40",
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled aria-label={label}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

/**
 * First, last, and a window around the current page.
 */
function pageWindow(current: number, last: number): (number | null)[] {
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);

  return sorted.flatMap((page, index) => {
    const previous = sorted[index - 1];
    return previous !== undefined && page - previous > 1 ? [null, page] : [page];
  });
}
