export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading quote">
      <div className="h-[32rem] animate-pulse border border-border bg-muted/30" aria-hidden />
    </div>
  );
}
