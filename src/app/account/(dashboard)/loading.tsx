import { ListSkeleton } from "@/components/account/display";

export default function Loading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading your account">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[98px] animate-pulse border border-border bg-muted/40" />
        ))}
      </div>
      <div className="h-56 animate-pulse border border-border bg-muted/30" aria-hidden />
      <ListSkeleton rows={3} />
    </div>
  );
}
