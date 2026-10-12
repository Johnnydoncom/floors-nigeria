export default function Loading() {
  return (
    <div className="container-fluid grid gap-10 pb-16 pt-header lg:grid-cols-12" aria-hidden>
      <div className="lg:col-span-7">
        <div className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />
        <div className="mt-3 flex gap-2.5 overflow-hidden p-1">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-16 w-16 shrink-0 animate-pulse rounded-md bg-muted sm:h-20 sm:w-20"
            />
          ))}
        </div>
      </div>
      <div className="space-y-4 lg:col-span-5">
        <div className="h-3 w-32 animate-pulse bg-muted" />
        <div className="h-10 w-3/4 animate-pulse bg-muted" />
        <div className="h-4 w-full animate-pulse bg-muted" />
        <div className="h-12 w-40 animate-pulse bg-muted" />
        <div className="h-12 w-full animate-pulse bg-muted" />
      </div>
    </div>
  );
}
