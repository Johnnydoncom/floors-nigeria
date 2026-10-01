export default function Loading() {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading saved items"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="aspect-[4/3.6] animate-pulse border border-border bg-muted/40"
          aria-hidden
        />
      ))}
    </div>
  );
}
