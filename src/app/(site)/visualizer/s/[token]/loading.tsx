/**
 * Route placeholder for a shared visualisation.
 *
 * Its presence also gives the route its Suspense boundary, which is what lets
 * Next.js prerender a shell for a share token it cannot know in advance.
 */
export default function Loading() {
  return (
    <div
      className="container-fluid grid gap-10 py-10 pt-header lg:grid-cols-[minmax(0,1fr)_320px]"
      aria-hidden
    >
      <div>
        <div className="h-3 w-40 animate-pulse bg-muted" />
        <div className="mt-3 h-9 w-2/3 animate-pulse bg-muted" />
        <div className="mt-6 aspect-[4/3] animate-pulse bg-muted" />
      </div>

      <div className="space-y-4">
        <div className="h-48 animate-pulse border border-border bg-muted/40" />
        <div className="h-40 animate-pulse border border-border bg-muted/40" />
      </div>
    </div>
  );
}
