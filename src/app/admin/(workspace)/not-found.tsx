import Link from "next/link";
import { SearchX } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border bg-background p-8 text-center">
      <SearchX className="mx-auto h-6 w-6 text-gold" aria-hidden />
      <h1 className="mt-3 font-display text-xl">Record not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have been deleted, or it isn&apos;t one you&apos;re assigned to.
      </p>
      <Link href="/admin" className="btn btn-primary mt-6 h-10 rounded-md">
        Back to the dashboard
      </Link>
    </div>
  );
}
