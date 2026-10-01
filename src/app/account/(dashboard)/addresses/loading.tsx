export default function Loading() {
  return (
    <div className="grid gap-5 sm:grid-cols-2" aria-busy="true" aria-label="Loading addresses">
      {Array.from({ length: 2 }, (_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse border border-border bg-muted/40"
          aria-hidden
        />
      ))}
    </div>
  );
}
