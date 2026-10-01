export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading settings">
      {[28, 16, 18].map((height) => (
        <div
          key={height}
          className="animate-pulse border border-border bg-muted/30"
          style={{ height: `${height}rem` }}
          aria-hidden
        />
      ))}
    </div>
  );
}
