export default function Loading() {
  return (
    <div className="container-fluid grid gap-10 pb-16 pt-header lg:grid-cols-12" aria-hidden>
      <div className="lg:col-span-7">
        <div className="aspect-[4/3] animate-pulse bg-muted" />
        <div className="mt-4 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="aspect-square animate-pulse bg-muted" />
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
