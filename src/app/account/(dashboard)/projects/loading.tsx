import { ListSkeleton } from "@/components/account/display";

export default function Loading() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading your projects">
      <div className="h-64 animate-pulse border border-border bg-muted/30" aria-hidden />
      <ListSkeleton rows={2} />
    </div>
  );
}
