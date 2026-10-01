import { ListSkeleton } from "@/components/account/display";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading your quotes">
      <div className="mb-6 h-8 w-40 animate-pulse bg-muted" aria-hidden />
      <ListSkeleton rows={4} />
    </div>
  );
}
