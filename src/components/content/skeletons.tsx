/**
 * Loading placeholders for CMS routes, shaped like the pages they precede.
 */

export function JournalSkeleton() {
  return (
    <div
      className="container-fluid pb-24 pt-header md:pt-[calc(var(--header-height)+2rem)]"
      aria-hidden
    >
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-5 h-14 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}>
            <div className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
            <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div
      className="container-fluid pb-24 pt-header md:pt-[calc(var(--header-height)+2rem)]"
      aria-hidden
    >
      <div className="mx-auto max-w-3xl">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-5 h-12 w-full animate-pulse rounded bg-muted" />
        <div className="mt-3 h-12 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-10 aspect-[21/9] animate-pulse rounded-xl bg-muted" />
      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-4 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
